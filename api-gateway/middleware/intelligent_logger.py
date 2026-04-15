import json
import time
import logging
import asyncio
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import redis
from supabase import create_client, Client
import aiofiles
import gzip
from collections import defaultdict, deque

logger = logging.getLogger("IntelligentLogger")

class LogLevel(Enum):
    INFO = "INFO"
    WARN = "WARN"
    THREAT = "THREAT"
    BLOCKED = "BLOCKED"
    CRITICAL = "CRITICAL"

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class LogEntry:
    timestamp: datetime
    level: LogLevel
    ip: str
    method: str
    path: str
    user_agent: str
    threat_score: float
    rate_limit_tier: str
    action_taken: str
    response_time_ms: float
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    threat_type: Optional[str] = None
    fingerprint: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    payload_size: int = 0
    status_code: Optional[int] = None
    error_message: Optional[str] = None

@dataclass
class SecurityAlert:
    alert_id: str
    severity: AlertSeverity
    title: str
    description: str
    ip: str
    threat_score: float
    timestamp: datetime
    alert_type: str
    action_taken: str
    additional_data: Optional[Dict[str, Any]] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class IntelligentLogger:
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        supabase_url: str = None,
        supabase_key: str = None,
        log_retention_days: int = 30,
        alert_thresholds: Dict[str, float] = None
    ):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.supabase: Optional[Client] = None
        
        if supabase_url and supabase_key:
            self.supabase = create_client(supabase_url, supabase_key)
        
        self.log_retention_days = log_retention_days
        self.alert_thresholds = alert_thresholds or {
            'threat_score_threshold': 0.6,
            'multiple_threats_threshold': 3,
            'ddos_threshold': 100,
            'new_attack_pattern_threshold': 1
        }
        
        # In-memory tracking for real-time alerts
        self.ip_threat_counts = defaultdict(lambda: deque(maxlen=100))
        self.recent_alerts = deque(maxlen=1000)
        self.request_patterns = defaultdict(lambda: defaultdict(int))
        self.hourly_stats = defaultdict(lambda: defaultdict(int))
        
        # Performance metrics
        self.metrics = {
            'logs_processed': 0,
            'alerts_generated': 0,
            'alerts_resolved': 0,
            'false_positives': 0,
            'logs_to_supabase': 0,
            'logs_to_redis': 0
        }
        
        # Background tasks
        self._running = True
        self._background_tasks = []
        
        # Initialize background tasks
        self._start_background_tasks()

    def _start_background_tasks(self):
        """Start background tasks for log processing and alerting"""
        # Log aggregation task
        self._background_tasks.append(
            asyncio.create_task(self._log_aggregation_task())
        )
        
        # Alert processing task
        self._background_tasks.append(
            asyncio.create_task(self._alert_processing_task())
        )
        
        # Cleanup task
        self._background_tasks.append(
            asyncio.create_task(self._cleanup_task())
        )
        
        # Statistics task
        self._background_tasks.append(
            asyncio.create_task(self._statistics_task())
        )

    async def log_request(
        self,
        request_data: Dict[str, Any],
        threat_result: Optional[Dict[str, Any]] = None,
        rate_limit_result: Optional[Dict[str, Any]] = None,
        action_taken: str = "allowed"
    ) -> str:
        """
        Log an HTTP request with comprehensive security information
        
        Args:
            request_data: Dictionary containing request information
            threat_result: Threat detection result
            rate_limit_result: Rate limiting result
            action_taken: Action taken (allowed, blocked, flagged)
            
        Returns:
            Request ID for tracking
        """
        try:
            # Generate unique request ID
            request_id = str(uuid.uuid4())
            
            # Extract request information
            ip = request_data.get('ip', 'unknown')
            method = request_data.get('method', 'UNKNOWN')
            path = request_data.get('path', '/')
            headers = request_data.get('headers', {})
            user_agent = headers.get('user-agent', '')
            user_id = request_data.get('user_id')
            response_time = request_data.get('response_time_ms', 0)
            status_code = request_data.get('status_code')
            payload_size = len(request_data.get('body', b''))
            
            # Extract threat information
            threat_score = 0.0
            threat_type = None
            if threat_result:
                threat_score = threat_result.get('threat_score', 0.0)
                threat_type = threat_result.get('threat_type')
            
            # Determine log level
            log_level = self._determine_log_level(threat_score, action_taken, status_code)
            
            # Get rate limit tier
            rate_limit_tier = 'unauthenticated'
            if rate_limit_result:
                rate_limit_tier = rate_limit_result.get('tier', 'unauthenticated')
            
            # Create log entry
            log_entry = LogEntry(
                timestamp=datetime.now(),
                level=log_level,
                ip=ip,
                method=method,
                path=path,
                user_agent=user_agent,
                threat_score=threat_score,
                rate_limit_tier=rate_limit_tier,
                action_taken=action_taken,
                response_time_ms=response_time,
                user_id=user_id,
                request_id=request_id,
                threat_type=threat_type,
                fingerprint=request_data.get('fingerprint'),
                headers={k: v for k, v in headers.items() if k.lower() not in ['authorization', 'cookie']},
                payload_size=payload_size,
                status_code=status_code
            )
            
            # Store log entry
            await self._store_log_entry(log_entry)
            
            # Update tracking data
            self._update_tracking_data(ip, threat_score, threat_type, log_entry)
            
            # Check for alert conditions
            await self._check_alert_conditions(log_entry, threat_result)
            
            self.metrics['logs_processed'] += 1
            return request_id
            
        except Exception as e:
            logger.error(f"Error logging request: {e}")
            return str(uuid.uuid4())  # Return ID even on error

    def _determine_log_level(self, threat_score: float, action_taken: str, status_code: Optional[int]) -> LogLevel:
        """Determine appropriate log level based on request characteristics"""
        if action_taken == 'blocked' or threat_score >= 0.8:
            return LogLevel.BLOCKED
        elif threat_score >= 0.6:
            return LogLevel.THREAT
        elif threat_score >= 0.3 or status_code and status_code >= 400:
            return LogLevel.WARN
        else:
            return LogLevel.INFO

    async def _store_log_entry(self, log_entry: LogEntry):
        """Store log entry in Redis and optionally Supabase"""
        try:
            # Store in Redis for real-time access
            redis_key = f"logs:{log_entry.timestamp.strftime('%Y%m%d')}:{log_entry.request_id}"
            log_data = asdict(log_entry)
            log_data['timestamp'] = log_entry.timestamp.isoformat()
            
            # Store with TTL based on retention period
            ttl = self.log_retention_days * 24 * 3600
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.setex, redis_key, ttl, json.dumps(log_data)
            )
            
            # Add to time-based indices
            hour_key = f"logs:hour:{log_entry.timestamp.strftime('%Y%m%d%H')}"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lpush, hour_key, log_entry.request_id
            )
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.expire, hour_key, ttl
            )
            
            # Add to IP-based index
            ip_key = f"logs:ip:{log_entry.ip}"
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lpush, ip_key, log_entry.request_id
            )
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.expire, ip_key, ttl
            )
            
            self.metrics['logs_to_redis'] += 1
            
            # Store in Supabase for long-term storage (async)
            if self.supabase and log_entry.level in [LogLevel.THREAT, LogLevel.BLOCKED, LogLevel.CRITICAL]:
                asyncio.create_task(self._store_in_supabase(log_entry))
            
        except Exception as e:
            logger.error(f"Error storing log entry: {e}")

    async def _store_in_supabase(self, log_entry: LogEntry):
        """Store log entry in Supabase for long-term analysis"""
        try:
            log_data = {
                'timestamp': log_entry.timestamp.isoformat(),
                'level': log_entry.level.value,
                'ip': log_entry.ip,
                'method': log_entry.method,
                'path': log_entry.path,
                'user_agent': log_entry.user_agent,
                'threat_score': log_entry.threat_score,
                'rate_limit_tier': log_entry.rate_limit_tier,
                'action_taken': log_entry.action_taken,
                'response_time_ms': log_entry.response_time_ms,
                'user_id': log_entry.user_id,
                'request_id': log_entry.request_id,
                'threat_type': log_entry.threat_type,
                'fingerprint': log_entry.fingerprint,
                'headers': log_entry.headers,
                'payload_size': log_entry.payload_size,
                'status_code': log_entry.status_code,
                'error_message': log_entry.error_message
            }
            
            # Remove None values
            log_data = {k: v for k, v in log_data.items() if v is not None}
            
            result = self.supabase.table('security_logs').insert(log_data).execute()
            self.metrics['logs_to_supabase'] += 1
            
        except Exception as e:
            logger.error(f"Error storing log in Supabase: {e}")

    def _update_tracking_data(self, ip: str, threat_score: float, threat_type: Optional[str], log_entry: LogEntry):
        """Update in-memory tracking data for real-time analysis"""
        current_time = time.time()
        
        # Track IP threat scores
        self.ip_threat_counts[ip].append({
            'timestamp': current_time,
            'threat_score': threat_score,
            'threat_type': threat_type
        })
        
        # Track request patterns
        pattern_key = f"{log_entry.method}:{log_entry.path}"
        self.request_patterns[pattern_key][ip] += 1
        
        # Update hourly statistics
        hour_key = log_entry.timestamp.strftime('%Y%m%d%H')
        self.hourly_stats[hour_key]['total_requests'] += 1
        self.hourly_stats[hour_key]['blocked_requests'] += 1 if log_entry.action_taken == 'blocked' else 0
        self.hourly_stats[hour_key]['threat_score_sum'] += threat_score

    async def _check_alert_conditions(self, log_entry: LogEntry, threat_result: Optional[Dict[str, Any]]):
        """Check if this log entry triggers any alert conditions"""
        try:
            alerts = []
            
            # High threat score alert
            if log_entry.threat_score >= self.alert_thresholds['threat_score_threshold']:
                alerts.append(await self._create_threat_alert(log_entry, threat_result))
            
            # Multiple threats from same IP
            recent_threats = [
                entry for entry in self.ip_threat_counts[log_entry.ip]
                if time.time() - entry['timestamp'] < 3600 and entry['threat_score'] >= 0.6
            ]
            
            if len(recent_threats) >= self.alert_thresholds['multiple_threats_threshold']:
                alerts.append(await self._create_multiple_threat_alert(log_entry, len(recent_threats)))
            
            # DDoS detection
            current_hour = log_entry.timestamp.strftime('%Y%m%d%H')
            if current_hour in self.hourly_stats:
                hourly_requests = self.hourly_stats[current_hour]['total_requests']
                if hourly_requests >= self.alert_thresholds['ddos_threshold']:
                    alerts.append(await self._create_ddos_alert(log_entry, hourly_requests))
            
            # New attack pattern detection
            if threat_result and threat_result.get('detection_method') == 'anomaly':
                alerts.append(await self._create_new_pattern_alert(log_entry, threat_result))
            
            # Store and process alerts
            for alert in alerts:
                await self._process_alert(alert)
            
        except Exception as e:
            logger.error(f"Error checking alert conditions: {e}")

    async def _create_threat_alert(self, log_entry: LogEntry, threat_result: Optional[Dict[str, Any]]) -> SecurityAlert:
        """Create alert for high threat score"""
        severity = AlertSeverity.CRITICAL if log_entry.threat_score >= 0.8 else AlertSeverity.HIGH
        
        return SecurityAlert(
            alert_id=str(uuid.uuid4()),
            severity=severity,
            title="High Threat Score Detected",
            description=f"Request from {log_entry.ip} has threat score {log_entry.threat_score:.3f}",
            ip=log_entry.ip,
            threat_score=log_entry.threat_score,
            timestamp=log_entry.timestamp,
            alert_type="threat_score",
            action_taken="flagged",
            additional_data={
                'threat_type': log_entry.threat_type,
                'method': log_entry.method,
                'path': log_entry.path,
                'user_agent': log_entry.user_agent
            }
        )

    async def _create_multiple_threat_alert(self, log_entry: LogEntry, threat_count: int) -> SecurityAlert:
        """Create alert for multiple threats from same IP"""
        return SecurityAlert(
            alert_id=str(uuid.uuid4()),
            severity=AlertSeverity.HIGH,
            title="Multiple Threats from Single IP",
            description=f"IP {log_entry.ip} has generated {threat_count} threats in the last hour",
            ip=log_entry.ip,
            threat_score=log_entry.threat_score,
            timestamp=log_entry.timestamp,
            alert_type="multiple_threats",
            action_taken="monitored",
            additional_data={
                'threat_count': threat_count,
                'timeframe': '1 hour'
            }
        )

    async def _create_ddos_alert(self, log_entry: LogEntry, request_count: int) -> SecurityAlert:
        """Create DDoS attack alert"""
        return SecurityAlert(
            alert_id=str(uuid.uuid4()),
            severity=AlertSeverity.CRITICAL,
            title="Potential DDoS Attack",
            description=f"High request volume detected: {request_count} requests in current hour",
            ip=log_entry.ip,
            threat_score=log_entry.threat_score,
            timestamp=log_entry.timestamp,
            alert_type="ddos",
            action_taken="rate_limited",
            additional_data={
                'request_count': request_count,
                'timeframe': '1 hour'
            }
        )

    async def _create_new_pattern_alert(self, log_entry: LogEntry, threat_result: Dict[str, Any]) -> SecurityAlert:
        """Create alert for new attack pattern"""
        return SecurityAlert(
            alert_id=str(uuid.uuid4()),
            severity=AlertSeverity.MEDIUM,
            title="New Attack Pattern Detected",
            description=f"Anomaly detection identified new potential attack pattern",
            ip=log_entry.ip,
            threat_score=log_entry.threat_score,
            timestamp=log_entry.timestamp,
            alert_type="new_pattern",
            action_taken="monitored",
            additional_data={
                'detection_method': threat_result.get('detection_method'),
                'features': threat_result.get('features', {})
            }
        )

    async def _process_alert(self, alert: SecurityAlert):
        """Process and store security alert"""
        try:
            # Store in Redis
            alert_key = f"alerts:{alert.alert_id}"
            alert_data = asdict(alert)
            alert_data['timestamp'] = alert.timestamp.isoformat()
            
            await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.setex, alert_key, 86400 * 7, json.dumps(alert_data)  # 7 days TTL
            )
            
            # Add to recent alerts
            self.recent_alerts.append(alert)
            
            # Store in Supabase
            if self.supabase:
                await self._store_alert_in_supabase(alert)
            
            # Take automatic action based on severity
            await self._take_automatic_action(alert)
            
            self.metrics['alerts_generated'] += 1
            
            logger.warning(f"Security alert generated: {alert.title} - {alert.description}")
            
        except Exception as e:
            logger.error(f"Error processing alert: {e}")

    async def _store_alert_in_supabase(self, alert: SecurityAlert):
        """Store alert in Supabase"""
        try:
            alert_data = {
                'alert_id': alert.alert_id,
                'severity': alert.severity.value,
                'title': alert.title,
                'description': alert.description,
                'ip': alert.ip,
                'threat_score': alert.threat_score,
                'timestamp': alert.timestamp.isoformat(),
                'alert_type': alert.alert_type,
                'action_taken': alert.action_taken,
                'additional_data': alert.additional_data,
                'resolved': alert.resolved,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            }
            
            self.supabase.table('security_alerts').insert(alert_data).execute()
            
        except Exception as e:
            logger.error(f"Error storing alert in Supabase: {e}")

    async def _take_automatic_action(self, alert: SecurityAlert):
        """Take automatic action based on alert severity and type"""
        try:
            if alert.severity == AlertSeverity.CRITICAL:
                if alert.alert_type == 'ddos':
                    # Implement DDoS mitigation
                    await self._mitigate_ddos(alert.ip)
                elif alert.alert_type == 'threat_score':
                    # Auto-ban high threat IP
                    await self._auto_ban_ip(alert.ip, duration=3600)  # 1 hour
                elif alert.alert_type == 'multiple_threats':
                    # Auto-ban IP with multiple threats
                    await self._auto_ban_ip(alert.ip, duration=86400)  # 24 hours
            
            elif alert.severity == AlertSeverity.HIGH:
                if alert.alert_type == 'multiple_threats':
                    # Increase monitoring
                    await self._increase_monitoring(alert.ip)
            
        except Exception as e:
            logger.error(f"Error taking automatic action: {e}")

    async def _mitigate_ddos(self, ip: str):
        """Implement DDoS mitigation for IP"""
        # Add to rate limit suspicious tier
        suspicious_key = f"rate_limit:suspicious:{ip}"
        await asyncio.get_event_loop().run_in_executor(
            None, self.redis_client.setex, suspicious_key, 3600, "1"
        )
        logger.info(f"DDoS mitigation activated for IP: {ip}")

    async def _auto_ban_ip(self, ip: str, duration: int):
        """Automatically ban IP for specified duration"""
        ban_key = f"banned_ips:{ip}"
        ban_data = {
            'ip': ip,
            'banned_at': datetime.now().isoformat(),
            'duration': duration,
            'reason': 'automatic_ban'
        }
        
        await asyncio.get_event_loop().run_in_executor(
            None, self.redis_client.setex, ban_key, duration, json.dumps(ban_data)
        )
        logger.info(f"Auto-banned IP {ip} for {duration} seconds")

    async def _increase_monitoring(self, ip: str):
        """Increase monitoring level for IP"""
        monitoring_key = f"enhanced_monitoring:{ip}"
        await asyncio.get_event_loop().run_in_executor(
            None, self.redis_client.setex, monitoring_key, 7200, "1"  # 2 hours
        )
        logger.info(f"Enhanced monitoring activated for IP: {ip}")

    async def _log_aggregation_task(self):
        """Background task for log aggregation"""
        while self._running:
            try:
                # Aggregate logs every minute
                await self._aggregate_minute_logs()
                await asyncio.sleep(60)
            except Exception as e:
                logger.error(f"Error in log aggregation task: {e}")
                await asyncio.sleep(10)

    async def _alert_processing_task(self):
        """Background task for alert processing"""
        while self._running:
            try:
                # Process alerts every 30 seconds
                await self._process_pending_alerts()
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f"Error in alert processing task: {e}")
                await asyncio.sleep(10)

    async def _cleanup_task(self):
        """Background task for cleanup"""
        while self._running:
            try:
                # Cleanup old data every hour
                await self._cleanup_old_data()
                await asyncio.sleep(3600)
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")
                await asyncio.sleep(60)

    async def _statistics_task(self):
        """Background task for statistics"""
        while self._running:
            try:
                # Update statistics every 5 minutes
                await self._update_statistics()
                await asyncio.sleep(300)
            except Exception as e:
                logger.error(f"Error in statistics task: {e}")
                await asyncio.sleep(60)

    async def _aggregate_minute_logs(self):
        """Aggregate logs for the last minute"""
        # Implementation for minute-level log aggregation
        pass

    async def _process_pending_alerts(self):
        """Process any pending alerts"""
        # Implementation for processing queued alerts
        pass

    async def _cleanup_old_data(self):
        """Clean up old data from memory and Redis"""
        current_time = time.time()
        cutoff_time = current_time - (self.log_retention_days * 24 * 3600)
        
        # Clean up IP threat counts
        for ip in list(self.ip_threat_counts.keys()):
            self.ip_threat_counts[ip] = deque([
                entry for entry in self.ip_threat_counts[ip]
                if entry['timestamp'] > cutoff_time
            ], maxlen=100)
            
            if not self.ip_threat_counts[ip]:
                del self.ip_threat_counts[ip]
        
        # Clean up old hourly stats
        cutoff_date = datetime.fromtimestamp(cutoff_time).strftime('%Y%m%d')
        for hour_key in list(self.hourly_stats.keys()):
            if hour_key[:8] < cutoff_date:
                del self.hourly_stats[hour_key]

    async def _update_statistics(self):
        """Update system statistics"""
        # Calculate current statistics
        total_ips = len(self.ip_threat_counts)
        active_alerts = len([a for a in self.recent_alerts if not a.resolved])
        
        # Store in Redis for dashboard
        stats_key = "logger:statistics"
        stats = {
            'total_ips': total_ips,
            'active_alerts': active_alerts,
            'logs_processed': self.metrics['logs_processed'],
            'alerts_generated': self.metrics['alerts_generated'],
            'timestamp': datetime.now().isoformat()
        }
        
        await asyncio.get_event_loop().run_in_executor(
            None, self.redis_client.setex, stats_key, 300, json.dumps(stats)
        )

    async def get_recent_logs(self, limit: int = 100, level: Optional[LogLevel] = None) -> List[Dict[str, Any]]:
        """Get recent log entries"""
        try:
            # Get logs from current hour
            current_hour = datetime.now().strftime('%Y%m%d%H')
            hour_key = f"logs:hour:{current_hour}"
            
            request_ids = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.lrange, hour_key, 0, limit - 1
            )
            
            logs = []
            for request_id in request_ids:
                log_key = f"logs:{datetime.now().strftime('%Y%m%d')}:{request_id}"
                log_data = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.get, log_key
                )
                
                if log_data:
                    log_entry = json.loads(log_data)
                    if level is None or log_entry['level'] == level.value:
                        logs.append(log_entry)
            
            return logs
            
        except Exception as e:
            logger.error(f"Error getting recent logs: {e}")
            return []

    async def get_recent_alerts(self, limit: int = 50, severity: Optional[AlertSeverity] = None) -> List[SecurityAlert]:
        """Get recent security alerts"""
        try:
            alerts = list(self.recent_alerts)
            
            if severity:
                alerts = [a for a in alerts if a.severity == severity]
            
            return alerts[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recent alerts: {e}")
            return []

    async def resolve_alert(self, alert_id: str, resolution_notes: Optional[str] = None):
        """Mark an alert as resolved"""
        try:
            # Update in memory
            for alert in self.recent_alerts:
                if alert.alert_id == alert_id:
                    alert.resolved = True
                    alert.resolved_at = datetime.now()
                    break
            
            # Update in Redis
            alert_key = f"alerts:{alert_id}"
            alert_data = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.get, alert_key
            )
            
            if alert_data:
                alert_dict = json.loads(alert_data)
                alert_dict['resolved'] = True
                alert_dict['resolved_at'] = datetime.now().isoformat()
                if resolution_notes:
                    alert_dict['resolution_notes'] = resolution_notes
                
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.setex, alert_key, 86400 * 7, json.dumps(alert_dict)
                )
            
            # Update in Supabase
            if self.supabase:
                self.supabase.table('security_alerts').update({
                    'resolved': True,
                    'resolved_at': datetime.now().isoformat(),
                    'resolution_notes': resolution_notes
                }).eq('alert_id', alert_id).execute()
            
            self.metrics['alerts_resolved'] += 1
            logger.info(f"Alert {alert_id} resolved")
            
        except Exception as e:
            logger.error(f"Error resolving alert: {e}")

    def get_metrics(self) -> Dict[str, Any]:
        """Get logging system metrics"""
        return {
            **self.metrics,
            'tracked_ips': len(self.ip_threat_counts),
            'active_alerts': len([a for a in self.recent_alerts if not a.resolved]),
            'hourly_stats_count': len(self.hourly_stats)
        }

    async def shutdown(self):
        """Shutdown the logging system"""
        self._running = False
        
        # Cancel background tasks
        for task in self._background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        await asyncio.gather(*self._background_tasks, return_exceptions=True)
        
        logger.info("Intelligent logging system shutdown complete")

# Global logger instance
intelligent_logger = IntelligentLogger()
