import re
import json
import time
import logging
import pickle
import hashlib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, Counter
import asyncio
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import uvloop

logger = logging.getLogger("MLThreatDetector")

class ThreatType(Enum):
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    PATH_TRAVERSAL = "path_traversal"
    COMMAND_INJECTION = "command_injection"
    ABNORMAL_PAYLOAD = "abnormal_payload"
    SUSPICIOUS_USER_AGENT = "suspicious_user_agent"
    FREQUENCY_ANOMALY = "frequency_anomaly"
    UNKNOWN = "unknown"

class ThreatLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ThreatResult:
    is_threat: bool
    threat_score: float
    threat_level: ThreatLevel
    threat_type: ThreatType
    confidence: float
    features: Dict[str, Any]
    explanation: str
    detection_method: str
    timestamp: datetime

@dataclass
class RequestFeatures:
    # Basic request features
    method: str
    path_length: int
    query_param_count: int
    header_count: int
    payload_size: int
    content_type: str
    
    # Text-based features
    path_text: str
    query_text: str
    payload_text: str
    user_agent: str
    
    # Pattern-based features
    sql_injection_patterns: int
    xss_patterns: int
    path_traversal_patterns: int
    command_injection_patterns: int
    suspicious_chars: int
    
    # Behavioral features
    request_frequency: float
    header_entropy: float
    path_entropy: float
    user_agent_fingerprint: str
    
    # Temporal features
    hour_of_day: int
    day_of_week: int
    is_weekend: bool

class MLThreatDetector:
    def __init__(self, model_path: str = "models/", retrain_threshold: int = 100):
        self.model_path = model_path
        self.retrain_threshold = retrain_threshold
        
        # ML models
        self.anomaly_detector = None
        self.classifier = None
        self.vectorizer = None
        self.scaler = None
        self.label_encoder = None
        
        # Feature extraction
        self.malicious_patterns = self._load_malicious_patterns()
        self.suspicious_user_agents = self._load_suspicious_user_agents()
        
        # Model state
        self.model_version = "1.0"
        self.last_training_time = None
        self.prediction_count = 0
        self.new_patterns_detected = defaultdict(int)
        
        # Performance tracking
        self.detection_stats = {
            'total_requests': 0,
            'threats_detected': 0,
            'false_positives': 0,
            'anomaly_detections': 0,
            'classification_detections': 0,
            'pattern_detections': 0
        }
        
        # Request frequency tracking
        self.request_tracker = defaultdict(list)
        
        # Initialize models
        self._initialize_models()

    def _load_malicious_patterns(self) -> Dict[str, List[str]]:
        """Load known malicious patterns"""
        return {
            'sql_injection': [
                r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|LOAD_FILE|INTO\s+OUTFILE)\b)',
                r'(\b(OR|AND)\s+\d+\s*=\s*\d+)',
                r'(\'\s*OR\s*\'.*\'.*\=)',
                r'(\;\s*(DROP|DELETE|UPDATE|INSERT|EXEC))',
                r'(\b(INFORMATION_SCHEMA|SYS|MASTER|MSDB|MYSQL)\b)',
                r'(\b(HEX|CHAR|CONCAT|CONCAT_WS|GROUP_CONCAT)\b)',
                r'(\b(SLEEP|BENCHMARK|WAITFOR\s+DELAY)\b)',
                r'(\b(USER|VERSION|DATABASE|@@VERSION|@@GLOBAL)\b)'
            ],
            'xss': [
                r'(<script[^>]*>.*?</script>)',
                r'(javascript\s*:)',
                r'(on\w+\s*=\s*["\']?[^"\']*["\']?)',
                r'(<iframe[^>]*>)',
                r'(<object[^>]*>)',
                r'(<embed[^>]*>)',
                r'(<link[^>]*>)',
                r'(<meta[^>]*>)',
                r'(vbscript\s*:)',
                r'(\beval\s*\()',
                r'(\balert\s*\()',
                r'(\bdocument\s*\.)',
                r'(\bwindow\s*\.)'
            ],
            'path_traversal': [
                r'(\.\./)',
                r'(%2e%2e%2f)',
                r'(\.\.\\)',
                r'(%2e%2e%5c)',
                r'(/etc/passwd)',
                r'(/windows/system32)',
                r'(/proc/self/environ)',
                r'(/etc/shadow)',
                r'(\.\.\/\.\.\/)',
                r'(%c0%af)',
                r'(%c1%9c)'
            ],
            'command_injection': [
                r'(\;\s*(ls|dir|cat|type|whoami|id|pwd|ps|netstat|ifconfig))',
                r'(\|\s*(ls|dir|cat|type|whoami|id|pwd|ps|netstat|ifconfig))',
                r'(&\s*(ls|dir|cat|type|whoami|id|pwd|ps|netstat|ifconfig))',
                r'(\$\([^)]*\))',
                r'(`[^`]*`)',
                r'(\$\{[^}]*\})',
                r'(\b(nc|netcat|telnet|ssh|ftp|wget|curl)\b)',
                r'(\b(rm|mv|cp|chmod|chown)\s)',
                r'(\;|\||&|`|\$\(|\$\{)'
            ]
        }

    def _load_suspicious_user_agents(self) -> List[str]:
        """Load suspicious user agent patterns"""
        return [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'zap', 'burp', 'owasp',
            'python-requests', 'curl', 'wget', 'powershell', 'bash',
            'scanner', 'crawler', 'bot', 'spider', 'harvester',
            'metasploit', 'arachni', 'skipfish', 'w3af'
        ]

    def _initialize_models(self):
        """Initialize ML models"""
        try:
            # Try to load existing models
            self.anomaly_detector = joblib.load(f"{self.model_path}/anomaly_detector.pkl")
            self.classifier = joblib.load(f"{self.model_path}/classifier.pkl")
            self.vectorizer = joblib.load(f"{self.model_path}/vectorizer.pkl")
            self.scaler = joblib.load(f"{self.model_path}/scaler.pkl")
            self.label_encoder = joblib.load(f"{self.model_path}/label_encoder.pkl")
            
            with open(f"{self.model_path}/model_info.json", 'r') as f:
                model_info = json.load(f)
                self.model_version = model_info.get('version', '1.0')
                self.last_training_time = datetime.fromisoformat(model_info.get('training_time'))
            
            logger.info(f"Loaded ML models version {self.model_version}")
            
        except Exception as e:
            logger.warning(f"Could not load existing models: {e}")
            self._create_default_models()

    def _create_default_models(self):
        """Create default models for initial deployment"""
        logger.info("Creating default ML models")
        
        # Isolation Forest for anomaly detection
        self.anomaly_detector = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        
        # Random Forest for classification
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10,
            min_samples_split=5
        )
        
        # TF-IDF Vectorizer for text features
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 3),
            min_df=2,
            stop_words='english'
        )
        
        # StandardScaler for numerical features
        self.scaler = StandardScaler()
        
        # LabelEncoder for categorical features
        self.label_encoder = LabelEncoder()
        
        # Set default training time
        self.last_training_time = datetime.now()

    def analyze_request(self, request_data: Dict[str, Any]) -> ThreatResult:
        """
        Analyze request for threats using ML models
        
        Args:
            request_data: Dictionary containing request information
            
        Returns:
            ThreatResult with detailed analysis
        """
        start_time = time.time()
        self.detection_stats['total_requests'] += 1
        
        try:
            # Extract features
            features = self.extract_features(request_data)
            
            # Convert to feature vector
            feature_vector = self._features_to_vector(features)
            
            # Anomaly detection
            anomaly_score = self._detect_anomaly(feature_vector)
            
            # Classification
            classification_result = self._classify_request(feature_vector, features)
            
            # Pattern-based detection
            pattern_result = self._detect_patterns(features)
            
            # Combine results
            final_result = self._combine_detections(
                anomaly_score, classification_result, pattern_result, features
            )
            
            # Update statistics
            if final_result.is_threat:
                self.detection_stats['threats_detected'] += 1
                logger.warning(f"Threat detected: {final_result.threat_type.value} (score: {final_result.threat_score:.3f})")
            
            return final_result
            
        except Exception as e:
            logger.error(f"ML threat analysis error: {e}")
            # Return safe default
            return ThreatResult(
                is_threat=False,
                threat_score=0.0,
                threat_level=ThreatLevel.LOW,
                threat_type=ThreatType.UNKNOWN,
                confidence=0.0,
                features={},
                explanation="Analysis failed",
                detection_method="fallback",
                timestamp=datetime.now()
            )

    def extract_features(self, request_data: Dict[str, Any]) -> RequestFeatures:
        """Extract comprehensive features from HTTP request"""
        # Parse request components
        method = request_data.get('method', 'GET').upper()
        path = request_data.get('path', '')
        query_string = request_data.get('query', '')
        headers = request_data.get('headers', {})
        body = request_data.get('body', b'').decode('utf-8', errors='ignore')
        user_agent = headers.get('user-agent', '').lower()
        content_type = headers.get('content-type', '')
        
        # Basic features
        path_length = len(path)
        query_params = query_string.split('&') if query_string else []
        query_param_count = len([p for p in query_params if '=' in p])
        header_count = len(headers)
        payload_size = len(body)
        
        # Pattern-based features
        sql_injection_patterns = self._count_patterns(body + path + query_string, self.malicious_patterns['sql_injection'])
        xss_patterns = self._count_patterns(body + path + query_string, self.malicious_patterns['xss'])
        path_traversal_patterns = self._count_patterns(body + path + query_string, self.malicious_patterns['path_traversal'])
        command_injection_patterns = self._count_patterns(body + path + query_string, self.malicious_patterns['command_injection'])
        suspicious_chars = len(re.findall(r'[<>"\'\;|&`$\\]', body + path))
        
        # Behavioral features
        client_ip = request_data.get('ip', '')
        current_time = time.time()
        self.request_tracker[client_ip].append(current_time)
        
        # Clean old requests (older than 1 hour)
        self.request_tracker[client_ip] = [
            req_time for req_time in self.request_tracker[client_ip]
            if current_time - req_time < 3600
        ]
        
        request_frequency = len(self.request_tracker[client_ip]) / 3600.0  # requests per second
        header_entropy = self._calculate_entropy(''.join(headers.values()))
        path_entropy = self._calculate_entropy(path)
        user_agent_fingerprint = self._generate_user_agent_fingerprint(user_agent)
        
        # Temporal features
        now = datetime.now()
        hour_of_day = now.hour
        day_of_week = now.weekday()
        is_weekend = day_of_week >= 5
        
        return RequestFeatures(
            method=method,
            path_length=path_length,
            query_param_count=query_param_count,
            header_count=header_count,
            payload_size=payload_size,
            content_type=content_type,
            path_text=path,
            query_text=query_string,
            payload_text=body,
            user_agent=user_agent,
            sql_injection_patterns=sql_injection_patterns,
            xss_patterns=xss_patterns,
            path_traversal_patterns=path_traversal_patterns,
            command_injection_patterns=command_injection_patterns,
            suspicious_chars=suspicious_chars,
            request_frequency=request_frequency,
            header_entropy=header_entropy,
            path_entropy=path_entropy,
            user_agent_fingerprint=user_agent_fingerprint,
            hour_of_day=hour_of_day,
            day_of_week=day_of_week,
            is_weekend=is_weekend
        )

    def _count_patterns(self, text: str, patterns: List[str]) -> int:
        """Count occurrences of malicious patterns in text"""
        count = 0
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            count += len(matches)
        return count

    def _calculate_entropy(self, text: str) -> float:
        """Calculate Shannon entropy of text"""
        if not text:
            return 0.0
        
        char_counts = Counter(text)
        total_chars = len(text)
        entropy = 0.0
        
        for count in char_counts.values():
            probability = count / total_chars
            entropy -= probability * np.log2(probability)
        
        return entropy

    def _generate_user_agent_fingerprint(self, user_agent: str) -> str:
        """Generate fingerprint for user agent"""
        # Extract key components
        components = []
        
        # Check for suspicious patterns
        for suspicious in self.suspicious_user_agents:
            if suspicious in user_agent:
                components.append(f"suspicious:{suspicious}")
        
        # Extract browser/engine info
        if 'chrome' in user_agent:
            components.append('chrome')
        elif 'firefox' in user_agent:
            components.append('firefox')
        elif 'safari' in user_agent:
            components.append('safari')
        elif 'edge' in user_agent:
            components.append('edge')
        
        # Extract OS info
        if 'windows' in user_agent:
            components.append('windows')
        elif 'linux' in user_agent:
            components.append('linux')
        elif 'mac' in user_agent or 'osx' in user_agent:
            components.append('mac')
        
        # Check for automation tools
        if any(tool in user_agent for tool in ['python', 'curl', 'wget', 'powershell', 'bot']):
            components.append('automation')
        
        return '|'.join(sorted(components)) if components else 'unknown'

    def _features_to_vector(self, features: RequestFeatures) -> np.ndarray:
        """Convert features to numerical vector"""
        # Numerical features
        numerical_features = [
            features.path_length,
            features.query_param_count,
            features.header_count,
            features.payload_size,
            features.sql_injection_patterns,
            features.xss_patterns,
            features.path_traversal_patterns,
            features.command_injection_patterns,
            features.suspicious_chars,
            features.request_frequency,
            features.header_entropy,
            features.path_entropy,
            features.hour_of_day,
            features.day_of_week,
            int(features.is_weekend)
        ]
        
        # Categorical features
        method_encoded = self._encode_categorical(features.method, ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
        content_type_encoded = self._encode_categorical(features.content_type, ['application/json', 'application/x-www-form-urlencoded', 'text/html', 'multipart/form-data'])
        
        # Combine all features
        combined_features = numerical_features + [method_encoded, content_type_encoded]
        
        # Scale numerical features
        if self.scaler:
            numerical_scaled = self.scaler.transform([numerical_features[:15]])[0]
            combined_features[:15] = numerical_scaled
        
        return np.array(combined_features)

    def _encode_categorical(self, value: str, categories: List[str]) -> int:
        """Encode categorical feature"""
        try:
            if value.lower() in [cat.lower() for cat in categories]:
                return categories.index(value.lower())
        except:
            pass
        return len(categories)  # Unknown category

    def _detect_anomaly(self, feature_vector: np.ndarray) -> float:
        """Detect anomalies using Isolation Forest"""
        try:
            if self.anomaly_detector:
                # Reshape for single sample
                vector_reshaped = feature_vector.reshape(1, -1)
                
                # Get anomaly score (-1 for outliers, 1 for inliers)
                anomaly_score = self.anomaly_detector.decision_function(vector_reshaped)[0]
                
                # Convert to 0-1 scale (higher = more anomalous)
                normalized_score = (1 - anomaly_score) / 2
                return max(0, min(1, normalized_score))
        except Exception as e:
            logger.error(f"Anomaly detection error: {e}")
        
        return 0.0

    def _classify_request(self, feature_vector: np.ndarray, features: RequestFeatures) -> Dict[str, Any]:
        """Classify request using Random Forest"""
        try:
            if self.classifier and hasattr(self.classifier, 'predict_proba'):
                vector_reshaped = feature_vector.reshape(1, -1)
                
                # Get prediction probabilities
                probabilities = self.classifier.predict_proba(vector_reshaped)[0]
                prediction = self.classifier.predict(vector_reshaped)[0]
                
                # Get class labels
                if hasattr(self.classifier, 'classes_'):
                    classes = self.classifier.classes_
                else:
                    classes = ['benign', 'malicious']
                
                # Find the malicious class probability
                malicious_prob = 0.0
                for i, cls in enumerate(classes):
                    if 'malicious' in str(cls).lower() or cls == 1:
                        malicious_prob = probabilities[i]
                        break
                
                return {
                    'is_malicious': malicious_prob > 0.5,
                    'confidence': max(probabilities),
                    'malicious_probability': malicious_prob,
                    'prediction': prediction
                }
        except Exception as e:
            logger.error(f"Classification error: {e}")
        
        return {
            'is_malicious': False,
            'confidence': 0.0,
            'malicious_probability': 0.0,
            'prediction': 'benign'
        }

    def _detect_patterns(self, features: RequestFeatures) -> Dict[str, Any]:
        """Detect known malicious patterns"""
        pattern_scores = {}
        total_patterns = 0
        
        # Count patterns by type
        pattern_scores['sql_injection'] = features.sql_injection_patterns
        pattern_scores['xss'] = features.xss_patterns
        pattern_scores['path_traversal'] = features.path_traversal_patterns
        pattern_scores['command_injection'] = features.command_injection_patterns
        
        total_patterns = sum(pattern_scores.values())
        
        # Check for suspicious user agent
        is_suspicious_ua = any(sus in features.user_agent for sus in self.suspicious_user_agents)
        pattern_scores['suspicious_user_agent'] = 1 if is_suspicious_ua else 0
        
        # Check for abnormal payload size
        if features.payload_size > 10000:  # > 10KB
            pattern_scores['large_payload'] = min(1.0, features.payload_size / 100000)
        else:
            pattern_scores['large_payload'] = 0.0
        
        # Calculate overall pattern score
        max_possible_patterns = 20  # Arbitrary threshold
        pattern_score = min(1.0, total_patterns / max_possible_patterns)
        
        # Determine most likely threat type
        threat_type = ThreatType.UNKNOWN
        max_score = 0
        for threat_type_name, score in pattern_scores.items():
            if score > max_score and score > 0:
                max_score = score
                try:
                    threat_type = ThreatType(threat_type_name)
                except ValueError:
                    threat_type = ThreatType.UNKNOWN
        
        return {
            'pattern_score': pattern_score,
            'threat_type': threat_type,
            'pattern_counts': pattern_scores,
            'total_patterns': total_patterns
        }

    def _combine_detections(
        self,
        anomaly_score: float,
        classification_result: Dict[str, Any],
        pattern_result: Dict[str, Any],
        features: RequestFeatures
    ) -> ThreatResult:
        """Combine results from all detection methods"""
        
        # Weight different detection methods
        weights = {
            'anomaly': 0.3,
            'classification': 0.4,
            'pattern': 0.3
        }
        
        # Calculate weighted score
        weighted_score = (
            anomaly_score * weights['anomaly'] +
            classification_result['malicious_probability'] * weights['classification'] +
            pattern_result['pattern_score'] * weights['pattern']
        )
        
        # Determine threat level
        if weighted_score >= 0.8:
            threat_level = ThreatLevel.CRITICAL
        elif weighted_score >= 0.6:
            threat_level = ThreatLevel.HIGH
        elif weighted_score >= 0.3:
            threat_level = ThreatLevel.MEDIUM
        else:
            threat_level = ThreatLevel.LOW
        
        # Determine if it's a threat
        is_threat = weighted_score >= 0.3
        
        # Determine threat type
        threat_type = pattern_result['threat_type']
        if classification_result['is_malicious'] and weighted_score > pattern_result['pattern_score']:
            threat_type = ThreatType.UNKNOWN  # ML detected but no specific pattern
        
        # Calculate confidence
        confidence = max(
            classification_result['confidence'],
            1.0 - abs(anomaly_score - 0.5),  # Anomaly confidence
            min(1.0, pattern_result['total_patterns'] / 5)  # Pattern confidence
        )
        
        # Generate explanation
        explanation = self._generate_explanation(
            anomaly_score, classification_result, pattern_result, features
        )
        
        # Determine detection method
        detection_methods = []
        if anomaly_score > 0.5:
            detection_methods.append('anomaly')
        if classification_result['malicious_probability'] > 0.5:
            detection_methods.append('classification')
        if pattern_result['total_patterns'] > 0:
            detection_methods.append('pattern')
        
        detection_method = '+'.join(detection_methods) if detection_methods else 'baseline'
        
        # Prepare features dict for result
        result_features = {
            'anomaly_score': anomaly_score,
            'classification_confidence': classification_result['confidence'],
            'pattern_score': pattern_result['pattern_score'],
            'pattern_counts': pattern_result['pattern_counts'],
            'request_frequency': features.request_frequency,
            'user_agent_fingerprint': features.user_agent_fingerprint
        }
        
        return ThreatResult(
            is_threat=is_threat,
            threat_score=weighted_score,
            threat_level=threat_level,
            threat_type=threat_type,
            confidence=confidence,
            features=result_features,
            explanation=explanation,
            detection_method=detection_method,
            timestamp=datetime.now()
        )

    def _generate_explanation(
        self,
        anomaly_score: float,
        classification_result: Dict[str, Any],
        pattern_result: Dict[str, Any],
        features: RequestFeatures
    ) -> str:
        """Generate human-readable explanation"""
        explanations = []
        
        # Anomaly explanation
        if anomaly_score > 0.7:
            explanations.append("Request shows anomalous behavior patterns")
        elif anomaly_score > 0.5:
            explanations.append("Request has unusual characteristics")
        
        # Classification explanation
        if classification_result['malicious_probability'] > 0.8:
            explanations.append("ML model identifies high malicious intent")
        elif classification_result['malicious_probability'] > 0.6:
            explanations.append("ML model flags suspicious patterns")
        
        # Pattern explanation
        if pattern_result['total_patterns'] > 5:
            explanations.append(f"Multiple attack patterns detected ({pattern_result['total_patterns']})")
        elif pattern_result['total_patterns'] > 0:
            explanations.append(f"Known attack patterns present ({pattern_result['total_patterns']})")
        
        # Specific pattern explanations
        for pattern_name, count in pattern_result['pattern_counts'].items():
            if count > 0 and pattern_name != 'large_payload':
                explanations.append(f"{pattern_name.replace('_', ' ')} patterns: {count}")
        
        # Behavioral explanations
        if features.request_frequency > 1.0:
            explanations.append("High request frequency detected")
        
        if 'suspicious' in features.user_agent_fingerprint:
            explanations.append("Suspicious user agent detected")
        
        if not explanations:
            return "No significant threats detected"
        
        return "; ".join(explanations)

    def get_statistics(self) -> Dict[str, Any]:
        """Get detection statistics"""
        return {
            **self.detection_stats,
            'model_version': self.model_version,
            'last_training_time': self.last_training_time.isoformat() if self.last_training_time else None,
            'new_patterns_count': sum(self.new_patterns_detected.values()),
            'tracked_ips': len(self.request_tracker)
        }

# Global threat detector instance
threat_detector = MLThreatDetector()

# Background task for model maintenance
async def model_maintenance_task():
    """Background task for model maintenance"""
    while True:
        try:
            # Clean up tracking data
            threat_detector.cleanup_tracking_data()
            
            # Check if retraining is needed
            if threat_detector.new_patterns_detected:
                total_new = sum(threat_detector.new_patterns_detected.values())
                if total_new >= threat_detector.retrain_threshold:
                    logger.info("Retraining threshold reached, initiating retraining")
                    # In production, this would collect training data and retrain
            
            # Wait for next maintenance cycle
            await asyncio.sleep(3600)  # 1 hour
            
        except Exception as e:
            logger.error(f"Model maintenance error: {e}")
            await asyncio.sleep(300)  # Retry after 5 minutes
