#!/usr/bin/env python3
"""
ML Detector - Conference Paper Implementation
Complete 6-step detection pipeline with hybrid approach
"""

import os
import pickle
import re
import time
import logging
import asyncio
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from dataclasses import dataclass
import numpy as np
import redis.asyncio as redis
from fastapi import Request, HTTPException
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from scipy.sparse import hstack, csr_matrix

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class DetectionResult:
    """Complete detection result"""
    threat_score: float
    action: str  # "SAFE", "FLAGGED", "BLOCKED"
    attack_type: str  # "benign", "sqli", "xss", "brute_force", "path_traversal", "unknown"
    confidence: float
    detection_method: str  # "rule_based", "ml_ensemble", "hybrid"
    matched_patterns: List[str]
    features_triggered: Dict[str, Any]
    inference_time_ms: float
    recommendation: str = ""

class MaliciousDetector:
    """Production-grade threat detection system"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.vectorizer = None
        self.model_lr = None
        self.model_rf = None
        self.model_iso = None
        self.models_loaded = False
        
        # Redis client
        self.redis = None
        
        # Detection statistics
        self.stats = {
            "total_detections": 0,
            "rule_based_blocks": 0,
            "ml_blocks": 0,
            "ml_flagged": 0,
            "safe_requests": 0,
            "avg_inference_time_ms": 0.0,
            "last_reset": datetime.now()
        }
        
        # Rule-based patterns (STEP 2)
        self.sql_patterns = [
            r"(\bUNION\b.*\bSELECT\b)",
            r"(\bDROP\b.*\bTABLE\b)",
            r"(\'|\")(\s)*(OR|AND)(\s)*(\'|\"|[0-9])",
            r"(1\s*=\s*1)",
            r"(--|\#|\/\*)",
            r"(\bSLEEP\b\s*\()",
            r"(\bWAITFOR\b.*\bDELAY\b)",
            r"(\bEXEC\b|\bEXECUTE\b)",
            r"(\bxp_cmdshell\b)",
            r"(\bBENCHMARK\b\s*\()",
            r"(\bLOAD_FILE\b\s*\()",
            r"(\bINTO\s+OUTFILE\b)"
        ]
        
        self.xss_patterns = [
            r"(<script[\s\S]*?>)",
            r"(javascript\s*:)",
            r"(on\w+\s*=)",
            r"(<\s*img[^>]*onerror)",
            r"(<\s*svg[^>]*onload)",
            r"(document\.cookie)",
            r"(document\.write)",
            r"(window\.location)",
            r"(&#x[0-9a-fA-F]+;)",
            r"(%3Cscript)",
            r"(%3C%73%63%72%69%70%74)",
            r"(eval\s*\()",
            r"(<\s*iframe)",
            r"(<\s*object)",
            r"(<\s*embed)"
        ]
        
        self.path_traversal_patterns = [
            r"(\.\.\/){2,}",
            r"(%2e%2e%2f)",
            r"(etc\/passwd)",
            r"(etc\/shadow)",
            r"(windows\/system32)",
            r"(\.\.\\){2,}",
            r"(%252e%252e%252f)"
        ]
        
        self.brute_force_indicators = [
            r"(\/login)",
            r"(\/signin)",
            r"(\/auth)",
            r"(password\s*=)",
            r"(email\s*=.*password\s*=)"
        ]
        
        # Compile patterns for performance
        self.compiled_sql = [re.compile(p, re.I) for p in self.sql_patterns]
        self.compiled_xss = [re.compile(p, re.I) for p in self.xss_patterns]
        self.compiled_path = [re.compile(p, re.I) for p in self.path_traversal_patterns]
        self.compiled_brute = [re.compile(p, re.I) for p in self.brute_force_indicators]
        
        # SQL keywords for feature extraction
        self.sql_keywords = [
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
            'EXEC', 'UNION', 'JOIN', 'WHERE', 'FROM', 'TABLE', 'DATABASE',
            'SCRIPT', 'SLEEP', 'WAITFOR', 'DELAY', 'BENCHMARK', 'LOAD_FILE'
        ]
        
        # XSS indicators
        self.xss_indicators = [
            'script', 'javascript', 'onerror', 'onload', 'onclick', 'onmouseover',
            'alert', 'document.cookie', 'document.write', 'window.location', 'eval'
        ]
    
    async def init_redis(self, redis_url: str = "redis://localhost:6379"):
        """Initialize Redis connection"""
        try:
            self.redis = await redis.from_url(redis_url, decode_responses=True)
            await self.redis.ping()
            logger.info("✅ Redis connected for threat detection")
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis = None
    
    def load_models(self) -> bool:
        """Load all trained ML models"""
        try:
            # Load vectorizer
            with open(os.path.join(self.model_dir, "vectorizer.pkl"), 'rb') as f:
                self.vectorizer = pickle.load(f)
            
            # Load Logistic Regression
            with open(os.path.join(self.model_dir, "model_lr.pkl"), 'rb') as f:
                self.model_lr = pickle.load(f)
            
            # Load Random Forest
            with open(os.path.join(self.model_dir, "model_rf.pkl"), 'rb') as f:
                self.model_rf = pickle.load(f)
            
            # Load Isolation Forest
            with open(os.path.join(self.model_dir, "model_iso.pkl"), 'rb') as f:
                self.model_iso = pickle.load(f)
            
            self.models_loaded = True
            logger.info("✅ All ML models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load models: {e}")
            self.models_loaded = False
            return False
    
    async def detect_threat(self, request: Request) -> DetectionResult:
        """
        Main detection pipeline - 6 steps
        Returns DetectionResult with complete threat information
        """
        start_time = time.time()
        matched_patterns = []
        features_triggered = {}
        
        try:
            # STEP 1: IP Blocklist Check (0ms)
            ip = request.client.host
            if await self._is_ip_blocked(ip):
                inference_time = (time.time() - start_time) * 1000
                return DetectionResult(
                    threat_score=1.0,
                    action="BLOCKED",
                    attack_type="blocked_ip",
                    confidence=1.0,
                    detection_method="blocklist",
                    matched_patterns=["ip_in_blocklist"],
                    features_triggered={"blocked_ip": True},
                    inference_time_ms=inference_time,
                    recommendation=f"IP {ip} is permanently blocked"
                )
            
            # Extract request data
            request_data = await self._extract_request_data(request)
            combined_text = self._combine_text(request_data)
            
            # STEP 2: Rule-Based Layer (1-2ms)
            rule_result = self._rule_based_detection(combined_text)
            if rule_result:
                inference_time = (time.time() - start_time) * 1000
                self._update_stats("rule_based_block")
                
                # Log to Supabase
                await self._log_threat(request, rule_result, inference_time)
                
                return DetectionResult(
                    threat_score=1.0,
                    action="BLOCKED",
                    attack_type=rule_result["type"],
                    confidence=1.0,
                    detection_method="rule_based",
                    matched_patterns=rule_result["patterns"],
                    features_triggered=rule_result["features"],
                    inference_time_ms=inference_time,
                    recommendation="Immediate block - known attack pattern detected"
                )
            
            # STEP 3: Feature Extraction (5-10ms)
            features = self._extract_features(request_data, combined_text)
            
            # STEP 4: ML Ensemble (15-30ms)
            if self.models_loaded and features is not None:
                lr_score = self._get_lr_score(features)
                rf_score = self._get_rf_score(features)
                iso_score = self._get_iso_score(features)
                
                # Ensemble: 0.2*LR + 0.6*RF + 0.2*ISO
                threat_score = (0.2 * lr_score) + (0.6 * rf_score) + (0.2 * iso_score)
                
                # Determine attack type
                attack_type = self._classify_attack_type(combined_text, features)
                
                # STEP 5: Decision + Action
                if threat_score < 0.35:
                    action = "SAFE"
                    confidence = 1.0 - threat_score
                elif threat_score < 0.70:
                    action = "FLAGGED"
                    confidence = threat_score
                    self._update_stats("ml_flagged")
                else:
                    action = "BLOCKED"
                    confidence = threat_score
                    self._update_stats("ml_block")
                
                detection_method = "ml_ensemble"
                
            else:
                # Fallback if models not loaded
                threat_score = 0.0
                action = "SAFE"
                attack_type = "benign"
                confidence = 0.5
                detection_method = "fallback"
            
            # STEP 6: Prepare result
            inference_time = (time.time() - start_time) * 1000
            
            result = DetectionResult(
                threat_score=threat_score,
                action=action,
                attack_type=attack_type,
                confidence=confidence,
                detection_method=detection_method,
                matched_patterns=matched_patterns,
                features_triggered=features_triggered,
                inference_time_ms=inference_time
            )
            
            # Log if flagged or blocked
            if action in ["FLAGGED", "BLOCKED"]:
                await self._log_threat(request, {
                    "type": attack_type,
                    "score": threat_score,
                    "patterns": matched_patterns,
                    "features": features_triggered
                }, inference_time)
                
                # Increment threat counter in Redis
                if self.redis:
                    await self.redis.incr(f"threats:{ip}")
                    await self.redis.expire(f"threats:{ip}", 86400)
            
            self._update_stats("safe" if action == "SAFE" else "other")
            
            return result
            
        except Exception as e:
            logger.error(f"Detection error: {e}")
            inference_time = (time.time() - start_time) * 1000
            
            # Fail-safe: return SAFE on error
            return DetectionResult(
                threat_score=0.0,
                action="SAFE",
                attack_type="unknown",
                confidence=0.0,
                detection_method="error",
                matched_patterns=[],
                features_triggered={"error": str(e)},
                inference_time_ms=inference_time,
                recommendation="Detection error - allowing request"
            )
    
    async def _is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is in blocklist"""
        if not self.redis:
            return False
        try:
            return await self.redis.sismember("blocked_ips", ip)
        except:
            return False
    
    async def _extract_request_data(self, request: Request) -> Dict[str, Any]:
        """Extract all request data for analysis"""
        data = {
            "uri": str(request.url.path),
            "method": request.method,
            "query_params": str(request.url.query) if request.url.query else "",
            "headers": str(dict(request.headers)),
            "user_agent": request.headers.get("user-agent", ""),
            "content_type": request.headers.get("content-type", ""),
        }
        
        # Try to get body
        try:
            body = await request.body()
            data["body"] = body.decode('utf-8', errors='ignore') if body else ""
        except:
            data["body"] = ""
        
        return data
    
    def _combine_text(self, request_data: Dict[str, Any]) -> str:
        """Combine all request text components"""
        parts = [
            request_data.get("method", ""),
            request_data.get("uri", ""),
            request_data.get("query_params", ""),
            request_data.get("body", ""),
            request_data.get("user_agent", "")
        ]
        return " ".join(filter(None, parts))
    
    def _rule_based_detection(self, text: str) -> Optional[Dict]:
        """Fast rule-based detection"""
        text_lower = text.lower()
        matched = []
        
        # Check SQL patterns
        for i, pattern in enumerate(self.compiled_sql):
            if pattern.search(text):
                matched.append(f"sql_pattern_{i+1}")
                if len(matched) >= 2:  # Multiple SQL patterns = high confidence
                    return {
                        "type": "sqli",
                        "patterns": matched,
                        "features": {"sql_patterns_matched": len(matched)}
                    }
        
        # Check XSS patterns
        for i, pattern in enumerate(self.compiled_xss):
            if pattern.search(text):
                matched.append(f"xss_pattern_{i+1}")
                if len(matched) >= 2:
                    return {
                        "type": "xss",
                        "patterns": matched,
                        "features": {"xss_patterns_matched": len(matched)}
                    }
        
        # Check path traversal
        for i, pattern in enumerate(self.compiled_path):
            if pattern.search(text):
                return {
                    "type": "path_traversal",
                    "patterns": [f"path_pattern_{i+1}"],
                    "features": {"path_traversal_detected": True}
                }
        
        # Check brute force indicators (with frequency)
        brute_matches = sum(1 for p in self.compiled_brute if p.search(text))
        if brute_matches >= 3:
            return {
                "type": "brute_force",
                "patterns": ["multiple_auth_indicators"],
                "features": {"auth_indicators": brute_matches}
            }
        
        return None
    
    def _extract_features(self, request_data: Dict[str, Any], combined_text: str) -> Optional[csr_matrix]:
        """Extract features for ML models"""
        try:
            if not self.vectorizer:
                return None
            
            # Text features
            text_features = self.vectorizer.transform([combined_text])
            
            # Statistical features
            stat_features = self._extract_statistical_features(request_data, combined_text)
            
            # Combine
            combined = hstack([text_features, csr_matrix(stat_features)])
            return combined
            
        except Exception as e:
            logger.error(f"Feature extraction error: {e}")
            return None
    
    def _extract_statistical_features(self, request_data: Dict[str, Any], text: str) -> np.ndarray:
        """Extract statistical features"""
        features = []
        
        # 1-2. Length features
        features.append(len(request_data.get("body", "")))
        features.append(len(request_data.get("uri", "")))
        
        # 3. Special char count
        special_chars = ["'", '"', ';', '--', '=', '<', '>', '(', ')']
        features.append(sum(1 for c in text if c in special_chars))
        
        # 4. SQL keyword count
        text_upper = text.upper()
        features.append(sum(1 for kw in self.sql_keywords if kw in text_upper))
        
        # 5. XSS indicator count
        text_lower = text.lower()
        features.append(sum(1 for ind in self.xss_indicators if ind in text_lower))
        
        # 6-7. Ratios
        if len(text) > 0:
            features.append(sum(1 for c in text if c.isdigit()) / len(text))
            features.append(sum(1 for c in text if c.isupper()) / len(text))
        else:
            features.extend([0.0, 0.0])
        
        # 8. Param count
        query = request_data.get("query_params", "")
        features.append(len(query.split('&')) if query else 0)
        
        # 9. Encoding detected
        encoding_found = any(
            re.search(p, text) 
            for p in [r'%[0-9A-Fa-f]{2}', r'&#x[0-9a-fA-F]+;', r'\x[0-9a-fA-F]{2}']
        )
        features.append(1 if encoding_found else 0)
        
        # 10. Suspicious patterns
        suspicious = [
            r'1\s*=\s*1', r'OR\s+1\s*=\s*1', r'<script', r'javascript:',
            r'UNION\s+SELECT', r'DROP\s+TABLE'
        ]
        features.append(sum(1 for p in suspicious if re.search(p, text, re.I)))
        
        return np.array(features, dtype=np.float32).reshape(1, -1)
    
    def _get_lr_score(self, features: csr_matrix) -> float:
        """Get Logistic Regression score"""
        if self.model_lr:
            proba = self.model_lr.predict_proba(features)[0]
            return proba[1]  # Probability of threat class
        return 0.5
    
    def _get_rf_score(self, features: csr_matrix) -> float:
        """Get Random Forest score"""
        if self.model_rf:
            proba = self.model_rf.predict_proba(features)[0]
            return proba[1]
        return 0.5
    
    def _get_iso_score(self, features: csr_matrix) -> float:
        """Get Isolation Forest score (normalized to 0-1)"""
        if self.model_iso:
            # IsolationForest returns anomaly scores (negative = anomaly)
            score = self.model_iso.decision_function(features)[0]
            # Normalize: -0.5 (anomaly) -> 1.0, 0.5 (normal) -> 0.0
            normalized = 1.0 - (score + 0.5)
            return max(0.0, min(1.0, normalized))
        return 0.5
    
    def _classify_attack_type(self, text: str, features: csr_matrix) -> str:
        """Classify specific attack type"""
        text_lower = text.lower()
        text_upper = text.upper()
        
        # Count pattern matches
        sql_count = sum(1 for p in self.compiled_sql if p.search(text))
        xss_count = sum(1 for p in self.compiled_xss if p.search(text))
        path_count = sum(1 for p in self.compiled_path if p.search(text))
        
        # Determine type
        if sql_count > xss_count and sql_count > path_count:
            return "sqli"
        elif xss_count > sql_count and xss_count > path_count:
            return "xss"
        elif path_count > 0:
            return "path_traversal"
        elif any(ind in text_lower for ind in ['password', 'login', 'auth']):
            return "brute_force"
        else:
            return "unknown"
    
    async def _log_threat(self, request: Request, detection: Dict, inference_time: float):
        """Log threat to Supabase"""
        try:
            from supabase_logger import log_threat_event
            
            await log_threat_event(
                ip=request.client.host,
                endpoint=request.url.path,
                method=request.method,
                threat_score=detection.get("score", 1.0),
                attack_type=detection.get("type", "unknown"),
                action="BLOCKED",
                detection_method="rule_based" if detection.get("patterns") else "ml_ensemble",
                matched_patterns=detection.get("patterns", []),
                payload_preview=str(await request.body())[:200] if request.body else "",
                inference_time_ms=int(inference_time),
                risk_tier="HIGH" if detection.get("score", 0) > 0.8 else "MEDIUM",
                user_agent=request.headers.get("user-agent", "")
            )
        except Exception as e:
            logger.error(f"Failed to log threat: {e}")
    
    def _update_stats(self, detection_type: str):
        """Update detection statistics"""
        self.stats["total_detections"] += 1
        
        if detection_type == "rule_based_block":
            self.stats["rule_based_blocks"] += 1
        elif detection_type == "ml_block":
            self.stats["ml_blocks"] += 1
        elif detection_type == "ml_flagged":
            self.stats["ml_flagged"] += 1
        elif detection_type == "safe":
            self.stats["safe_requests"] += 1
    
    def get_stats(self) -> Dict:
        """Get detection statistics"""
        return {
            **self.stats,
            "models_loaded": self.models_loaded,
            "redis_connected": self.redis is not None
        }

# Global detector instance
malicious_detector = MaliciousDetector()

# Initialization
async def init_detector(redis_url: str = "redis://localhost:6379"):
    """Initialize the detector"""
    await malicious_detector.init_redis(redis_url)
    malicious_detector.load_models()

# FastAPI middleware
async def detection_middleware(request: Request, call_next):
    """FastAPI middleware for threat detection"""
    result = await malicious_detector.detect_threat(request)
    
    # Add headers to response
    response = await call_next(request)
    response.headers["X-Threat-Score"] = f"{result.threat_score:.2f}"
    response.headers["X-Threat-Action"] = result.action
    response.headers["X-Threat-Type"] = result.attack_type
    response.headers["X-Detection-Method"] = result.detection_method
    response.headers["X-Inference-Time-Ms"] = f"{result.inference_time_ms:.2f}"
    
    # Block if necessary
    if result.action == "BLOCKED":
        raise HTTPException(
            status_code=403,
            detail=f"Request blocked: {result.attack_type} attack detected",
            headers={
                "X-Threat-Score": f"{result.threat_score:.2f}",
                "X-Block-Reason": result.attack_type
            }
        )
    
    return response
