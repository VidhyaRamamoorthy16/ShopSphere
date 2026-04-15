const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Not authorized to access this route" });
    }

    // Verify Token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: Required role not found" });
    }
    next();
  };
};
