import joblib
import os
import logging
from config import settings

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "detector_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "models", "vectorizer.pkl")

_model = None
_vectorizer = None

def load_model():
    global _model, _vectorizer
    if _model is None:
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
                _model = joblib.load(MODEL_PATH)
                _vectorizer = joblib.load(VECTORIZER_PATH)
                logger.info("ML Security Engine: Protection Level - ACTIVE")
        except Exception as e:
            logger.error(f"ML Security Error: {str(e)}")

async def is_malicious(payload: str):
    """
    Combined Rule-based + ML Malicious Pattern detection.
    """
    load_model()
    
    # Rule engine
    security_keywords = ["DROP TABLE", "UNION SELECT", "1=1--", "<script>", "alert(", "eval("]
    for kw in security_keywords:
        if kw.lower() in payload.lower():
            logger.critical(f"SECURITY ALERT: Rule match '{kw}'")
            return True

    # ML Engine
    if _model and _vectorizer:
        try:
            X = _vectorizer.transform([payload])
            prediction = _model.predict(X)[0]
            if prediction == 1:
                logger.critical("SECURITY ALERT: ML engine flagged request.")
                return True
        except: pass
            
    return False
