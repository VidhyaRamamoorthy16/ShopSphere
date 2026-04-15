import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import redis
import ipaddress
from pydantic import BaseModel

from admin_auth import auth_manager, get_current_admin, log_admin_action
from middleware.intelligent_rate_limiter import rate_limiter, RateLimitTier
from middleware.ml_detector_complete import threat_detector
from middleware.intelligent_logger import intelligent_logger

logger = logging.getLogger("AdminRoutes")

# Redis client
redis_client = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'), decode_responses=True)

# Create router
router = APIRouter()

# WebSocket connection manager for live traffic
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.traffic_subscribers: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket, connection_type: str = "general"):
        await websocket.accept()
        self.active_connections.append(websocket)
        if connection_type == "traffic":
            self.traffic_subscribers.append(websocket)
    
    def disconnect(self, websocket: WebSocket, connection_type: str = "general"):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.traffic_subscribers:
            self.traffic_subscribers.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast_to_traffic(self, message: Dict[str, Any]):
        if self.traffic_subscribers:
            disconnected = []
            for connection in self.traffic_subscribers:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, "traffic")

manager = ConnectionManager()

# Pydantic models
class RateLimitUpdate(BaseModel):
    tier: str
    limit: int
    window_seconds: int

class IPBanRequest(BaseModel):
    ip: str
    duration_hours: int
    reason: str

class WhitelistRequest(BaseModel):
    ip: str
    reason: Optional[str] = None

class MLThresholdUpdate(BaseModel):
    allow: float = 0.3
    flag: float = 0.6
    alert: float = 0.8
    block: float = 0.9

class MiddlewareToggle(BaseModel):
    module: str
    enabled: bool

class MLFeedbackRequest(BaseModel):
    request_id: str
    was_false_positive: bool
    feedback_notes: Optional[str] = None

# Rate Limiter Controls
@router.get("/rate-limits")
async def get_rate_limits(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """Get current rate limit configuration"""
    try:
        # Get current configurations from rate limiter
        configs = {}
        for tier in RateLimitTier:
            tier_config = rate_limiter.tier_configs.get(tier)
            if tier_config:
                configs[tier.value] = {
                    "requests_per_window": tier_config.requests_per_window,
                    "window_seconds": tier_config.window_seconds,
                    "burst_capacity": tier_config.burst_capacity,
                    "refill_rate": tier_config.refill_rate
                }
        
        await log_admin_action(
            current_admin["sub"], "view_rate_limits",
            ip="127.0.0.1"  # Admin is local
        )
        
        return {"configs": configs}
        
    except Exception as e:
        logger.error(f"Error getting rate limits: {e}")
        raise HTTPException(status_code=500, detail="Failed to get rate limits")

@router.put("/rate-limits")
async def update_rate_limits(
    update: RateLimitUpdate,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Update rate limit configuration"""
    try:
        # Validate tier
        try:
            tier = RateLimitTier(update.tier)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid rate limit tier")
        
        # Get current config
        current_config = rate_limiter.tier_configs.get(tier)
        if not current_config:
            raise HTTPException(status_code=404, detail="Rate limit tier not found")
        
        # Store old values for logging
        old_values = {
            "requests_per_window": current_config.requests_per_window,
            "window_seconds": current_config.window_seconds
        }
        
        # Update configuration
        current_config.requests_per_window = update.limit
        current_config.window_seconds = update.window_seconds
        
        # Store in Redis for persistence
        config_key = f"admin:rate_limit_config:{tier.value}"
        config_data = {
            "requests_per_window": update.limit,
            "window_seconds": update.window_seconds,
            "updated_by": current_admin["sub"],
            "updated_at": datetime.now().isoformat()
        }
        
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, config_key, 86400 * 30, json.dumps(config_data)
        )
        
        await log_admin_action(
            current_admin["sub"], "update_rate_limits",
            target=tier.value,
            old_value=old_values,
            new_value={"requests_per_window": update.limit, "window_seconds": update.window_seconds},
            ip="127.0.0.1"
        )
        
        return {"message": "Rate limits updated successfully", "config": config_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rate limits: {e}")
        raise HTTPException(status_code=500, detail="Failed to update rate limits")

@router.post("/rate-limits/reset/{ip}")
async def reset_rate_limit_ip(
    ip: str,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Reset rate limit counter for specific IP"""
    try:
        # Validate IP address
        ipaddress.ip_address(ip)
        
        # Reset all rate limit data for this IP
        await rate_limiter.reset_identifier(ip)
        
        await log_admin_action(
            current_admin["sub"], "reset_rate_limit_ip",
            target=ip,
            ip="127.0.0.1"
        )
        
        return {"message": f"Rate limit counter reset for IP {ip}"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address")
    except Exception as e:
        logger.error(f"Error resetting rate limit for IP {ip}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset rate limit")

@router.get("/rate-limits/stats")
async def get_rate_limit_stats(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """Get rate limit statistics"""
    try:
        # Get rate limiter metrics
        metrics = rate_limiter.get_metrics()
        
        # Get top IPs hitting limits
        stats = {
            "metrics": metrics,
            "top_ips": []
        }
        
        # Get recent rate limit hits from Redis
        recent_hits_key = "admin:rate_limit_hits:recent"
        hits_data = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.lrange, recent_hits_key, 0, 19
        )
        
        for hit_data in hits_data:
            hit = json.loads(hit_data)
            stats["top_ips"].append({
                "ip": hit["ip"],
                "tier": hit["tier"],
                "blocked_count": hit["blocked_count"],
                "last_blocked": hit["timestamp"]
            })
        
        await log_admin_action(
            current_admin["sub"], "view_rate_limit_stats",
            ip="127.0.0.1"
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting rate limit stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get rate limit statistics")

# IP Blocklist Controls
@router.get("/blocklist")
async def get_blocklist(
    limit: int = Query(100, le=1000),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Get current IP blocklist"""
    try:
        blocklist = []
        
        # Get banned IPs from Redis
        banned_pattern = "banned_ips:*"
        banned_keys = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.keys, banned_pattern
        )
        
        for key in banned_keys[:limit]:
            ip = key.replace("banned_ips:", "")
            ban_data = await asyncio.get_event_loop().run_in_executor(
                None, redis_client.get, key
            )
            
            if ban_data:
                ban_info = json.loads(ban_data)
                blocklist.append({
                    "ip": ip,
                    "banned_at": ban_info["banned_at"],
                    "duration": ban_info["duration"],
                    "reason": ban_info.get("reason", "Unknown"),
                    "expires_at": datetime.fromisoformat(ban_info["banned_at"]).timestamp() + ban_info["duration"]
                })
        
        # Get whitelisted IPs
        whitelist = []
        whitelist_pattern = "whitelisted_ips:*"
        whitelist_keys = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.keys, whitelist_pattern
        )
        
        for key in whitelist_keys:
            ip = key.replace("whitelisted_ips:", "")
            whitelist_data = await asyncio.get_event_loop().run_in_executor(
                None, redis_client.get, key
            )
            
            if whitelist_data:
                whitelist_info = json.loads(whitelist_data)
                whitelist.append({
                    "ip": ip,
                    "added_at": whitelist_info["added_at"],
                    "reason": whitelist_info.get("reason", "Admin whitelisted")
                })
        
        await log_admin_action(
            current_admin["sub"], "view_blocklist",
            ip="127.0.0.1"
        )
        
        return {
            "banned_ips": blocklist,
            "whitelisted_ips": whitelist,
            "total_banned": len(blocklist),
            "total_whitelisted": len(whitelist)
        }
        
    except Exception as e:
        logger.error(f"Error getting blocklist: {e}")
        raise HTTPException(status_code=500, detail="Failed to get blocklist")

@router.post("/blocklist/ban")
async def ban_ip(
    ban_request: IPBanRequest,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Manually ban an IP"""
    try:
        # Validate IP address
        ipaddress.ip_address(ban_request.ip)
        
        # Check if IP is already banned
        existing_ban = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, f"banned_ips:{ban_request.ip}"
        )
        
        if existing_ban:
            raise HTTPException(status_code=409, detail="IP is already banned")
        
        # Create ban entry
        ban_data = {
            "ip": ban_request.ip,
            "banned_at": datetime.now().isoformat(),
            "duration": ban_request.duration_hours * 3600,
            "reason": ban_request.reason,
            "banned_by": current_admin["sub"]
        }
        
        # Store in Redis
        ban_key = f"banned_ips:{ban_request.ip}"
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, ban_key, 
            ban_request.duration_hours * 3600, json.dumps(ban_data)
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "ban_ip",
            target=ban_request.ip,
            new_value={"duration_hours": ban_request.duration_hours, "reason": ban_request.reason},
            ip="127.0.0.1"
        )
        
        return {"message": f"IP {ban_request.ip} banned successfully"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error banning IP {ban_request.ip}: {e}")
        raise HTTPException(status_code=500, detail="Failed to ban IP")

@router.delete("/blocklist/ban/{ip}")
async def unban_ip(
    ip: str,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Manually unban an IP"""
    try:
        # Validate IP address
        ipaddress.ip_address(ip)
        
        # Check if IP is banned
        existing_ban = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, f"banned_ips:{ip}"
        )
        
        if not existing_ban:
            raise HTTPException(status_code=404, detail="IP is not banned")
        
        # Remove ban
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.delete, f"banned_ips:{ip}"
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "unban_ip",
            target=ip,
            ip="127.0.0.1"
        )
        
        return {"message": f"IP {ip} unbanned successfully"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unbanning IP {ip}: {e}")
        raise HTTPException(status_code=500, detail="Failed to unban IP")

@router.post("/blocklist/whitelist")
async def add_to_whitelist(
    whitelist_request: WhitelistRequest,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Add IP or CIDR range to whitelist"""
    try:
        # Validate IP/CIDR
        ipaddress.ip_network(whitelist_request.ip, strict=False)
        
        # Check if already whitelisted
        existing = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, f"whitelisted_ips:{whitelist_request.ip}"
        )
        
        if existing:
            raise HTTPException(status_code=409, detail="IP is already whitelisted")
        
        # Create whitelist entry
        whitelist_data = {
            "ip": whitelist_request.ip,
            "added_at": datetime.now().isoformat(),
            "reason": whitelist_request.reason or "Admin whitelisted",
            "added_by": current_admin["sub"]
        }
        
        # Store in Redis (permanent until manually removed)
        whitelist_key = f"whitelisted_ips:{whitelist_request.ip}"
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.set, whitelist_key, json.dumps(whitelist_data)
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "whitelist_ip",
            target=whitelist_request.ip,
            new_value={"reason": whitelist_request.reason},
            ip="127.0.0.1"
        )
        
        return {"message": f"IP {whitelist_request.ip} added to whitelist"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address or CIDR range")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding IP to whitelist: {e}")
        raise HTTPException(status_code=500, detail="Failed to add IP to whitelist")

@router.delete("/blocklist/whitelist/{ip}")
async def remove_from_whitelist(
    ip: str,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Remove IP from whitelist"""
    try:
        # Validate IP/CIDR
        ipaddress.ip_network(ip, strict=False)
        
        # Check if whitelisted
        existing = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, f"whitelisted_ips:{ip}"
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="IP is not whitelisted")
        
        # Remove from whitelist
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.delete, f"whitelisted_ips:{ip}"
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "remove_whitelist_ip",
            target=ip,
            ip="127.0.0.1"
        )
        
        return {"message": f"IP {ip} removed from whitelist"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IP address or CIDR range")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing IP from whitelist: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove IP from whitelist")

# ML Threat Detector Controls
@router.get("/ml/status")
async def get_ml_status(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """Get ML model status"""
    try:
        stats = threat_detector.get_statistics()
        
        status = {
            "model_loaded": threat_detector.anomaly_detector is not None,
            "model_version": stats.get("model_version", "unknown"),
            "last_training_time": stats.get("last_training_time"),
            "total_predictions": stats.get("total_requests", 0),
            "threats_detected": stats.get("threats_detected", 0),
            "false_positives": stats.get("false_positives", 0),
            "detection_rate": (
                stats.get("threats_detected", 0) / max(stats.get("total_requests", 1), 1)
            ),
            "new_patterns_count": stats.get("new_patterns_count", 0),
            "tracked_ips": stats.get("tracked_ips", 0)
        }
        
        await log_admin_action(
            current_admin["sub"], "view_ml_status",
            ip="127.0.0.1"
        )
        
        return status
        
    except Exception as e:
        logger.error(f"Error getting ML status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get ML status")

@router.post("/ml/retrain")
async def trigger_ml_retrain(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """Trigger ML model retraining"""
    try:
        # Generate job ID
        job_id = f"retrain_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create job entry
        job_data = {
            "job_id": job_id,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "created_by": current_admin["sub"],
            "progress": 0,
            "message": "Retraining job queued"
        }
        
        # Store job in Redis
        job_key = f"admin:ml_jobs:{job_id}"
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)  # 1 hour TTL
        )
        
        # Add to jobs queue
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.lpush, "admin:ml_jobs_queue", job_id
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "trigger_ml_retrain",
            target=job_id,
            ip="127.0.0.1"
        )
        
        # Start background task (in production, this would be a separate worker)
        asyncio.create_task(run_ml_retraining_job(job_id))
        
        return {"job_id": job_id, "status": "pending", "message": "Retraining job started"}
        
    except Exception as e:
        logger.error(f"Error triggering ML retraining: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger retraining")

@router.get("/ml/retrain/{job_id}")
async def get_retrain_status(
    job_id: str,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Get retraining job status"""
    try:
        job_key = f"admin:ml_jobs:{job_id}"
        job_data = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, job_key
        )
        
        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = json.loads(job_data)
        
        await log_admin_action(
            current_admin["sub"], "view_retrain_status",
            target=job_id,
            ip="127.0.0.1"
        )
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting retrain status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get retrain status")

@router.put("/ml/thresholds")
async def update_ml_thresholds(
    thresholds: MLThresholdUpdate,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Update ML threat score thresholds"""
    try:
        # Validate thresholds
        if not (0 <= thresholds.allow <= thresholds.flag <= thresholds.alert <= thresholds.block <= 1):
            raise HTTPException(status_code=400, detail="Invalid threshold values")
        
        # Get current thresholds
        current_key = "admin:ml_thresholds"
        current_data = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, current_key
        )
        
        old_values = {}
        if current_data:
            old_values = json.loads(current_data)
        
        # Update thresholds
        new_thresholds = {
            "allow": thresholds.allow,
            "flag": thresholds.flag,
            "alert": thresholds.alert,
            "block": thresholds.block,
            "updated_by": current_admin["sub"],
            "updated_at": datetime.now().isoformat()
        }
        
        # Store in Redis
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.set, current_key, json.dumps(new_thresholds)
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "update_ml_thresholds",
            old_value=old_values,
            new_value=new_thresholds,
            ip="127.0.0.1"
        )
        
        return {"message": "ML thresholds updated successfully", "thresholds": new_thresholds}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ML thresholds: {e}")
        raise HTTPException(status_code=500, detail="Failed to update ML thresholds")

@router.get("/ml/predictions/recent")
async def get_recent_predictions(
    limit: int = Query(100, le=1000),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Get recent ML predictions"""
    try:
        # Get recent predictions from logger
        recent_logs = await intelligent_logger.get_recent_logs(limit=limit)
        
        # Filter for ML-related logs
        predictions = []
        for log in recent_logs:
            if log.get("threat_score", 0) > 0:
                predictions.append({
                    "request_id": log.get("request_id"),
                    "timestamp": log.get("timestamp"),
                    "ip": log.get("ip"),
                    "method": log.get("method"),
                    "path": log.get("path"),
                    "threat_score": log.get("threat_score"),
                    "threat_type": log.get("threat_type"),
                    "action_taken": log.get("action_taken"),
                    "user_agent": log.get("user_agent", "")[:100]  # Truncate for display
                })
        
        await log_admin_action(
            current_admin["sub"], "view_recent_predictions",
            ip="127.0.0.1"
        )
        
        return {"predictions": predictions, "total": len(predictions)}
        
    except Exception as e:
        logger.error(f"Error getting recent predictions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recent predictions")

@router.post("/ml/feedback")
async def submit_ml_feedback(
    feedback: MLFeedbackRequest,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Submit false positive/negative feedback"""
    try:
        # Create feedback entry
        feedback_data = {
            "request_id": feedback.request_id,
            "was_false_positive": feedback.was_false_positive,
            "feedback_notes": feedback.feedback_notes,
            "submitted_by": current_admin["sub"],
            "submitted_at": datetime.now().isoformat()
        }
        
        # Store in Redis for retraining queue
        feedback_key = f"admin:ml_feedback:{feedback.request_id}"
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, feedback_key, 86400 * 7, json.dumps(feedback_data)  # 7 days
        )
        
        # Add to feedback queue
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.lpush, "admin:ml_feedback_queue", json.dumps(feedback_data)
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "submit_ml_feedback",
            target=feedback.request_id,
            new_value={"false_positive": feedback.was_false_positive},
            ip="127.0.0.1"
        )
        
        return {"message": "Feedback submitted successfully", "feedback_id": feedback.request_id}
        
    except Exception as e:
        logger.error(f"Error submitting ML feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")

# Live Traffic Controls
@router.websocket("/traffic/live")
async def websocket_traffic_live(websocket: WebSocket):
    """WebSocket for live traffic feed"""
    await manager.connect(websocket, "traffic")
    try:
        while True:
            # Keep connection alive and send any queued traffic data
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket, "traffic")

@router.get("/traffic/stats")
async def get_traffic_stats(
    timeframe: str = Query("1h", regex="^(1h|24h|7d)$"),
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Get traffic statistics"""
    try:
        # Calculate time range
        now = datetime.now()
        if timeframe == "1h":
            start_time = now - timedelta(hours=1)
        elif timeframe == "24h":
            start_time = now - timedelta(days=1)
        else:  # 7d
            start_time = now - timedelta(days=7)
        
        # Get statistics from logger
        logger_metrics = intelligent_logger.get_metrics()
        
        # Get recent logs for analysis
        recent_logs = await intelligent_logger.get_recent_logs(limit=1000)
        
        # Analyze logs
        stats = {
            "timeframe": timeframe,
            "total_requests": len(recent_logs),
            "blocked_requests": len([log for log in recent_logs if log.get("action_taken") == "blocked"]),
            "allowed_requests": len([log for log in recent_logs if log.get("action_taken") == "allowed"]),
            "threat_score_avg": sum(log.get("threat_score", 0) for log in recent_logs) / max(len(recent_logs), 1),
            "top_ips": {},
            "top_paths": {},
            "attack_types": {},
            "requests_per_second": logger_metrics.get("logs_processed", 0) / max(1, (now - start_time).total_seconds())
        }
        
        # Analyze top IPs
        ip_counts = {}
        for log in recent_logs:
            ip = log.get("ip", "unknown")
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        stats["top_ips"] = dict(sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        
        # Analyze top paths
        path_counts = {}
        for log in recent_logs:
            path = log.get("path", "/")
            path_counts[path] = path_counts.get(path, 0) + 1
        
        stats["top_paths"] = dict(sorted(path_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        
        # Analyze attack types
        attack_counts = {}
        for log in recent_logs:
            attack_type = log.get("threat_type", "unknown")
            if attack_type != "unknown":
                attack_counts[attack_type] = attack_counts.get(attack_type, 0) + 1
        
        stats["attack_types"] = attack_counts
        
        await log_admin_action(
            current_admin["sub"], "view_traffic_stats",
            target=timeframe,
            ip="127.0.0.1"
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting traffic stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get traffic statistics")

@router.get("/traffic/logs")
async def get_traffic_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    filter_type: Optional[str] = Query(None, regex="^(all|blocked|allowed|threat)$"),
    ip_filter: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Get paginated traffic logs"""
    try:
        # Get logs from logger
        all_logs = await intelligent_logger.get_recent_logs(limit=1000)
        
        # Apply filters
        if filter_type == "blocked":
            all_logs = [log for log in all_logs if log.get("action_taken") == "blocked"]
        elif filter_type == "allowed":
            all_logs = [log for log in all_logs if log.get("action_taken") == "allowed"]
        elif filter_type == "threat":
            all_logs = [log for log in all_logs if log.get("threat_score", 0) > 0.3]
        
        if ip_filter:
            all_logs = [log for log in all_logs if log.get("ip") == ip_filter]
        
        # Paginate
        total = len(all_logs)
        start = (page - 1) * limit
        end = start + limit
        paginated_logs = all_logs[start:end]
        
        await log_admin_action(
            current_admin["sub"], "view_traffic_logs",
            target=f"page_{page}",
            ip="127.0.0.1"
        )
        
        return {
            "logs": paginated_logs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting traffic logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to get traffic logs")

# Middleware Toggle Controls
@router.get("/middleware/status")
async def get_middleware_status(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """Get middleware module status"""
    try:
        # Get status from Redis
        status_key = "admin:middleware_status"
        status_data = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, status_key
        )
        
        if status_data:
            status = json.loads(status_data)
        else:
            # Default status
            status = {
                "rate_limiter": True,
                "ml_detector": True,
                "intelligent_logger": True,
                "ip_reputation": True,
                "fingerprinting": True,
                "jwt_validation": True
            }
        
        await log_admin_action(
            current_admin["sub"], "view_middleware_status",
            ip="127.0.0.1"
        )
        
        return {"modules": status}
        
    except Exception as e:
        logger.error(f"Error getting middleware status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get middleware status")

@router.put("/middleware/toggle")
async def toggle_middleware(
    toggle: MiddlewareToggle,
    current_admin: Dict[str, Any] = Depends(get_current_admin)
):
    """Toggle middleware module on/off"""
    try:
        valid_modules = [
            "rate_limiter", "ml_detector", "intelligent_logger",
            "ip_reputation", "fingerprinting", "jwt_validation"
        ]
        
        if toggle.module not in valid_modules:
            raise HTTPException(status_code=400, detail="Invalid module name")
        
        # Get current status
        status_key = "admin:middleware_status"
        status_data = await asyncio.get_event_loop().run_in_executor(
            None, redis_client.get, status_key
        )
        
        if status_data:
            status = json.loads(status_data)
        else:
            status = {module: True for module in valid_modules}
        
        # Update status
        old_value = status.get(toggle.module)
        status[toggle.module] = toggle.enabled
        
        # Store updated status
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.set, status_key, json.dumps(status)
        )
        
        # Log the action
        await log_admin_action(
            current_admin["sub"], "toggle_middleware",
            target=toggle.module,
            old_value=old_value,
            new_value=toggle.enabled,
            ip="127.0.0.1"
        )
        
        action = "enabled" if toggle.enabled else "disabled"
        return {"message": f"Module {toggle.module} {action}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling middleware: {e}")
        raise HTTPException(status_code=500, detail="Failed to toggle middleware")

# System Health
@router.get("/system/health")
async def get_system_health(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """Get full system health"""
    try:
        import psutil
        import time
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Redis health
        try:
            redis_client.ping()
            redis_status = "healthy"
        except:
            redis_status = "unhealthy"
        
        # Component status
        components = {
            "redis": redis_status,
            "rate_limiter": "loaded" if rate_limiter else "not_loaded",
            "ml_detector": "loaded" if threat_detector else "not_loaded",
            "intelligent_logger": "loaded" if intelligent_logger else "not_loaded"
        }
        
        # Get component metrics
        rate_limiter_metrics = rate_limiter.get_metrics() if rate_limiter else {}
        logger_metrics = intelligent_logger.get_metrics() if intelligent_logger else {}
        ml_metrics = threat_detector.get_statistics() if threat_detector else {}
        
        health = {
            "status": "healthy" if redis_status == "healthy" else "degraded",
            "timestamp": datetime.now().isoformat(),
            "uptime": time.time() - psutil.boot_time(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3)
            },
            "components": components,
            "metrics": {
                "rate_limiter": rate_limiter_metrics,
                "logger": logger_metrics,
                "ml_detector": ml_metrics
            }
        }
        
        await log_admin_action(
            current_admin["sub"], "view_system_health",
            ip="127.0.0.1"
        )
        
        return health
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system health")

# Background task for ML retraining
async def run_ml_retraining_job(job_id: str):
    """Run ML retraining job in background"""
    try:
        job_key = f"admin:ml_jobs:{job_id}"
        
        # Update job status to running
        job_data = {
            "job_id": job_id,
            "status": "running",
            "progress": 10,
            "message": "Collecting training data..."
        }
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)
        )
        
        # Simulate retraining process (in production, this would call the actual training)
        await asyncio.sleep(5)  # Simulate data collection
        job_data["progress"] = 30
        job_data["message"] = "Training anomaly detector..."
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)
        )
        
        await asyncio.sleep(5)  # Simulate training
        job_data["progress"] = 60
        job_data["message"] = "Training classifier..."
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)
        )
        
        await asyncio.sleep(5)  # Simulate validation
        job_data["progress"] = 90
        job_data["message"] = "Validating models..."
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)
        )
        
        await asyncio.sleep(2)  # Finalize
        job_data["progress"] = 100
        job_data["status"] = "completed"
        job_data["message"] = "Retraining completed successfully"
        job_data["completed_at"] = datetime.now().isoformat()
        
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)
        )
        
        logger.info(f"ML retraining job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"ML retraining job {job_id} failed: {e}")
        
        # Update job status to failed
        job_data = {
            "job_id": job_id,
            "status": "failed",
            "progress": 0,
            "message": f"Retraining failed: {str(e)}",
            "failed_at": datetime.now().isoformat()
        }
        await asyncio.get_event_loop().run_in_executor(
            None, redis_client.setex, job_key, 3600, json.dumps(job_data)
        )
