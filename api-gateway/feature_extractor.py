#!/usr/bin/env python3
"""
Feature Extractor - Conference Paper Implementation
Complete feature engineering pipeline for threat detection
"""

import re
import logging
import asyncio
import redis.asyncio as redis
from typing import Dict, List, Tuple, Any, Optional
from collections import Counter
import numpy as np
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import CountVectorizer
import time
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

class FeatureExtractor:
    """Complete feature extraction pipeline"""
    
    def __init__(self, vectorizer: CountVectorizer = None, redis_client: redis.Redis = None):
        self.vectorizer = vectorizer
        self.redis = redis_client
        
        # SQL keywords to count
        self.sql_keywords = [
            'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
            'EXEC', 'UNION', 'JOIN', 'WHERE', 'FROM', 'TABLE', 'DATABASE',
            'SCRIPT', 'SLEEP', 'WAITFOR', 'DELAY', 'BENCHMARK', 'LOAD_FILE',
            'INTO', 'VALUES', 'XP_CMDSHELL', 'SP_OACREATE', 'SP_OAMETHOD'
        ]
        
        # Script/XSS patterns to count
        self.script_patterns = [
            'script', 'javascript', 'onerror', 'onload', 'onclick', 'onmouseover',
            'alert', 'document.cookie', 'document.write', 'window.location',
            'eval', 'expression', 'url(', 'behavior:', 'mocha:', 'livescript:'
        ]
        
        # Special characters for attack detection
        self.special_chars = ["'", '"', ';', '--', '=', '<', '>', '(', ')', '{', '}', '|', '&', '$']
        
        # Encoding patterns
        self.encoding_patterns = [
            r'%[0-9A-Fa-f]{2}',  # URL encoding %27, %3C
            r'&#x[0-9a-fA-F]+;',  # HTML hex encoding &#x3C;
            r'&#[0-9]+;',        # HTML decimal encoding &#60;
            r'\x[0-9a-fA-F]{2}'  # Hex escape sequences
        ]
    
    def extract_all(self, request_data: Dict[str, Any], ip: str = "") -> csr_matrix:
        """
        Extract complete feature vector from request
        Returns: scipy.sparse.csr_matrix with 5015 features
        """
        # Group A: Text Features
        text_features = self._extract_text_features(request_data)
        
        # Group B: Statistical Features
        stat_features = self._extract_statistical_features(request_data)
        
        # Group C: Behavioral Features
        behavioral_features = self._extract_behavioral_features(ip) if ip else np.zeros(10)
        
        # Combine all features
        # Text features: sparse matrix (5000 dims)
        # Statistical + Behavioral: dense array (25 dims total)
        combined_dense = np.hstack([stat_features, behavioral_features])
        combined_sparse = csr_matrix(combined_dense)
        
        # Stack sparse matrices horizontally
        final_features = hstack([text_features, combined_sparse])
        
        return final_features
    
    def _extract_text_features(self, request_data: Dict[str, Any]) -> csr_matrix:
        """
        Group A: Text Features using CountVectorizer
        Combines URI + body + query_params + user_agent
        """
        # Combine all text components
        combined_text = self._combine_request_text(request_data)
        
        # Transform using vectorizer
        if self.vectorizer:
            text_features = self.vectorizer.transform([combined_text])
        else:
            # Fallback: create simple count features
            text_features = csr_matrix((1, 5000))
        
        return text_features
    
    def _combine_request_text(self, request_data: Dict[str, Any]) -> str:
        """Combine all request text components"""
        parts = []
        
        # URI
        uri = request_data.get('uri', '')
        parts.append(uri)
        
        # Body
        body = request_data.get('body', '')
        if body:
            parts.append(str(body))
        
        # Query parameters
        query = request_data.get('query_params', '')
        if query:
            parts.append(str(query))
        
        # Headers (especially User-Agent)
        headers = request_data.get('headers', '')
        if headers:
            parts.append(str(headers))
        
        # Method
        method = request_data.get('method', '')
        parts.insert(0, method)
        
        return ' '.join(parts)
    
    def _extract_statistical_features(self, request_data: Dict[str, Any]) -> np.ndarray:
        """
        Group B: Statistical Features (15 dimensions)
        """
        features = {}
        
        # 1. Payload length
        body = str(request_data.get('body', ''))
        features['payload_length'] = len(body)
        
        # 2. URI length
        uri = str(request_data.get('uri', ''))
        features['uri_length'] = len(uri)
        
        # 3. Special character count
        combined_text = self._combine_request_text(request_data)
        features['special_char_count'] = sum(1 for c in combined_text if c in self.special_chars)
        
        # 4. SQL keyword count
        text_upper = combined_text.upper()
        features['sql_keyword_count'] = sum(1 for keyword in self.sql_keywords if keyword in text_upper)
        
        # 5. Script tag count (XSS indicators)
        text_lower = combined_text.lower()
        features['script_tag_count'] = sum(1 for pattern in self.script_patterns if pattern in text_lower)
        
        # 6. Digit ratio
        if len(combined_text) > 0:
            features['digit_ratio'] = sum(1 for c in combined_text if c.isdigit()) / len(combined_text)
        else:
            features['digit_ratio'] = 0.0
        
        # 7. Uppercase ratio
        if len(combined_text) > 0:
            features['uppercase_ratio'] = sum(1 for c in combined_text if c.isupper()) / len(combined_text)
        else:
            features['uppercase_ratio'] = 0.0
        
        # 8. Parameter count
        query = str(request_data.get('query_params', ''))
        if query:
            features['param_count'] = len(query.split('&'))
        else:
            features['param_count'] = 0
        
        # 9. Encoding detected
        encoding_found = 0
        for pattern in self.encoding_patterns:
            if re.search(pattern, combined_text):
                encoding_found = 1
                break
        features['encoding_detected'] = encoding_found
        
        # 10. Suspicious pattern count
        suspicious_patterns = [
            r'1\s*=\s*1',
            r'OR\s+1\s*=\s*1',
            r'AND\s+1\s*=\s*1',
            r'<script',
            r'javascript:',
            r'on\w+\s*=',
            r'UNION\s+SELECT',
            r'DROP\s+TABLE'
        ]
        suspicious_count = sum(1 for pattern in suspicious_patterns if re.search(pattern, combined_text, re.I))
        features['suspicious_pattern_count'] = suspicious_count
        
        # 11. Path depth (number of / in URI)
        features['path_depth'] = uri.count('/')
        
        # 12. Query string length
        features['query_length'] = len(query)
        
        # 13. Has authentication header
        headers = str(request_data.get('headers', '')).lower()
        features['has_auth'] = 1 if 'authorization' in headers or 'cookie' in headers else 0
        
        # 14. Content-Type indicator
        features['is_json'] = 1 if 'application/json' in headers else 0
        features['is_form'] = 1 if 'application/x-www-form-urlencoded' in headers else 0
        
        # Convert to numpy array
        feature_array = np.array([
            features['payload_length'],
            features['uri_length'],
            features['special_char_count'],
            features['sql_keyword_count'],
            features['script_tag_count'],
            features['digit_ratio'],
            features['uppercase_ratio'],
            features['param_count'],
            features['encoding_detected'],
            features['suspicious_pattern_count'],
            features['path_depth'],
            features['query_length'],
            features['has_auth'],
            features['is_json'],
            features['is_form']
        ], dtype=np.float32)
        
        return feature_array
    
    def _extract_behavioral_features(self, ip: str) -> np.ndarray:
        """
        Group C: Behavioral Features from Redis (10 dimensions)
        Note: Returns zeros if Redis not available
        """
        if not self.redis or not ip:
            return np.zeros(10, dtype=np.float32)
        
        try:
            features = {}
            now = int(time.time())
            
            # 1. Request frequency in last 60 seconds
            request_key = f"requests:{ip}"
            request_count = self.redis.zcard(request_key)
            features['request_frequency'] = request_count
            
            # 2. Error rate last hour
            error_key = f"errors:{ip}"
            error_count = self.redis.get(error_key)
            total_requests = max(request_count, 1)
            features['error_rate'] = int(error_count or 0) / total_requests
            
            # 3. Threat history count
            threat_key = f"threats:{ip}"
            threat_count = self.redis.get(threat_key)
            features['threat_history'] = int(threat_count or 0)
            
            # 4. Is new IP (first request ever)
            ip_seen_key = f"ip_first_seen:{ip}"
            first_seen = self.redis.get(ip_seen_key)
            features['is_new_ip'] = 1 if not first_seen else 0
            
            if not first_seen:
                # Mark as seen now
                self.redis.set(ip_seen_key, str(now))
            
            # 5. Endpoint diversity
            endpoints_key = f"endpoints:{ip}"
            unique_endpoints = self.redis.scard(endpoints_key)
            features['endpoint_diversity'] = unique_endpoints
            
            # 6. Time since last request
            last_request_key = f"last_request:{ip}"
            last_request_time = self.redis.get(last_request_key)
            if last_request_time:
                    features['time_since_last_request'] = now - int(last_request_time)
            else:
                features['time_since_last_request'] = 9999  # Large value for first request
            
            # Update last request time
            self.redis.set(last_request_key, str(now))
            
            # 7. Login attempts in last 5 minutes
            login_attempts_key = f"login_attempts:{ip}"
            recent_logins = self.redis.zcount(login_attempts_key, now - 300, now)
            features['recent_login_attempts'] = recent_logins
            
            # 8. Rate limit hits in last hour
            rate_limit_hits_key = f"rate_limit_hits:{ip}"
            rate_limit_hits = self.redis.get(rate_limit_hits_key)
            features['rate_limit_hits'] = int(rate_limit_hits or 0)
            
            # 9. Is currently blocked
            blocked_key = f"temp_ban:{ip}"
            is_blocked = self.redis.exists(blocked_key)
            features['is_blocked'] = 1 if is_blocked else 0
            
            # 10. Average request interval (regularity check for bots)
            request_times = self.redis.zrange(request_key, -10, -1, withscores=True)
            if len(request_times) >= 2:
                intervals = [request_times[i][1] - request_times[i-1][1] 
                           for i in range(1, len(request_times))]
                avg_interval = sum(intervals) / len(intervals)
                # Low variance in intervals suggests bot behavior
                if avg_interval > 0:
                    variance = sum((x - avg_interval) ** 2 for x in intervals) / len(intervals)
                    features['request_regularity'] = 1 / (1 + variance)  # Higher = more regular (bot-like)
                else:
                    features['request_regularity'] = 0.0
            else:
                features['request_regularity'] = 0.0
            
            # Convert to numpy array
            feature_array = np.array([
                features['request_frequency'],
                features['error_rate'],
                features['threat_history'],
                features['is_new_ip'],
                features['endpoint_diversity'],
                features['time_since_last_request'],
                features['recent_login_attempts'],
                features['rate_limit_hits'],
                features['is_blocked'],
                features['request_regularity']
            ], dtype=np.float32)
            
            return feature_array
            
        except Exception as e:
            logger.error(f"Error extracting behavioral features: {e}")
            return np.zeros(10, dtype=np.float32)
    
    def extract_single_feature_dict(self, request_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract features as dictionary (for debugging/analysis)"""
        stat_features = self._extract_statistical_features(request_data)
        
        return {
            'payload_length': stat_features[0],
            'uri_length': stat_features[1],
            'special_char_count': stat_features[2],
            'sql_keyword_count': stat_features[3],
            'script_tag_count': stat_features[4],
            'digit_ratio': stat_features[5],
            'uppercase_ratio': stat_features[6],
            'param_count': stat_features[7],
            'encoding_detected': stat_features[8],
            'suspicious_pattern_count': stat_features[9],
            'path_depth': stat_features[10],
            'query_length': stat_features[11],
            'has_auth': stat_features[12],
            'is_json': stat_features[13],
            'is_form': stat_features[14]
        }
    
    def get_feature_names(self) -> List[str]:
        """Get list of all feature names"""
        return [
            # Text features (5000 from CountVectorizer)
            *[f"text_feature_{i}" for i in range(5000)],
            # Statistical features
            'payload_length',
            'uri_length',
            'special_char_count',
            'sql_keyword_count',
            'script_tag_count',
            'digit_ratio',
            'uppercase_ratio',
            'param_count',
            'encoding_detected',
            'suspicious_pattern_count',
            'path_depth',
            'query_length',
            'has_auth',
            'is_json',
            'is_form',
            # Behavioral features
            'request_frequency',
            'error_rate',
            'threat_history',
            'is_new_ip',
            'endpoint_diversity',
            'time_since_last_request',
            'recent_login_attempts',
            'rate_limit_hits',
            'is_blocked',
            'request_regularity'
        ]

# Global feature extractor instance
feature_extractor = FeatureExtractor()

# Async helper functions for Redis integration
async def extract_features_with_redis(request_data: Dict[str, Any], ip: str, redis_client: redis.Redis) -> csr_matrix:
    """Extract features with Redis behavioral data"""
    extractor = FeatureExtractor(redis_client=redis_client)
    return extractor.extract_all(request_data, ip)

def extract_features_without_redis(request_data: Dict[str, Any]) -> csr_matrix:
    """Extract features without behavioral data"""
    return feature_extractor.extract_all(request_data, "")

# Feature importance analysis (for model interpretability)
def analyze_feature_importance(model, feature_names: List[str], top_n: int = 20) -> List[Tuple[str, float]]:
    """Analyze feature importance from trained model"""
    if hasattr(model, 'feature_importances_'):
        # Tree-based model (Random Forest)
        importances = model.feature_importances_
    elif hasattr(model, 'coef_'):
        # Linear model (Logistic Regression)
        importances = np.abs(model.coef_[0])
    else:
        return []
    
    # Get top N features
    indices = np.argsort(importances)[::-1][:top_n]
    top_features = [(feature_names[i], importances[i]) for i in indices]
    
    return top_features

if __name__ == "__main__":
    # Test the feature extractor
    test_request = {
        "uri": "/api/users?id=1' OR '1'='1",
        "method": "GET",
        "body": "",
        "query_params": "id=1' OR '1'='1",
        "headers": "User-Agent: Mozilla/5.0"
    }
    
    features = feature_extractor.extract_all(test_request, "127.0.0.1")
    print(f"Feature vector shape: {features.shape}")
    print(f"Feature vector (non-zero entries): {features.nnz}")
    
    # Print statistical features
    stat_dict = feature_extractor.extract_single_feature_dict(test_request)
    print("\nStatistical Features:")
    for key, value in stat_dict.items():
        print(f"  {key}: {value}")
