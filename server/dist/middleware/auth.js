"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAuth = requireAuth;
function authMiddleware(req, _res, next) {
    const userId = req.headers['x-user-id'];
    req.userId = userId;
    next();
}
function requireAuth(req, res, next) {
    if (!req.userId) {
        res.status(401).json({ error: 'x-user-id header required' });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map