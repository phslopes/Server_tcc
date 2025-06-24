// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'No token provided. Access denied.' }); // RN001
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token. Access forbidden.' }); // RN001
        }
        req.user = user; // Attach user payload (id, username, role) to the request
        next();
    });
};

const authorizeRole = (roles) => { // RN002
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action.' }); // RN002
        }
        next();
    };
};

export { authenticateToken, authorizeRole };