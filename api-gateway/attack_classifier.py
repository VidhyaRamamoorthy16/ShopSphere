#!/usr/bin/env python3
"""
Attack Type Classifier
Multi-class classification for attack categorization
"""

import os
import pickle
import re
import logging
from typing import Dict, List, Tuple, Optional
import numpy as np
from sklearn.multiclass import OneVsRestClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from scipy.sparse import csr_matrix

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

class AttackClassifier:
    """
    Multi-class classifier for attack type identification
    Classes: benign, sqli, xss, brute_force, path_traversal, unknown
    """
    
    ATTACK_TYPES = [
        "benign",
        "sqli", 
        "xss",
        "brute_force",
        "path_traversal",
        "unknown"
    ]
    
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.classifier = None
        self.vectorizer = None
        self.models_loaded = False
        
        # Attack type indicators
        self.attack_indicators = {
            "sqli": [
                r'\bUNION\b.*\bSELECT\b', r'\bDROP\b.*\bTABLE\b',
                r"'\s*OR\s*'", r'"\s*OR\s*"', r'1\s*=\s*1',
                r'--', r'/\*', r'xp_cmdshell', r'SLEEP\s*\(',
                r'BENCHMARK\s*\(', r'INTO\s+OUTFILE'
            ],
            "xss": [
                r'<script', r'javascript:', r'on\w+\s*=',
                r'document\.cookie', r'alert\s*\(', r'eval\s*\(',
                r'<\s*iframe', r'<\s*object', r'<\s*embed',
                r'&#x[0-9a-f]+;', r'%3Cscript'
            ],
            "brute_force": [
                r'password\s*=', r'passwd\s*=', r'login\s*=',
                r'rapid_requests', r'sequential_login',
                r'dictionary_attack'
            ],
            "path_traversal": [
                r'\.\./', r'%2e%2e%2f', r'etc/passwd',
                r'etc/shadow', r'windows/system32',
                r'%252e%252e%252f', r'\.\.\\'
            ]
        }
    
    def train_classifier(self, X, y, vectorizer):
        """
        Train multi-class attack type classifier
        """
        logger.info("Training multi-class attack classifier...")
        
        self.vectorizer = vectorizer
        
        # One-vs-Rest Random Forest
        base_estimator = RandomForestClassifier(
            n_estimators=50,
            max_depth=10,
            min_samples_split=5,
            n_jobs=-1,
            random_state=42
        )
        
        self.classifier = OneVsRestClassifier(base_estimator)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train
        self.classifier.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.classifier.predict(X_test)
        
        # Print report
        logger.info("\n=== Attack Type Classification Report ===")
        logger.info(classification_report(y_test, y_pred, target_names=self.ATTACK_TYPES))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        logger.info("\nConfusion Matrix:")
        logger.info(cm)
        
        self.models_loaded = True
        logger.info("✅ Attack classifier trained successfully")
        
        return self.classifier
    
    def classify_attack(self, request_data: Dict, threat_score: float) -> Dict:
        """
        Classify attack type with confidence
        Returns detailed classification result
        """
        if threat_score < 0.35:
            return {
                "threat_score": threat_score,
                "attack_type": "benign",
                "confidence": 1.0 - threat_score,
                "matched_patterns": [],
                "features_triggered": {},
                "action": "SAFE",
                "recommendation": "Allow request"
            }
        
        # Combine request text
        combined_text = self._combine_text(request_data)
        
        # Rule-based classification first
        rule_result = self._rule_based_classification(combined_text)
        
        if rule_result["attack_type"] != "unknown":
            # Use rule-based result
            return {
                "threat_score": threat_score,
                **rule_result,
                "action": "BLOCKED" if threat_score >= 0.70 else "FLAGGED"
            }
        
        # ML-based classification
        if self.models_loaded and self.classifier and self.vectorizer:
            features = self.vectorizer.transform([combined_text])
            prediction = self.classifier.predict(features)[0]
            probabilities = self.classifier.predict_proba(features)[0]
            
            attack_type = self.ATTACK_TYPES[prediction]
            confidence = probabilities[prediction]
        else:
            attack_type = "unknown"
            confidence = 0.5
        
        # Get triggered features
        features_triggered = self._extract_triggered_features(combined_text, request_data)
        
        return {
            "threat_score": threat_score,
            "attack_type": attack_type,
            "confidence": confidence,
            "matched_patterns": rule_result.get("matched_patterns", []),
            "features_triggered": features_triggered,
            "action": "BLOCKED" if threat_score >= 0.70 else "FLAGGED",
            "recommendation": self._generate_recommendation(attack_type, request_data)
        }
    
    def _rule_based_classification(self, text: str) -> Dict:
        """Fast rule-based attack classification"""
        text_lower = text.lower()
        matched_patterns = []
        
        scores = {}
        
        for attack_type, patterns in self.attack_indicators.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text, re.I):
                    score += 1
                    matched_patterns.append(f"{attack_type}:{pattern}")
            scores[attack_type] = score
        
        # Determine type with highest score
        if scores:
            best_type = max(scores, key=scores.get)
            if scores[best_type] > 0:
                return {
                    "attack_type": best_type,
                    "matched_patterns": matched_patterns,
                    "confidence": min(1.0, scores[best_type] * 0.3)
                }
        
        return {
            "attack_type": "unknown",
            "matched_patterns": [],
            "confidence": 0.0
        }
    
    def _combine_text(self, request_data: Dict) -> str:
        """Combine request data into single text"""
        parts = [
            request_data.get("method", ""),
            request_data.get("uri", ""),
            request_data.get("query_params", ""),
            request_data.get("body", ""),
            request_data.get("headers", "")
        ]
        return " ".join(filter(None, parts))
    
    def _extract_triggered_features(self, text: str, request_data: Dict) -> Dict:
        """Extract which specific features triggered detection"""
        features = {}
        
        # SQL features
        text_upper = text.upper()
        sql_count = sum(1 for kw in ['SELECT', 'UNION', 'DROP', 'INSERT', 'DELETE'] if kw in text_upper)
        if sql_count > 0:
            features["sql_keyword_count"] = sql_count
        
        # XSS features
        text_lower = text.lower()
        xss_indicators = ['script', 'javascript', 'onerror', 'alert', 'document.cookie']
        xss_count = sum(1 for ind in xss_indicators if ind in text_lower)
        if xss_count > 0:
            features["xss_indicator_count"] = xss_count
        
        # Special chars
        special_chars = ["'", '"', ';', '--', '<', '>', '(', ")"]
        special_count = sum(1 for c in text if c in special_chars)
        if special_count > 3:
            features["special_char_count"] = special_count
        
        # Request frequency
        if request_data.get("request_frequency", 0) > 10:
            features["high_frequency"] = request_data["request_frequency"]
        
        return features
    
    def _generate_recommendation(self, attack_type: str, request_data: Dict) -> str:
        """Generate recommendation based on attack type"""
        ip = request_data.get("ip", "unknown")
        
        recommendations = {
            "sqli": f"SQL Injection detected. Block IP {ip} and review database access logs.",
            "xss": f"XSS attack detected. Implement Content Security Policy and sanitize inputs.",
            "brute_force": f"Brute force attack from {ip}. Implement CAPTCHA or add to rate limit blocklist.",
            "path_traversal": f"Path traversal attempt. Restrict file system access and validate paths.",
            "unknown": f"Suspicious activity detected. Monitor IP {ip} for further threats.",
            "benign": "No threats detected. Continue normal operations."
        }
        
        return recommendations.get(attack_type, "Review request for potential threats.")
    
    def save_models(self):
        """Save trained classifier"""
        try:
            path = os.path.join(self.model_dir, "attack_classifier.pkl")
            with open(path, 'wb') as f:
                pickle.dump(self.classifier, f)
            logger.info(f"✅ Attack classifier saved to {path}")
        except Exception as e:
            logger.error(f"❌ Failed to save classifier: {e}")
    
    def load_models(self) -> bool:
        """Load trained classifier"""
        try:
            path = os.path.join(self.model_dir, "attack_classifier.pkl")
            with open(path, 'rb') as f:
                self.classifier = pickle.load(f)
            
            # Load vectorizer
            vec_path = os.path.join(self.model_dir, "vectorizer.pkl")
            with open(vec_path, 'rb') as f:
                self.vectorizer = pickle.load(f)
            
            self.models_loaded = True
            logger.info("✅ Attack classifier loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load classifier: {e}")
            return False

# Global instance
attack_classifier = AttackClassifier()

def classify_attack(request_data: Dict, threat_score: float) -> Dict:
    """Convenience function for attack classification"""
    return attack_classifier.classify_attack(request_data, threat_score)

# Training utilities
class AttackDatasetBuilder:
    """Build labeled dataset for attack classification training"""
    
    @staticmethod
    def create_labeled_dataset() -> Tuple[List[str], List[int]]:
        """Create training data for 6-class classification"""
        
        # Benign samples
        benign_samples = [
            "GET /api/products Mozilla/5.0",
            "POST /api/cart {\"id\": 123}",
            "GET /api/users/1",
            "POST /api/orders {\"items\": []}",
        ] * 200  # 800 benign
        
        # SQLi samples
        sqli_samples = [
            "GET /api/users?id=1' OR '1'='1",
            "POST /api/login {\"user\": \"admin'--\"}",
            "GET /api/search?q=1' UNION SELECT * FROM users--",
            "POST /api/query {\"sql\": \"DROP TABLE users\"}",
        ] * 50  # 200 sqli
        
        # XSS samples
        xss_samples = [
            "GET /api/comments?text=<script>alert(1)</script>",
            "POST /api/profile {\"name\": \"<img src=x onerror=alert(1)>\"}",
            "GET /api/page?content=javascript:alert(1)",
            "POST /api/comment {\"text\": \"<svg onload=alert(1)>\"}",
        ] * 50  # 200 xss
        
        # Brute force samples
        brute_samples = [
            "POST /api/login {\"email\": \"admin@example.com\", \"password\": \"123456\"}",
            "POST /api/login {\"email\": \"admin\", \"password\": \"password\"}",
            "POST /api/auth {\"user\": \"admin\", \"pass\": \"admin123\"}",
        ] * 67  # 201 brute force
        
        # Path traversal samples
        path_samples = [
            "GET /api/file?path=../../../etc/passwd",
            "GET /api/download?file=..\\..\\windows\\system32\\config\\sam",
            "POST /api/upload {\"path\": \"../../etc/shadow\"}",
        ] * 34  # 102 path traversal
        
        # Combine all samples
        all_samples = benign_samples + sqli_samples + xss_samples + brute_samples + path_samples
        
        # Create labels
        labels = (
            [0] * len(benign_samples) +      # benign = 0
            [1] * len(sqli_samples) +        # sqli = 1
            [2] * len(xss_samples) +         # xss = 2
            [3] * len(brute_samples) +       # brute_force = 3
            [4] * len(path_samples)          # path_traversal = 4
        )
        
        return all_samples, labels

if __name__ == "__main__":
    # Test classification
    test_request = {
        "uri": "/api/users?id=1' OR '1'='1",
        "method": "GET",
        "body": "",
        "query_params": "id=1' OR '1'='1",
        "headers": "User-Agent: Mozilla/5.0",
        "ip": "192.168.1.1",
        "request_frequency": 5
    }
    
    result = classify_attack(test_request, 0.85)
    
    print("\n=== Attack Classification Result ===")
    print(f"Threat Score: {result['threat_score']}")
    print(f"Attack Type: {result['attack_type']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Action: {result['action']}")
    print(f"Matched Patterns: {result['matched_patterns']}")
    print(f"Features Triggered: {result['features_triggered']}")
    print(f"Recommendation: {result['recommendation']}")
