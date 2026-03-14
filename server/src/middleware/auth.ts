import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string | undefined;
  req.userId = userId;
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'x-user-id header required' });
    return;
  }
  next();
}
