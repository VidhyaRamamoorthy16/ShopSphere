#!/usr/bin/env python3
"""
Training script for ML threat detection models
Generates synthetic training data and trains both anomaly detection and classification models
"""

import json
import time
import random
import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import asdict
import argparse
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from middleware.ml_detector_complete import (
    MLThreatDetector, RequestFeatures, ThreatType, ThreatLevel
)
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ThreatDataGenerator:
    """Generate synthetic training data for threat detection"""
    
    def __init__(self, seed: int = 42):
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)
        
        # Malicious payloads for generating attack data
        self.sql_injection_payloads = [
            "SELECT * FROM users WHERE id = 1 OR 1=1",
            "'; DROP TABLE users; --",
            "1' UNION SELECT username, password FROM users --",
            "admin'--",
            "' OR 'x'='x",
            "1; EXEC xp_cmdshell('dir') --",
            "'; INSERT INTO users VALUES('hacker', 'pass'); --",
            "1' AND (SELECT COUNT(*) FROM users) > 0 --"
        ]
        
        self.xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "';alert('XSS');//",
            "<iframe src=\"javascript:alert('XSS')\"></iframe>",
            "<body onload=alert('XSS')>",
            "';document.location='http://evil.com';//",
            "<svg onload=alert('XSS')>"
        ]
        
        self.path_traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "..%252f..%252f..%252fetc%252fpasswd",
            "/var/www/../../etc/passwd",
            "....\\\\....\\\\....\\\\windows\\\\system32\\\\drivers\\\\etc\\\\hosts"
        ]
        
        self.command_injection_payloads = [
            "; ls -la",
            "| cat /etc/passwd",
            "& whoami",
            "`id`",
            "$(whoami)",
            "; net user hacker password /add",
            "| dir c:\\",
            "& ping -c 10 127.0.0.1"
        ]
        
        # Suspicious user agents
        self.suspicious_user_agents = [
            "sqlmap/1.0",
            "Nikto/2.1.6",
            "Nmap Scripting Engine",
            "python-requests/2.25.1",
            "curl/7.68.0",
            "Wget/1.20.3",
            "Mozilla/5.0 (compatible; scanner/1.0)",
            "metasploit",
            "burp scanner",
            "custom bot/1.0"
        ]
        
        # Normal user agents
        self.normal_user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15"
        ]

    def generate_benign_request(self) -> Dict[str, Any]:
        """Generate a benign HTTP request"""
        methods = ['GET', 'POST', 'PUT', 'DELETE']
        paths = [
            '/api/users',
            '/api/products',
            '/api/orders',
            '/api/cart',
            '/api/auth/login',
            '/api/auth/register',
            '/health',
            '/api/products/123',
            '/api/users/profile'
        ]
        
        method = random.choice(methods)
        path = random.choice(paths)
        
        # Generate normal query parameters
        query_params = []
        if random.random() < 0.3:  # 30% have query params
            param_count = random.randint(1, 3)
            for i in range(param_count):
                key = random.choice(['id', 'page', 'limit', 'sort', 'filter', 'search'])
                value = f"{random.randint(1, 1000)}"
                query_params.append(f"{key}={value}")
        
        query_string = '&'.join(query_params) if query_params else ''
        
        # Generate normal headers
        headers = {
            'user-agent': random.choice(self.normal_user_agents),
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            'connection': 'keep-alive'
        }
        
        # Generate normal body for POST/PUT
        body = b''
        if method in ['POST', 'PUT']:
            if random.random() < 0.5:  # 50% have body
                content_type = random.choice(['application/json', 'application/x-www-form-urlencoded'])
                headers['content-type'] = content_type
                
                if content_type == 'application/json':
                    body_data = {
                        'name': f'User{random.randint(1, 1000)}',
                        'email': f'user{random.randint(1, 1000)}@example.com',
                        'age': random.randint(18, 80)
                    }
                    body = json.dumps(body_data).encode()
                else:
                    body = f'name=User{random.randint(1, 1000)}&email=user{random.randint(1, 1000)}@example.com'.encode()
        
        return {
            'method': method,
            'path': path,
            'query': query_string,
            'headers': headers,
            'body': body,
            'ip': f"192.168.1.{random.randint(1, 254)}",
            'timestamp': datetime.now()
        }

    def generate_malicious_request(self) -> Tuple[Dict[str, Any], str]:
        """Generate a malicious HTTP request with specific attack type"""
        attack_types = ['sql_injection', 'xss', 'path_traversal', 'command_injection']
        attack_type = random.choice(attack_types)
        
        methods = ['GET', 'POST', 'PUT']
        method = random.choice(methods)
        
        # Generate malicious payload based on attack type
        if attack_type == 'sql_injection':
            payload = random.choice(self.sql_injection_payloads)
            path = f'/api/users?id={payload}'
        elif attack_type == 'xss':
            payload = random.choice(self.xss_payloads)
            path = f'/api/search?q={payload}'
        elif attack_type == 'path_traversal':
            payload = random.choice(self.path_traversal_payloads)
            path = f'/api/files?file={payload}'
        else:  # command_injection
            payload = random.choice(self.command_injection_payloads)
            path = f'/api/exec?cmd={payload}'
        
        # Generate headers with suspicious user agent
        headers = {
            'user-agent': random.choice(self.suspicious_user_agents),
            'accept': '*/*',
            'connection': 'close'
        }
        
        # Generate body for POST/PUT
        body = b''
        if method in ['POST', 'PUT']:
            if attack_type == 'sql_injection':
                body = f"username=admin{payload}&password=123".encode()
            elif attack_type == 'xss':
                body = f"comment={payload}".encode()
            else:
                body = f"input={payload}".encode()
            
            headers['content-type'] = 'application/x-www-form-urlencoded'
        
        return {
            'method': method,
            'path': path,
            'query': '',
            'headers': headers,
            'body': body,
            'ip': f"10.0.0.{random.randint(1, 254)}",
            'timestamp': datetime.now()
        }, attack_type

    def generate_training_dataset(self, n_samples: int = 10000, malicious_ratio: float = 0.3) -> List[Dict[str, Any]]:
        """Generate balanced training dataset"""
        logger.info(f"Generating {n_samples} training samples with {malicious_ratio:.1%} malicious data")
        
        dataset = []
        n_malicious = int(n_samples * malicious_ratio)
        n_benign = n_samples - n_malicious
        
        # Generate benign samples
        for i in range(n_benign):
            request = self.generate_benign_request()
            dataset.append({
                'request': request,
                'label': 0,  # 0 for benign
                'attack_type': 'benign'
            })
            
            if (i + 1) % 1000 == 0:
                logger.info(f"Generated {i + 1}/{n_benign} benign samples")
        
        # Generate malicious samples
        for i in range(n_malicious):
            request, attack_type = self.generate_malicious_request()
            dataset.append({
                'request': request,
                'label': 1,  # 1 for malicious
                'attack_type': attack_type
            })
            
            if (i + 1) % 1000 == 0:
                logger.info(f"Generated {i + 1}/{n_malicious} malicious samples")
        
        # Shuffle dataset
        random.shuffle(dataset)
        
        logger.info(f"Generated complete dataset: {len(dataset)} samples")
        return dataset

class ModelTrainer:
    """Train and evaluate ML models for threat detection"""
    
    def __init__(self, model_path: str = "models/"):
        self.model_path = model_path
        self.detector = MLThreatDetector(model_path=model_path)
        os.makedirs(model_path, exist_ok=True)

    def prepare_training_data(self, dataset: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare training data from dataset"""
        logger.info("Preparing training data...")
        
        X = []
        y = []
        
        for i, data_point in enumerate(dataset):
            try:
                features = self.detector.extract_features(data_point['request'])
                feature_vector = self.detector._features_to_vector(features)
                X.append(feature_vector)
                y.append(data_point['label'])
                
                if (i + 1) % 1000 == 0:
                    logger.info(f"Processed {i + 1}/{len(dataset)} samples")
                    
            except Exception as e:
                logger.error(f"Error processing sample {i}: {e}")
                continue
        
        X = np.array(X)
        y = np.array(y)
        
        logger.info(f"Prepared training data: X.shape={X.shape}, y.shape={y.shape}")
        return X, y

    def train_models(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Train both anomaly detection and classification models"""
        logger.info("Training ML models...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        logger.info(f"Training set: {X_train.shape}, Test set: {X_test.shape}")
        
        # Train anomaly detector (Isolation Forest)
        logger.info("Training anomaly detector...")
        self.detector.anomaly_detector = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.detector.anomaly_detector.fit(X_train)
        
        # Train classifier (Random Forest)
        logger.info("Training classifier...")
        self.detector.classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10,
            min_samples_split=5
        )
        self.detector.classifier.fit(X_train, y_train)
        
        # Evaluate models
        logger.info("Evaluating models...")
        y_pred = self.detector.classifier.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Classification accuracy: {accuracy:.4f}")
        logger.info("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['Benign', 'Malicious']))
        
        # Test anomaly detection
        anomaly_scores = self.detector.anomaly_detector.decision_function(X_test)
        anomaly_predictions = (anomaly_scores < 0).astype(int)
        anomaly_accuracy = accuracy_score(y_test, anomaly_predictions)
        
        logger.info(f"Anomaly detection accuracy: {anomaly_accuracy:.4f}")
        
        # Save models
        self._save_models()
        
        return {
            'classification_accuracy': accuracy,
            'anomaly_accuracy': anomaly_accuracy,
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }

    def _save_models(self):
        """Save trained models to disk"""
        logger.info("Saving trained models...")
        
        # Create dummy vectorizer and scaler if not exists
        if not self.detector.vectorizer:
            self.detector.vectorizer = TfidfVectorizer(max_features=1000)
        if not self.detector.scaler:
            self.detector.scaler = StandardScaler()
        if not self.detector.label_encoder:
            self.detector.label_encoder = LabelEncoder()
        
        # Save models
        joblib.dump(self.detector.anomaly_detector, f"{self.model_path}/anomaly_detector.pkl")
        joblib.dump(self.detector.classifier, f"{self.model_path}/classifier.pkl")
        joblib.dump(self.detector.vectorizer, f"{self.model_path}/vectorizer.pkl")
        joblib.dump(self.detector.scaler, f"{self.model_path}/scaler.pkl")
        joblib.dump(self.detector.label_encoder, f"{self.model_path}/label_encoder.pkl")
        
        # Save model info
        model_info = {
            'version': '1.0',
            'training_time': datetime.now().isoformat(),
            'feature_count': len(self.detector.anomaly_detector.feature_names_in_) if hasattr(self.detector.anomaly_detector, 'feature_names_in_') else 'unknown',
            'model_type': 'IsolationForest + RandomForest'
        }
        
        with open(f"{self.model_path}/model_info.json", 'w') as f:
            json.dump(model_info, f, indent=2)
        
        logger.info(f"Models saved to {self.model_path}")

    def evaluate_models(self, test_dataset: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Evaluate trained models on test dataset"""
        logger.info(f"Evaluating models on {len(test_dataset)} test samples...")
        
        correct_predictions = 0
        threat_type_correct = 0
        total_threats = 0
        
        results = {
            'total_samples': len(test_dataset),
            'correct_predictions': 0,
            'threat_type_accuracy': 0,
            'false_positives': 0,
            'false_negatives': 0,
            'detection_rates': {}
        }
        
        for data_point in test_dataset:
            try:
                request_data = data_point['request']
                true_label = data_point['label']
                true_attack_type = data_point['attack_type']
                
                # Analyze request
                threat_result = self.detector.analyze_request(request_data)
                
                # Check if threat was correctly identified
                predicted_is_threat = threat_result.is_threat
                if predicted_is_threat == (true_label == 1):
                    correct_predictions += 1
                
                # Check threat type accuracy
                if true_label == 1 and predicted_is_threat:
                    total_threats += 1
                    if threat_result.threat_type.value == true_attack_type:
                        threat_type_correct += 1
                    
                    # Track detection rates by type
                    attack_type = true_attack_type
                    if attack_type not in results['detection_rates']:
                        results['detection_rates'][attack_type] = {'detected': 0, 'total': 0}
                    results['detection_rates'][attack_type]['total'] += 1
                    results['detection_rates'][attack_type]['detected'] += 1
                elif true_label == 1 and not predicted_is_threat:
                    # False negative
                    attack_type = true_attack_type
                    if attack_type not in results['detection_rates']:
                        results['detection_rates'][attack_type] = {'detected': 0, 'total': 0}
                    results['detection_rates'][attack_type]['total'] += 1
                
                # Track false positives/negatives
                if predicted_is_threat and true_label == 0:
                    results['false_positives'] += 1
                elif not predicted_is_threat and true_label == 1:
                    results['false_negatives'] += 1
                    
            except Exception as e:
                logger.error(f"Error evaluating sample: {e}")
                continue
        
        results['correct_predictions'] = correct_predictions
        results['accuracy'] = correct_predictions / len(test_dataset)
        results['threat_type_accuracy'] = threat_type_correct / max(total_threats, 1)
        
        # Calculate detection rates
        for attack_type in results['detection_rates']:
            rates = results['detection_rates'][attack_type]
            rates['detection_rate'] = rates['detected'] / rates['total']
        
        logger.info(f"Evaluation results:")
        logger.info(f"  Overall accuracy: {results['accuracy']:.4f}")
        logger.info(f"  Threat type accuracy: {results['threat_type_accuracy']:.4f}")
        logger.info(f"  False positives: {results['false_positives']}")
        logger.info(f"  False negatives: {results['false_negatives']}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Train ML threat detection models')
    parser.add_argument('--samples', type=int, default=10000, help='Number of training samples to generate')
    parser.add_argument('--malicious-ratio', type=float, default=0.3, help='Ratio of malicious samples')
    parser.add_argument('--test-samples', type=int, default=2000, help='Number of test samples')
    parser.add_argument('--model-path', type=str, default='models/', help='Path to save models')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    
    args = parser.parse_args()
    
    logger.info("Starting ML model training...")
    logger.info(f"Configuration: samples={args.samples}, malicious_ratio={args.malicious_ratio}, model_path={args.model_path}")
    
    # Initialize components
    data_generator = ThreatDataGenerator(seed=args.seed)
    trainer = ModelTrainer(model_path=args.model_path)
    
    # Generate training data
    training_dataset = data_generator.generate_training_dataset(
        n_samples=args.samples,
        malicious_ratio=args.malicious_ratio
    )
    
    # Prepare training data
    X, y = trainer.prepare_training_data(training_dataset)
    
    # Train models
    training_results = trainer.train_models(X, y)
    
    # Generate test data
    logger.info("Generating test dataset...")
    test_dataset = data_generator.generate_training_dataset(
        n_samples=args.test_samples,
        malicious_ratio=0.4  # Higher malicious ratio for testing
    )
    
    # Evaluate models
    evaluation_results = trainer.evaluate_models(test_dataset)
    
    # Save results
    results = {
        'training': training_results,
        'evaluation': evaluation_results,
        'configuration': {
            'samples': args.samples,
            'malicious_ratio': args.malicious_ratio,
            'test_samples': args.test_samples,
            'seed': args.seed
        }
    }
    
    with open(f"{args.model_path}/training_results.json", 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    logger.info("Training completed successfully!")
    logger.info(f"Results saved to {args.model_path}/training_results.json")

if __name__ == "__main__":
    main()
