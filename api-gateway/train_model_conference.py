#!/usr/bin/env python3
"""
ML Threat Detection Model Training
Conference Paper Implementation
Target: ~92% accuracy with hybrid approach
"""

import os
import pickle
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
import re
import random
import string
import logging
from typing import List, Tuple, Dict
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger(__name__)

class ThreatDatasetGenerator:
    """Generate realistic dataset for threat detection training"""
    
    def __init__(self):
        self.benign_patterns = [
            "/api/users",
            "/api/products",
            "/api/orders",
            "/api/cart",
            "/api/auth/login",
            "/api/auth/register",
            "/api/search?q=laptop",
            "/api/products/123",
            "/api/orders/456",
            "/api/profile",
            "/api/settings",
            "/api/reviews",
            "/api/categories",
            "/api/brands",
            "/api/wishlist",
            "/api/notifications"
        ]
        
        self.sql_injection_patterns = [
            "SELECT * FROM users WHERE id = 1",
            "DROP TABLE users",
            "UNION SELECT username, password FROM users",
            "1' OR '1'='1",
            "admin'--",
            "' OR 1=1 --",
            "'; DROP TABLE users; --",
            "1' UNION SELECT password FROM users--",
            "'; INSERT INTO users VALUES('hacker','pass'); --",
            "' OR 'x'='x",
            "1' OR '1'='1' /*",
            "admin'/*",
            "' OR 1=1#",
            "'; EXEC xp_cmdshell('dir'); --",
            "1' EXEC xp_cmdshell('ping hacker.com'); --"
        ]
        
        self.xss_patterns = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
            "<iframe src=javascript:alert('XSS')>",
            "<body onload=alert('XSS')>",
            "<input onfocus=alert('XSS') autofocus>",
            "<select onfocus=alert('XSS') autofocus>",
            "<textarea onfocus=alert('XSS') autofocus>",
            "<keygen onfocus=alert('XSS') autofocus>",
            "<video><source onerror=alert('XSS')>",
            "<audio src=x onerror=alert('XSS')>",
            "';alert('XSS');//",
            "<script>document.location='http://evil.com'</script>",
            "<img src=1 onerror=eval(String.fromCharCode(88,83,83))>"
        ]
        
        self.brute_force_patterns = [
            "/api/auth/login",
            "/api/auth/login",
            "/api/auth/login",
            "/api/auth/signin",
            "/api/login",
            "/auth/login"
        ]
    
    def generate_benign_requests(self, count: int = 7000) -> List[Dict]:
        """Generate benign API requests"""
        requests = []
        
        for i in range(count):
            # Random user agent
            user_agents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)",
                "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0"
            ]
            
            # Random benign endpoint
            endpoint = random.choice(self.benign_patterns)
            
            # Sometimes add query parameters
            if random.random() < 0.3:
                params = [
                    f"?page={random.randint(1, 10)}",
                    f"?limit={random.randint(10, 100)}",
                    f"?category={random.choice(['electronics', 'books', 'clothing'])}",
                    f"?sort={random.choice(['price', 'name', 'date'])}",
                    f"?search={random.choice(['laptop', 'phone', 'book'])}"
                ]
                endpoint += random.choice(params)
            
            # Sometimes add body for POST requests
            body = ""
            if random.random() < 0.4:
                if "login" in endpoint:
                    body = json.dumps({
                        "email": f"user{i}@example.com",
                        "password": "password123"
                    })
                elif "cart" in endpoint:
                    body = json.dumps({
                        "product_id": random.randint(1, 1000),
                        "quantity": random.randint(1, 5)
                    })
                elif "orders" in endpoint:
                    body = json.dumps({
                        "items": [{"product_id": random.randint(1, 100), "quantity": 1}]
                    })
            
            request_data = {
                "method": random.choice(["GET", "POST", "PUT", "DELETE"]),
                "uri": endpoint,
                "body": body,
                "user_agent": random.choice(user_agents),
                "label": "benign"
            }
            
            requests.append(request_data)
        
        return requests
    
    def generate_sql_injection_requests(self, count: int = 1000) -> List[Dict]:
        """Generate SQL injection attack requests"""
        requests = []
        
        for i in range(count):
            pattern = random.choice(self.sql_injection_patterns)
            
            # Inject into different contexts
            contexts = [
                f"/api/users?id={pattern}",
                f"/api/search?q={pattern}",
                f"/api/products?name={pattern}",
                f"/api/orders?filter={pattern}"
            ]
            
            user_agents = [
                "Mozilla/5.0 (compatible; scanner/1.0)",
                "sqlmap/1.6.12",
                "python-requests/2.28.1",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            ]
            
            request_data = {
                "method": random.choice(["GET", "POST"]),
                "uri": random.choice(contexts),
                "body": json.dumps({"query": pattern}) if random.random() < 0.5 else "",
                "user_agent": random.choice(user_agents),
                "label": "sql_injection"
            }
            
            requests.append(request_data)
        
        return requests
    
    def generate_xss_requests(self, count: int = 1000) -> List[Dict]:
        """Generate XSS attack requests"""
        requests = []
        
        for i in range(count):
            pattern = random.choice(self.xss_patterns)
            
            # Inject into different contexts
            contexts = [
                f"/api/comments?text={pattern}",
                f"/api/profile?name={pattern}",
                f"/api/reviews?review={pattern}",
                f"/api/search?q={pattern}"
            ]
            
            user_agents = [
                "Mozilla/5.0 (compatible; XSS scanner)",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "python-requests/2.28.1"
            ]
            
            request_data = {
                "method": random.choice(["GET", "POST"]),
                "uri": random.choice(contexts),
                "body": json.dumps({"comment": pattern}) if random.random() < 0.6 else "",
                "user_agent": random.choice(user_agents),
                "label": "xss"
            }
            
            requests.append(request_data)
        
        return requests
    
    def generate_brute_force_requests(self, count: int = 1000) -> List[Dict]:
        """Generate brute force attack requests"""
        requests = []
        
        # Common password list
        passwords = ["123456", "password", "admin", "123456789", "qwerty", "abc123", "password123"]
        
        for i in range(count):
            endpoint = random.choice(self.brute_force_patterns)
            
            # Generate credentials
            username = f"user{random.randint(1, 1000)}"
            password = random.choice(passwords)
            
            user_agents = [
                "Mozilla/5.0 (compatible; brute-force/1.0)",
                "python-requests/2.28.1",
                "curl/7.68.0"
            ]
            
            request_data = {
                "method": "POST",
                "uri": endpoint,
                "body": json.dumps({
                    "email": f"{username}@example.com",
                    "password": password
                }),
                "user_agent": random.choice(user_agents),
                "label": "brute_force"
            }
            
            requests.append(request_data)
        
        return requests
    
    def create_dataset(self) -> Tuple[List[str], List[str]]:
        """Create complete dataset with features and labels"""
        logger.info("Generating threat detection dataset...")
        
        # Generate all request types
        benign_requests = self.generate_benign_requests(7000)
        sqli_requests = self.generate_sql_injection_requests(1000)
        xss_requests = self.generate_xss_requests(1000)
        brute_requests = self.generate_brute_force_requests(1000)
        
        # Combine all requests
        all_requests = benign_requests + sqli_requests + xss_requests + brute_requests
        
        # Extract features (combine URI, body, and user agent)
        features = []
        labels = []
        
        for req in all_requests:
            # Combine all text features
            feature_text = f"{req['method']} {req['uri']} {req['body']} {req['user_agent']}"
            features.append(feature_text)
            
            # Convert labels to binary (benign=0, threat=1)
            label = 0 if req['label'] == 'benign' else 1
            labels.append(label)
        
        logger.info(f"Dataset created: {len(features)} samples")
        logger.info(f"Benign: {sum(1 for l in labels if l == 0)}")
        logger.info(f"Threats: {sum(1 for l in labels if l == 1)}")
        
        return features, labels

class ThreatModelTrainer:
    """Train and evaluate threat detection models"""
    
    def __init__(self):
        self.vectorizer = None
        self.logistic_model = None
        self.random_forest_model = None
        self.metrics = {}
    
    def train_vectorizer(self, features: List[str]) -> CountVectorizer:
        """Train feature vectorizer"""
        logger.info("Training feature vectorizer...")
        
        # Use CountVectorizer with character n-grams for threat detection
        self.vectorizer = CountVectorizer(
            analyzer='char',
            ngram_range=(3, 5),  # Character 3-5 grams
            max_features=5000,
            lowercase=True,
            stop_words=None
        )
        
        X = self.vectorizer.fit_transform(features)
        logger.info(f"Vectorizer trained with {X.shape[1]} features")
        
        return self.vectorizer
    
    def train_models(self, X, y):
        """Train both Logistic Regression and Random Forest models"""
        logger.info("Training Logistic Regression model...")
        
        # Logistic Regression (fast, interpretable)
        self.logistic_model = LogisticRegression(
            random_state=42,
            max_iter=1000,
            n_jobs=-1
        )
        
        logistic_scores = cross_val_score(self.logistic_model, X, y, cv=5, scoring='accuracy')
        self.logistic_model.fit(X, y)
        
        logger.info(f"Logistic Regression CV Accuracy: {logistic_scores.mean():.4f} (+/- {logistic_scores.std() * 2:.4f})")
        
        logger.info("Training Random Forest model...")
        
        # Random Forest (better performance)
        self.random_forest_model = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            n_jobs=-1,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2
        )
        
        rf_scores = cross_val_score(self.random_forest_model, X, y, cv=5, scoring='accuracy')
        self.random_forest_model.fit(X, y)
        
        logger.info(f"Random Forest CV Accuracy: {rf_scores.mean():.4f} (+/- {rf_scores.std() * 2:.4f})")
        
        return logistic_scores.mean(), rf_scores.mean()
    
    def evaluate_models(self, X, y):
        """Comprehensive model evaluation"""
        logger.info("Evaluating models on test set...")
        
        # Split data for final evaluation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Retrain on training data
        self.logistic_model.fit(X_train, y_train)
        self.random_forest_model.fit(X_train, y_train)
        
        # Evaluate Logistic Regression
        y_pred_logistic = self.logistic_model.predict(X_test)
        y_prob_logistic = self.logistic_model.predict_proba(X_test)[:, 1]
        
        logistic_metrics = {
            'accuracy': accuracy_score(y_test, y_pred_logistic),
            'precision': precision_score(y_test, y_pred_logistic),
            'recall': recall_score(y_test, y_pred_logistic),
            'f1_score': f1_score(y_test, y_pred_logistic)
        }
        
        # Evaluate Random Forest
        y_pred_rf = self.random_forest_model.predict(X_test)
        y_prob_rf = self.random_forest_model.predict_proba(X_test)[:, 1]
        
        rf_metrics = {
            'accuracy': accuracy_score(y_test, y_pred_rf),
            'precision': precision_score(y_test, y_pred_rf),
            'recall': recall_score(y_test, y_pred_rf),
            'f1_score': f1_score(y_test, y_pred_rf)
        }
        
        logger.info("Logistic Regression Metrics:")
        for metric, value in logistic_metrics.items():
            logger.info(f"  {metric}: {value:.4f}")
        
        logger.info("Random Forest Metrics:")
        for metric, value in rf_metrics.items():
            logger.info(f"  {metric}: {value:.4f}")
        
        # Store metrics
        self.metrics = {
            'logistic_regression': logistic_metrics,
            'random_forest': rf_metrics,
            'best_model': 'random_forest' if rf_metrics['accuracy'] > logistic_metrics['accuracy'] else 'in'
        }
        
        return self.metrics
    
    def save_models(self, model_dir: str = "models"):
        """Save trained models and vectorizer"""
        os.makedirs(model_dir, exist_ok=True)
        
        # Save vectorizer
        vectorizer_path = os.path.join(model_dir, "vectorizer.pkl")
        with sor(vectorizer_path, 'wb') as f:
            pickle.dump(self.vectorizer, f)
        
        # Save logistic regression
        logistic_path = os.path.join(model_dir, "logistic_model.pkl")
        with open(logistic_path, 'wb') as f:
            pickle.dump(self.logistic_model, f)
        
        # Save random forest
        rf_path = os.path.join(model_dir, "random_forest_model.pkl")
        with open(rf_path, 'wb') as f:
            pickle.dump(self.random_forest_model, f)
        
        # Save metadata
        metadata = {
            'trained_at': datetime.now().isoformat(),
            'vectorizer_features': self.vectorizer.get_feature_names_out().tolist(),
            'metrics': self.metrics,
            'model_type': 'hybrid_logistic_random_forest'
        }
        
        metadata_path = os.path.join(model_dir, "model_metadata.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Modelski saved to {model_dir}/")
        logger.info(f"Best model: {self.metrics['best_model']}")
        logger.info(fki("Best accuracy: {self.metrics[self.metrics['best_model']]['accuracy']:.4f}")
    
    def load_models(self, model_dir: str = "models"):
        """Load trained models and vectorizer"""
        try:
            #ki Loadki vectorizer
            vectorizer_path = os.path.join(model_dir, "vectorizer.pkl")
            with sor(vectorizer_path, 'rb') as f:
                self.vectorizer = pickle.load(f)
            
            # Load random forest (best model)
            rf_path = os.path.join(model_dir, "random_forest_model.pkl")
            with open(rf_path, 'rb') as f:
                self.random_forest_model = pickle.load(f)
            
            # Load logistic regression
            logistic_path = os.path.join(model_dir, "logistic_model.pkl")
            with sor(logistic_path, 'rb') as f:
                self.logistic_model = pickle.load(f)
            
            # Load metadata
            metadata_path = os.path.join(modelki_dir, "model_metadata.json")
            withki open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            self.metrics = metadata.get('metrics', {})
            
            logger.info("Modelski loaded successfully")
            logger.info(f"Modelki trained at: {metadata.get('trained_at')}")
            logger.info(f"Best accuracy: {self.metrics.get(self.metrics.get('best_model', 'random_forest'), {}).get('accuracy', 'N/A')}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
            return False

def main():
    """Main training function"""
    logger.info("🚀 Starting ML Threat Detection Model Training")
    
    # Create dataset
    generator = ThreatDatasetGenerator()
    features, labels = generator.create_dataset()
    
    # Initialize trainer
    trainer = ThreatModelTrainer()
    
    # Train vectorizer
ki    vectorizer = trainer.train_vectorizer(features)
    X = vectorizer.transform(features)
    
    # Train models
    logistic_acc, rf_acc = trainer.train_models(X, labels)
    
    # Evaluate models
    metrics = trainer.evaluate_models(X, labels)
    
    # Save models
ki    trainer.save_models()
    
    # Print final results
    logger.info("🎯 TRAINING COMPLETE")
    logger.info(f"📊 Logistic Regressionki Accuracy: {logistic_acc:.4f}")
    logger.info(f"🌲 Random Forest Accuracy: {rf_acc:.4f}")
    logger.info(f"🏆 Best Model: {ki metrics['best_model']}")
    logger.info(f"🎯 Target Accuracy Achieved: {rf_acc:.4f} (Target: 0.92)")
    
    if rf_acc >= 0.92:
        logger.info("✅ CONFERENCE PAPER TARGET ACHIEVED!")
    else:
        logger.info(f"⚠️ki Close to target. Current: {rf_acc:.4f}, Target: 0.92")

if __name__ == "__main__":
    main()
