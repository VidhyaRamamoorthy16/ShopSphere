import re
import time
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger("MLThreatDetector")

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ThreatResult:
    is_threat: bool
    threat_level: ThreatLevel
    confidence: float
    threat_type: str
    details: Dict[str, Any]
    detection_method: str
    timestamp: datetime

class MLThreatDetector:
    def __init__(self):
        # Rule-based patterns (always available)
        self.rule_patterns = {
            'sql_injection': [
                r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
                r'(\b(OR|AND)\s+\d+\s*=\s*\d+)',
                r'(\'\s*OR\s*\'.*\'.*\=)',
                r'(\;\s*(DROP|DELETE|UPDATE|INSERT))',
                r'(\b(INFORMATION_SCHEMA|SYS|MASTER|MSDB)\b)',
                r'(\b(LOAD_FILE|INTO\s+OUTFILE|DUMPFILE)\b)'
            ],
            'xss': [
                r'(<script[^>]*>.*?</script>)',
                r'(javascript\s*:)',
                r'(on\w+\s*=)',
                r'(<iframe[^>]*>)',
                r'(<object[^>]*>)',
                r'(<embed[^>]*>)',
                r'(<link[^>]*>)',
                r'(<meta[^>]*>)'
            ],
            'path_traversal': [
                r'(\.\./)',
                r'(%2e%2e%2f)',
                r'(\.\.\\)',
                r'(%2e%2e%5c)',
                r'(/etc/passwd)',
                r'(/windows/system32)',
                r'(\.\.\/\.\.\/)'
            ],
            'command_injection': [
                r'(\;\s*(ls|dir|cat|type|whoami|id|pwd))',
                r'(\|\s*(ls|dir|cat|type|whoami|id|pwd))',
                r'(&\s*(ls|dir|cat|type|whoami|id|pwd))',
                r'(\$\([^)]*\))',
                r'(`[^`]*`)',
                r'(\$\{[^}]*\})'
            ],
            'ldap_injection': [
                r'(\*\))',
                r'(\(\|)',
                r'(\()',
                r'(\*\))',
                r'(\*\*)'
            ],
            'nosql_injection': [
                r'(\$where)',
                r'(\$ne)',
                r'(\$gt)',
                r'(\$lt)',
                r'(\$regex)'
            ]
        }
        
        # ML model state
        self.ml_model_available = False
        self.model_confidence_threshold = 0.7
        self.last_model_update = None
        self.model_fallback_enabled = True
        
        # Statistics and monitoring
        self.detection_stats = {
            'total_requests': 0,
            'threats_detected': 0,
            'false_positives': 0,
            'ml_detections': 0,
            'rule_detections': 0,
            'fallback_activations': 0
        }
        
        # Rate limiting for threat detection
        self.threat_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Initialize ML model (will fail gracefully)
        self._initialize_ml_model()
    
    def _initialize_ml_model(self):
        """Initialize ML model with fallback handling"""
        try:
            # Try to import and load ML model
            import joblib
            import numpy as np
            from sklearn.feature_extraction.text import TfidfVectorizer
            
            # Load pre-trained model
            self.ml_model = joblib.load('models/threat_detector_model.pkl')
            self.vectorizer = joblib.load('models/threat_vectorizer.pkl')
            self.ml_model_available = True
            self.last_model_update = datetime.now()
            
            logger.info("ML threat detection model loaded successfully")
            
        except Exception as e:
            logger.warning(f"ML model not available, using rule-based detection: {e}")
            self.ml_model_available = False
            self.model_fallback_enabled = True
    
    def analyze_request(self, request_data: Dict[str, Any]) -> ThreatResult:
        """
        Analyze request for threats using ML + rule-based approach
        
        Args:
            request_data: Dictionary containing request information
                - path: URL path
                - method: HTTP method
                - headers: Request headers
                - body: Request body
                - ip: Client IP
                - user_agent: User agent string
                
        Returns:
            ThreatResult with detection details
        """
        start_time = time.time()
        self.detection_stats['total_requests'] += 1
        
        # Extract content for analysis
        content = self._extract_content(request_data)
        
        # Check cache first
        cache_key = self._generate_cache_key(content)
        if cache_key in self.threat_cache:
            cached_result = self.threat_cache[cache_key]
            if time.time() - cached_result['timestamp'] < self.cache_ttl:
                logger.debug(f"Using cached threat result for {cache_key}")
                return cached_result['result']
        
        # Multi-layer detection
        threats = []
        
        # 1. Rule-based detection (always available)
        rule_result = self._rule_based_detection(content)
        if rule_result['is_threat']:
            threats.append(rule_result)
            self.detection_stats['rule_detections'] += 1
        
        # 2. ML-based detection (if available)
        ml_result = None
        if self.ml_model_available:
            try:
                ml_result = self._ml_based_detection(content)
                if ml_result['is_threat']:
                    threats.append(ml_result)
                    self.detection_stats['ml_detections'] += 1
            except Exception as e:
                logger.error(f"ML detection failed, falling back to rules: {e}")
                self.detection_stats['fallback_activations'] += 1
                self.ml_model_available = False
                self.model_fallback_enabled = True
        
        # 3. Behavioral analysis
        behavioral_result = self._behavioral_analysis(request_data)
        if behavioral_result['is_threat']:
            threats.append(behavioral_result)
        
        # Aggregate results
        final_result = self._aggregate_threats(threats, content)
        
        # Cache result
        self.threat_cache[cache_key] = {
            'result': final_result,
            'timestamp': time.time()
        }
        
        # Update statistics
        if final_result.is_threat:
            self.detection_stats['threats_detected'] += 1
            logger.warning(f"Threat detected: {final_result.threat_type} ({final_result.confidence:.2f})")
        
        # Log performance
        processing_time = time.time() - start_time
        logger.debug(f"Threat analysis completed in {processing_time:.3f}s")
        
        return final_result
    
    def _extract_content(self, request_data: Dict[str, Any]) -> str:
        """Extract relevant content for analysis"""
        content_parts = []
        
        # Add path and method
        if request_data.get('path'):
            content_parts.append(request_data['path'])
        if request_data.get('method'):
            content_parts.append(request_data['method'])
        
        # Add body content
        if request_data.get('body'):
            if isinstance(request_data['body'], bytes):
                try:
                    body_content = request_data['body'].decode('utf-8', errors='ignore')
                except:
                    body_content = str(request_data['body'])
            else:
                body_content = str(request_data['body'])
            content_parts.append(body_content)
        
        # Add relevant headers
        sensitive_headers = ['user-agent', 'referer', 'x-forwarded-for']
        for header in sensitive_headers:
            if header in request_data.get('headers', {}):
                content_parts.append(request_data['headers'][header])
        
        return ' '.join(content_parts).lower()
    
    def _rule_based_detection(self, content: str) -> Dict[str, Any]:
        """Rule-based threat detection (always available)"""
        for threat_type, patterns in self.rule_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    return {
                        'is_threat': True,
                        'threat_type': threat_type,
                        'confidence': 0.9,  # High confidence for rule-based
                        'detection_method': 'rule_based',
                        'details': {
                            'pattern_matched': pattern,
                            'match_context': self._get_match_context(content, pattern)
                        }
                    }
        
        return {'is_threat': False}
    
    def _ml_based_detection(self, content: str) -> Dict[str, Any]:
        """ML-based threat detection"""
        if not self.ml_model_available:
            return {'is_threat': False}
        
        try:
            # Vectorize content
            content_vector = self.vectorizer.transform([content])
            
            # Predict
            prediction = self.ml_model.predict(content_vector)[0]
            probabilities = self.ml_model.predict_proba(content_vector)[0]
            
            # Get threat probability
            threat_probability = probabilities[1] if len(probabilities) > 1 else 0.0
            
            if threat_probability > self.model_confidence_threshold:
                return {
                    'is_threat': True,
                    'threat_type': 'ml_detected',
                    'confidence': float(threat_probability),
                    'detection_method': 'ml_based',
                    'details': {
                        'model_version': getattr(self, 'model_version', 'unknown'),
                        'feature_importance': self._get_feature_importance(content)
                    }
                }
        
        except Exception as e:
            logger.error(f"ML detection error: {e}")
            raise
        
        return {'is_threat': False}
    
    def _behavioral_analysis(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Behavioral threat analysis"""
        threats = []
        
        # Check for suspicious patterns in request frequency
        ip = request_data.get('ip', '')
        current_time = time.time()
        
        # Simple rate-based detection
        if ip in self.threat_cache:
            recent_requests = [
                req for req in self.threat_cache[ip].get('requests', [])
                if current_time - req['timestamp'] < 60  # Last minute
            ]
            
            if len(recent_requests) > 100:  # More than 100 requests per minute
                threats.append({
                    'type': 'rate_limit_exceeded',
                    'confidence': 0.8,
                    'details': {'requests_per_minute': len(recent_requests)}
                })
        
        # Check for suspicious user agents
        user_agent = request_data.get('headers', {}).get('user-agent', '').lower()
        suspicious_agents = ['sqlmap', 'nikto', 'nmap', 'curl', 'wget', 'python']
        
        if any(sus_agent in user_agent for sus_agent in suspicious_agents):
            threats.append({
                'type': 'suspicious_user_agent',
                'confidence': 0.6,
                'details': {'user_agent': user_agent}
            })
        
        if threats:
            return {
                'is_threat': True,
                'threat_type': 'behavioral',
                'confidence': max(t['confidence'] for t in threats),
                'detection_method': 'behavioral',
                'details': {'threats': threats}
            }
        
        return {'is_threat': False}
    
    def _aggregate_threats(self, threats: List[Dict], content: str) -> ThreatResult:
        """Aggregate multiple threat detections"""
        if not threats:
            return ThreatResult(
                is_threat=False,
                threat_level=ThreatLevel.LOW,
                confidence=0.0,
                threat_type='none',
                details={'method': 'no_threat_detected'},
                detection_method='aggregated',
                timestamp=datetime.now()
            )
        
        # Find highest confidence threat
        highest_threat = max(threats, key=lambda x: x['confidence'])
        
        # Determine threat level
        confidence = highest_threat['confidence']
        if confidence >= 0.9:
            threat_level = ThreatLevel.CRITICAL
        elif confidence >= 0.7:
            threat_level = ThreatLevel.HIGH
        elif confidence >= 0.5:
            threat_level = ThreatLevel.MEDIUM
        else:
            threat_level = ThreatLevel.LOW
        
        return ThreatResult(
            is_threat=True,
            threat_level=threat_level,
            confidence=confidence,
            threat_type=highest_threat['threat_type'],
            details={
                'primary_threat': highest_threat,
                'all_threats': threats,
                'content_length': len(content)
            },
            detection_method=highest_threat['detection_method'],
            timestamp=datetime.now()
        )
    
    def _get_match_context(self, content: str, pattern: str, context_size: 50) -> str:
        """Get context around pattern match"""
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            start = max(0, match.start() - context_size)
            end = min(len(content), match.end() + context_size)
            return content[start:end]
        return ""
    
    def _get_feature_importance(self, content: str) -> Dict[str, float]:
        """Get feature importance for ML prediction (if available)"""
        if hasattr(self.ml_model, 'feature_importances_'):
            try:
                feature_names = self.vectorizer.get_feature_names_out()
                importance_scores = self.ml_model.feature_importances_
                
                # Get top features
                top_indices = importance_scores.argsort()[-10:][::-1]
                return {
                    feature_names[i]: float(importance_scores[i])
                    for i in top_indices
                }
            except:
                pass
        return {}
    
    def _generate_cache_key(self, content: str) -> str:
        """Generate cache key for content"""
        import hashlib
        return hashlib.md5(content.encode()).hexdigest()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get detection statistics"""
        total = self.detection_stats['total_requests']
        if total == 0:
            return self.detection_stats
        
        return {
            **self.detection_stats,
            'threat_rate': self.detection_stats['threats_detected'] / total,
            'ml_availability': self.ml_model_available,
            'model_last_updated': self.last_model_update.isoformat() if self.last_model_update else None,
            'cache_size': len(self.threat_cache)
        }
    
    def update_model(self, model_path: str, vectorizer_path: str) -> bool:
        """Update ML model with new version"""
        try:
            import joblib
            
            # Load new model
            new_model = joblib.load(model_path)
            new_vectorizer = joblib.load(vectorizer_path)
            
            # Test model
            test_content = "SELECT * FROM users"
            test_vector = new_vectorizer.transform([test_content])
            new_model.predict(test_vector)
            
            # Update model
            self.ml_model = new_model
            self.vectorizer = new_vectorizer
            self.ml_model_available = True
            self.last_model_update = datetime.now()
            
            logger.info("ML model updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update ML model: {e}")
            return False
    
    def cleanup_cache(self) -> int:
        """Clean up expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, value in self.threat_cache.items()
            if isinstance(value, dict) and 
               current_time - value.get('timestamp', 0) > self.cache_ttl
        ]
        
        for key in expired_keys:
            del self.threat_cache[key]
        
        logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
        return len(expired_keys)

# Global detector instance
threat_detector = MLThreatDetector()

# Background task for model health check
async def model_health_check():
    """Periodic health check for ML model"""
    while True:
        try:
            # Test model with sample data
            if threat_detector.ml_model_available:
                test_result = threat_detector._ml_based_detection("test content")
                if not test_result:
                    logger.warning("ML model health check failed, disabling ML detection")
                    threat_detector.ml_model_available = False
                    threat_detector.model_fallback_enabled = True
            
            # Cleanup cache
            threat_detector.cleanup_cache()
            
            # Wait for next check (5 minutes)
            import asyncio
            await asyncio.sleep(300)
            
        except Exception as e:
            logger.error(f"Model health check error: {e}")
            import asyncio
            await asyncio.sleep(60)  # Retry after 1 minute
