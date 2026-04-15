#!/usr/bin/env python3
"""
ML Threat Detection - Conference Paper Implementation
Hybrid Rule-based + ML approach with <50ms inference
"""

import os
import pickle
import time
import logging
import re
import json
from typing import Dict, Tuple, Optional
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from fastapi import Request, HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

class ThreatScore:
    """Threat detection result with confidence and action"""
    
    def __init__(self, score: float, confidence: float, action: str, threat_type: str = ""):
        self.score = score  # 0.0 to 1.0
        self.confidence = confidence  # 0.0 to 1.0
        self.action = action  # "SAFE", "FLAGGED", "BLOCKED"
        self.threat_type = threat_type  # "sql_injection", "xss", "brute_force", "ml_detected"
        self.inference_time_ms = 0.0
        self.detection_method = ""  # "rule_based", "ml_model", "hybrid"

class HybridThreatDetector:
    """Hybrid Rule-based + ML Threat Detection System"""
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.vectorizer = None
        self.random_forest_model = None
        self.logistic_model = None
        self.best_model = None
        self.model_loaded = False
        
        # Rule-based patterns (Section VI-D of paper)
        self.sql_injection_patterns = [
            r"(?i)(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)",
            r"(?i)(\bOR\b\s+\d+\s*=\s*\d+)",
            r"(?i)(\bAND\b\s+\d+\s*=\s*\d+)",
            r"(?i)(['\"]\s*OR\s*['\"]\w*['\"]\s*=\s*['\"]\w*['\"])",
            r"(?i)(['\"]\s*AND\s*['\"]\w*['\"]\s*=\s*['\"]\w*['\"])",
            r"(?i)(--|#|\/\*|\*\/)",
            r"(?i)(\bUNION\b.*\bSELECT\b)",
            r"(?i)(\bEXEC\b\s*\(|\bxp_cmdshell\b)",
            r"(?i)(\bWAITFOR\b\s+DELAY\b)",
            r"(?i)(\bCAST\b\s*\(|\bCONVERT\b\s*\()"
        ]
        
        self.xss_patterns = [
            r"(?i)(<script[^>]*>.*?</script>)",
            r"(?i)(<iframe[^>]*>.*?</iframe>)",
            r"(?i)(javascript:)",
            r"(?i)(on\w+\s*=)",
            r"(?i)(<img[^>]*onerror\s*=)",
            r"(?i)(<body[^>]*onload\s*=)",
            r"(?i)(<svg[^>]*onload\s*=)",
            r"(?i)(<video[^>]*onerror\s*=)",
            r"(?i)(<audio[^>]*onerror\s*=)",
            r"(?i)(eval\s*\()",
            r"(?i)(alert\s*\()",
            r"(?i)(document\.\w+)",
            r"(?i)(window\.\w+)",
            r"(?i)(location\.\w+)",
            r"(?i)(String\.fromCharCode)"
        ]
        
        self.brute_force_patterns = [
            r"(?i)(admin|root|test|guest|user\d*)",
            r"(?i)(123456|password|qwerty|abc123|letmein|admin123)",
            r"(?i)(['\"]?\w{3,8}['\"]?\s*=\s*['\"]?\w{3,8}['\"]?)",
            r"(?i)(login|signin|auth|authenticate)"
        ]
        
        # Compile regex patterns for performance
        self.compiled_sql_patterns = [re.compile(pattern) for pattern in self.sql_injection_patterns]
        self.compiled_xss_patterns = [re.compile(pattern) for pattern in self.xss_patterns]
        self.compiled_brute_patterns = [re.compile(pattern) for pattern in self.brute_force_patterns]
        
        # Performance tracking
        self.detection_stats = {
            "total_detections": 0,
            "rule_based_blocks": 0,
            "ml_blocks": 0,
            "flagged_requests": 0,
            "safe_requests": 0,
            "avg_inference_time_ms": 0.0,
            "last_reset": datetime.now()
        }
    
    def load_models(self) -> bool:
        """Load trained ML models and vectorizer"""
        try:
            # Load vectorizer
            vectorizer_path = os.path.join(self.model_dir, "vectorizer.pkl")
            withei open(vectorizer_path, 'rb') as f:
                self.vectorizer = pickle.load(f)
            
            # Load Random Forest (best model from paper)
            rf_path = os.path.join(self.model_dir, "random_forest_model.pkl")
            with open(rf_path, 'rb') as f:
                self.random_forest_model = pickle.load(f)
            
            # Load Logistic Regression
            logistic_path = os.path.join(self.model_dir, "logistic_model.pkl")
            with open(logistic_path, 'rb') as f:
                self.logistic_model = pickle.load(f)
            
            # Use Random Forest as best model (paper shows better performance)
            self.best_model = self.random_forest_model
            
            # Load metadata
            metadata_path = os.path.join(self.model_dir, "model_metadata.json")
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            self.model_loaded = True
            logger.info("✅ ML models loaded successfully")
            logger.info(f"📊 Model trained at: {metadata.get('trained_at')}")
            logger.info(f"🎯 Model accuracy: {metadata.get('metrics', {}).get('random_forest', {}).get('accuracy', 'N/A')}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load ML models: {e}")
            self.model_loaded = False
            return False
    
    def extract_features(self, request: Request) -> str:
        """Extract features from request for ML model"""
        try:
            # Get request components
            method = request.method
            url = str(request.url)
            query_string = request.url.query if request.url.query else ""
            
            # Get body (async safe)
            body = ""
            if hasattr(request, '_body'):
                body = request._body.decode('utf-8', errors='ignore') if request._body else ""
            else:
                body = ""
            
            # Get headers
            user_agent = request.headers.get("user-agent", "")
            content_type = request.headers.get("content-type", "")
            referer = request.headers.get("referer", "")
            
            # Combine all features (as specified in paper)
            feature_text = f"{method} {url} {query_string} {body} {user_agent} {content_type} {referer}"
            
            return feature_text.strip()
            
        except Exception as e:
            logger.error(f"Feature extraction error: {e}")
            return f"{request.method} {str(request.url)}"
    
    def rule_based_detection(self, feature_text: str) -> Optional[ThreatScore]:
        """Fast rule-based detection (runs before ML for speed)"""
        try:
            # SQL Injection detection
            for i, pattern in enumerate(self.compiled_sql_patterns):
                if pattern.search(feature_text):
                    logger.warning(f"🔍 SQL Injection detected (pattern {i+1})")
                    return ThreatScore(
                        score=1.0,
                        confidence=1.0,
                        action="BLOCKED",
                        threat_type="sql_injection",
                        detection_method="rule_based"
                    )
            
            # XSS detection
            for i, pattern in enumerate(self.compiled_xss_patterns):
                if pattern.search(feature_text):
                    logger.warning(f"🔍 XSS detected (pattern {i+1})")
                    return ThreatScore(
                        score=1.0,
                        confidence=1.0,
                        action="BLOCKED",
                        threat_type="xss",
                        detection_method="rule_based"
                    )
            
            # Brute force detection
            brute_matches = 0
            for pattern in self.compiled_brute_patterns:
                if pattern.search(feature_text):
                    brute_matches += 1
            
            if brute_matches >= 2:  # Multiple patterns indicate brute force
                logger.warning(f"🔍 Brute force detected ({brute_matches} patterns)")
                return ThreatScore(
                    score=1.0,
                    confidence=0.9,
                    action="BLOCKED",
                    threat_type="brute_force",
                    detection_method="rule_based"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Rule-based detection error: {e}")
            return None
    
    def ml_detection(self, feature_text: str) -> Optional[ThreatScore]:
        """ML-based threat detection"""
        if not self.model_loaded:
            logger.warning("ML models not loaded, skipping ML detection")
            return None
        
        try:
            # Transform features
            X = self.vectorizer.transform([feature_text])
            
            # Get prediction probabilities from best model
            threat_probability = self.best_model.predict_proba(X)[0][1]
            
            # Get confidence (distance from decision boundary)
            if hasattr(self.best_model, 'predict_proba'):
                # Higher confidence when probability is closer to 0 or 1
                confidence = max(threat_probability, 1 - threat_probability)
            else:
                confidence = 0.5
            
            # Determine action based on thresholds (paper thresholds)
            if threat_probability < 0.35:
                action = "SAFE"
                threat_type = ""
            elif threat_probability < 0.70:
                action = "FLAGGED"
                threat_type = "ml_detected"
            else:
                action = "BLOCKED"
                threat_type = "ml_detected"
            
            return ThreatScore(
                score=threat_probability,
                confidence=confidence,
                action=action,
                threat_type=threat_type,
                detection_method="ml_model"
            )
            
        except Exception as e:
            logger.error(f"ML detection error: {e}")
            return None
    
    def detect_threat(self, request: Request) -> ThreatScore:
        """
        Main threat detection function
        Hybrid approach: Rule-based first, then ML
        Target: <50ms inference time
        """
        start_time = time.time()
        
        try:
            # Extract features
            feature_text = self.extract_features(request)
            
            # Step 1: Rule-based detection (fast, runs first)
            rule_result = self.rule_basedi_detection(feature_text)
            if rule_result:
                rule_result.inference_time_ms = (time.time() - start_time) * 1000
                self._update_stats(rule_result)
                return rule_result
            
            # Step 2: ML detection (if rule-based didn't block)
            ml_result = self.ml_detection(feature_text)
            if ml_result:
                ml_result.inference_time_ms = (time.time() - start_time) * 1000
                self._update_stats(ml_result)
                return ml_result
            
            # Default: Safe if no threats detected
            safe_result = ThreatScore(
                score=0.0,
                confidence=0.8,
                action="SAFE",
                detection_method="default"
            )
            safe_result.inference_time_ms = (time.time() - start_time) * 1000
            self._update_stats(safe_result)
            
            return safe_result
            
        except Exception as e:
            logger.error(f"Threat detection error: {e}")
            # Fail-safe: allow request but log error
            error_result = ThreatScore(
                score=0.0,
                confidence=0.0,
                action="SAFE",
                detection_method="error"
            )
            error_result.inference_time_ms = (time.time() - start_time) * 1000
            return error_result
    
    def _update_stats(self, result: ThreatScore):
        """Update detection statistics"""
        self.detection_stats["total_detections"] += 1
        
        if result.action == "BLOCKED":
            if result.detection_method == "rule_based":
                self.detection_stats["rule_based_blocks"] += 1
            else:
                self.detection_stats["ml_blocks"] += 1
        elif result.action == "FLAGGED":
            self.detection_stats["flagged_requests"] += 1
        else:
            self.detection_stats["safe_requests"] += 1
        
        # Update average inference time
        total = self.detection_stats["total_detections"]
        current_avg = self.detection_stats["avg_inference_time_ms"]
        self.detection_stats["avg_inference_time_ms"] = (
            (current_avg * (total - 1) + result.inference_time_ms) / total
        )
    
    def get_detection_stats(self) -> Dict:
        """Get current detection statistics"""
        return {
            **self.detection_stats,
            "model_loaded": self.model_loaded,
            "uptime_hours": (datetime.now() - self.detection_stats["last_reset"]).total_seconds() / 3600
        }
    
    def reset_stats(self):
        """Reset detection statistics"""
        self.detection_stats = {
            "total_detections": 0,
            "rule_based_blocks": 0,
            "ml_blocks": 0,
            "flagged_requests": 0,
            "safe_requests": 0,
            "avg_inference_time_ms": 0.0,
            "last_reset": datetime.now()
        }
        logger.info("Detection statistics reset")

# Global detector instance
detector = HybridThreatDetector()

async def init_threat_detector():
    """Initialize threat detector (call on app startup)"""
    success = detector.load_models()
    if success:
        logger.info("🛡️ Threat detector initialized successfully")
    else:
        logger.warning("⚠️ Threat detector initialization failed, using rule-based only")
    return success

def detect_threat(request: Request) -> ThreatScore:
    """
    Global threat detection function
    Returns ThreatScore with action: SAFE, FLAGGED, or BLOCKED
    """
    return detector.detect_threat(request)

def get_threat_stats() -> Dict:
    """Get threat detection statistics"""
    return detector.get_detection_stats()

# Middleware integration helper
async def threat_middleware(request: Request, call_next):
    """
    FastAPI middleware for threat detection
    Usage: app.middleware("http")(threat_middleware)
    """
    # Perform threat detection
    threat_result = detect_threat(request)
    
    # Add threat info to request state for logging
    request.state.threat_score = threat_result.score
    request.state.threat_action = threat_result.action
    request.state.threat_type = threat_result.threat_type
    request.state.inference_time = threat_result.inference_time_ms
    
    # Block malicious requests
    if threat_result.action == "BLOCKED":
        logger.warning(f"🚫 Request BLOCKED - Threat: {threat_result.threat_type}, Score: {threat_result.score:.3f}")
        
        # Log to Supabase
        try:
            from supabase_logger import log_rate_limit_event
            await log_rate_limit_event(
                ip=request.client.host,
                endpoint=request.url.path,
                method=request.method,
                action="blocked_threat",
                requests_made=1,
                limit_max=1,
                remaining=0,
                threat_score=threat_result.score,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as e:
            logger.error(f"Failed to log threat to Supabase: {e}")
        
        raise HTTPException(
            status_code=403,
            detail="Request blocked due to suspicious activity",
            headers={
                "X-Threat-Score": str(threat_result.score),
                "X-Threat-Type": threat_result.threat_type,
                "X-Inference-Time": f"{threat_result.inference_time_ms:.2f}ms"
            }
        )
    
    # Flagged requests are allowed but logged
    elif threat_result.action == "FLAGGED":
        logger.warning(f"⚠️ Request FLAGGED - Threat: {threat_result.threat_type}, Score: {threat_result.score:.3f}")
        
        # Add warning headers
        response = await call_next(request)
        response.headers["X-Threat-Score"] = str(threat_result.score)
        response.headers["X-Threat-Action"] = "flagged"
        response.headers["X-Inference-Time"] = f"{threat_result.inference_time_ms:.2f}ms"
        
        return response
    
    # Safe requests proceed normally
    else:
        response = await call_next(request)
        response.headers["X-Threat-Score"] = str(threat_result.score)
        response.headers["X-Inference-Time"] = f"{threat_result.inference_time_ms:.2f}ms"
        
        return response

# Performance monitoring
def check_performance() -> Dict:
    """Check if detection meets paper requirements (<50ms, >92% accuracy)"""
    stats = detector.get_detection_stats()
    
    performance = {
        "avg_inference_time_ms": stats["avg_inference_time_ms"],
        "target_inference_time_ms": 50.0,
        "inference_within_target": stats["avg_inference_time_ms"] < 50.0,
        "total_detections": stats["total_detections"],
        "block_rate": (stats["rule_based_blocks"] + stats["ml_blocks"]) / max(stats["total_detections"], 1),
        "model_loaded": stats["model_loaded"]
    }
    
    logger.info(f"📊 Performance Check: {performance['avg_inference_time_ms']:.2f}ms (target: <50ms)")
    
    return performance

if __name__ == "__main__":
    # Test the detector
    import asyncio
    
    async def test_detector():
        await init_threat_detector()
        
        # Create mock request
        class MockRequest:
            def __init__(self, url, method="GET", body="", headers=None):
                self.url = url
                self.method = method
                self._body = body.encode() if body else b""
                self.headers = headers or {}
            
            @property
            def client(self):
                class Client:
                    host = "127.0.0.ei"
                return Client()
        
        # Test cases
        test_cases = [
            ("http://localhost:5001/api/products", "GET", "", {"user-agent": "Mozilla/5.0"}),  # Safe
            ("http://localhost:5001/api/users?id=1' OR '1'='1", "GET", "", {"user-agent": "sqlmap"}),  # SQLi
            ("http://localhost:5001/api/comments?text=<script>alert('xss')</script>", "POST", "", {"user-agent": "Mozilla"}),  # XSS
        ]
        
        for url, method, body, headers in test_cases:
            request = MockRequest(url, method, body, headers)
            result = detect_threat(request)
            
            print(f"URL: {url}")
            print(f"Action: {result.action}")
            print(f"Score: {result.score:.3f}")
            print(f"Type: {result.threat_type}")
            print(f"Inference: {result.inference_time_ms:.2f}ms")
            print("-" * 50)
        
        # Print stats
        stats = get_threat_stats()
        print(f"Total detections: {stats['total_detections']}")
        print(f"Average inference time: {stats['avg_inference_time_ms']:.2f}ms")
        print(f"Rule-based blocks: {stats['rule_based_blocks']}")
        print(f"ML blocks: {stats['ml_blocks']}")
    
    asyncio.run(test_detector())
