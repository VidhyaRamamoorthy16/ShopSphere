#!/usr/bin/env python3
"""
Threat Feed - Real-time WebSocket streaming
FastAPI WebSocket endpoint for live threat broadcasting
"""

import asyncio
import json
import logging
from typing import List, Set, Dict, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, APIRouter
import redis.asyncio as redis

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

class ThreatFeedManager:
    """Manages WebSocket connections and broadcasts threat events"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis: redis.Redis = None
        self.threat_history: List[Dict[str, Any]] = []  # Last 50 threats
        self.max_history = 50
        
    async def init_redis(self, redis_url: str = "redis://localhost:6379"):
        """Initialize Redis connection"""
        try:
            self.redis = await redis.from_url(redis_url, decode_responses=True)
            logger.info("✅ Redis connected for threat feed")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis = None
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"🔌 WebSocket client connected. Total: {len(self.active_connections)}")
        
        # Send recent threat history to new client
        if self.threat_history:
            await websocket.send_json({
                "type": "history",
                "threats": self.threat_history
            })
    
    def disconnect(self, websocket: WebSocket):
        """Remove disconnected client"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"🔌 WebSocket client disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast_threat(self, threat_data: Dict[str, Any]):
        """Broadcast threat event to all connected clients"""
        
        # Format threat event
        threat_event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "ip": threat_data.get("ip", "unknown"),
            "endpoint": threat_data.get("endpoint", "/unknown"),
            "method": threat_data.get("method", "GET"),
            "threat_score": threat_data.get("threat_score", 0.0),
            "attack_type": threat_data.get("attack_type", "unknown"),
            "action": threat_data.get("action", "UNKNOWN"),
            "risk_tier": threat_data.get("risk_tier", "LOW"),
            "payload_preview": threat_data.get("payload_preview", "")[:100],
            "matched_patterns": threat_data.get("matched_patterns", []),
            "inference_time_ms": threat_data.get("inference_time_ms", 0),
            "detection_method": threat_data.get("detection_method", "unknown")
        }
        
        # Add to history
        self.threat_history.append(threat_event)
        if len(self.threat_history) > self.max_history:
            self.threat_history.pop(0)
        
        # Broadcast to all clients
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json({
                    "type": "threat",
                    "data": threat_event
                })
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
        
        # Also store in Redis for persistence
        if self.redis:
            try:
                await self.redis.lpush("threat_feed", json.dumps(threat_event))
                await self.redis.ltrim("threat_feed", 0, 99)  # Keep last 100
            except Exception as e:
                logger.error(f"Error storing threat in Redis: {e}")
    
    async def get_recent_threats(self, count: int = 50) -> List[Dict]:
        """Get recent threats from Redis"""
        if not self.redis:
            return self.threat_history[-count:]
        
        try:
            threats = await self.redis.lrange("threat_feed", 0, count - 1)
            return [json.loads(t) for t in threats]
        except Exception as e:
            logger.error(f"Error getting threats from Redis: {e}")
            return self.threat_history[-count:]
    
    async def get_connection_count(self) -> int:
        """Get number of active WebSocket connections"""
        return len(self.active_connections)

# Global threat feed manager
threat_feed = ThreatFeedManager()

@router.websocket("/ws/threats")
async def websocket_threat_feed(websocket: WebSocket):
    """
    WebSocket endpoint for real-time threat streaming
    URL: ws://localhost:5001/ws/threats
    """
    await threat_feed.connect(websocket)
    
    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            
            # Handle ping/pong or client requests
            try:
                message = json.loads(data)
                
                if message.get("action") == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
                
                elif message.get("action") == "get_history":
                    # Client requests threat history
                    count = message.get("count", 50)
                    threats = await threat_feed.get_recent_threats(count)
                    await websocket.send_json({
                        "type": "history",
                        "threats": threats
                    })
                    
            except json.JSONDecodeError:
                # Not JSON, treat as ping
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        threat_feed.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        threat_feed.disconnect(websocket)

# Function to broadcast threat from other parts of the system
async def broadcast_threat_event(threat_data: Dict[str, Any]):
    """Broadcast threat event to all WebSocket clients"""
    await threat_feed.broadcast_threat(threat_data)

# Initialization
async def init_threat_feed(redis_url: str = "redis://localhost:6379"):
    """Initialize threat feed manager"""
    await threat_feed.init_redis(redis_url)
    logger.info("🎯 Threat feed manager initialized")

# Cleanup
async def close_threat_feed():
    """Close threat feed and disconnect all clients"""
    for conn in threat_feed.active_connections:
        try:
            await conn.close()
        except:
            pass
    
    threat_feed.active_connections.clear()
    
    if threat_feed.redis:
        await threat_feed.redis.close()
    
    logger.info("🎯 Threat feed closed")

if __name__ == "__main__":
    # Test threat feed
    import asyncio
    
    async def test():
        await init_threat_feed()
        
        # Simulate threat broadcast
        test_threat = {
            "ip": "192.168.1.45",
            "endpoint": "/api/auth/login",
            "method": "POST",
            "threat_score": 0.91,
            "attack_type": "brute_force",
            "action": "BLOCKED",
            "risk_tier": "HIGH",
            "payload_preview": "email=admin&password=....",
            "matched_patterns": ["rapid_sequential_requests"],
            "inference_time_ms": 23,
            "detection_method": "ml_ensemble"
        }
        
        await broadcast_threat_event(test_threat)
        print("Test threat broadcasted")
    
    asyncio.run(test())
