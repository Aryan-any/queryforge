import { Router, Request, Response } from 'express';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate with fixed demo credentials.
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required' });
    return;
  }

  const validUser = process.env.QUERYFORGE_ADMIN_USER || config.auth.username;
  const validPass = process.env.QUERYFORGE_ADMIN_PASS || config.auth.password;

  if (username !== validUser || password !== validPass) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }

  // Set session
  req.session.user = {
    userId: 'demo-user',
    username: config.auth.username,
  };

  logger.info('User logged in', { username });

  res.json({
    success: true,
    data: {
      username: config.auth.username,
      message: 'Logged in successfully',
    },
  });
});

/**
 * POST /api/auth/logout
 * Destroy the session.
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy error', { error: err.message });
      res.status(500).json({ success: false, error: 'Logout failed' });
      return;
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * GET /api/auth/session
 * Check if the user is authenticated.
 */
router.get('/session', (req: Request, res: Response) => {
  if (req.session?.user) {
    res.json({
      success: true,
      data: {
        authenticated: true,
        username: req.session.user.username,
        hasConnection: !!req.session.activeConnection,
        connectionType: req.session.activeConnection === 'demo' ? 'demo' : 'custom',
      },
    });
  } else {
    res.json({
      success: true,
      data: { authenticated: false },
    });
  }
});

export default router;
