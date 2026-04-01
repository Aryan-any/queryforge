import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow auth routes without session
  if (req.path.startsWith('/api/auth')) {
    next();
    return;
  }

  // Allow shared dashboards without session
  if (req.path.startsWith('/api/dashboards/shared/')) {
    next();
    return;
  }

  if (!req.session?.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
    return;
  }

  next();
}
