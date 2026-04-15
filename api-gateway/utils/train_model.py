import joblib
import os
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def train_model():
    # Dataset: (payload, label) where 1 is malicious and 0 is benign
    data = [
        # Normal requests
        ("/home", 0),
        ("/api/products", 0),
        ("/api/products/123", 0),
        ("/api/cart/add", 0),
        ("/api/login", 0),
        ("/search/q=laptops", 0),
        ("/category/electronics", 0),
        ("/about-us", 0),
        ("/contact", 0),
        ("/api/user/profile", 0),
        
        # SQL Injection
        ("/api/products?id=1' OR '1'='1", 1),
        ("/api/login?username=admin'--", 1),
        ("/api/products?id=1 UNION SELECT name, password FROM users", 1),
        ("/api/products?id=1; DROP TABLE users", 1),
        ("/api/products?id=1' AND 1=1", 1),
        
        # XSS
        ("/api/search?q=<script>alert('xss')</script>", 1),
        ("/api/products?description=<img src=x onerror=alert(1)>", 1),
        ("<svg/onload=alert('XSS')>", 1),
        ("javascript:alert('XSS')", 1),
        
        # Path Traversal & Others
        ("/etc/passwd", 1),
        ("../../etc/shadow", 1),
        ("/api/admin/config", 1),
        ("/shell.php", 1),
        (".env", 1)
    ]
    
    X_raw, y = zip(*data)
    
    # Vectorize the text
    vectorizer = CountVectorizer(analyzer='char', ngram_range=(2, 4))
    X = vectorizer.fit_transform(X_raw)
    
    # Train the model
    model = LogisticRegression(max_iter=1000)
    model.fit(X, y)
    
    # Create directory for models if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save the model and vectorizer
    joblib.dump(model, 'models/detector_model.pkl')
    joblib.dump(vectorizer, 'models/vectorizer.pkl')
    
    logger.info("ML Model and Vectorizer trained and saved successfully.")

if __name__ == "__main__":
    train_model()
