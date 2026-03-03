import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../config/database';
import { ForbiddenError } from '../utils/errors';

/**
 * Middleware that blocks access for users who haven't completed onboarding.
 * Must be used AFTER `authenticate` middleware.
 * Returns 403 with code ONBOARDING_REQUIRED so frontend can redirect.
 */
export function requireOnboarded(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.user?.userId;
  if (!userId) {
    throw new ForbiddenError('Authentication required');
  }

  queryOne<{ is_onboarded: boolean }>('SELECT is_onboarded FROM users WHERE id = $1', [userId])
    .then((user) => {
      if (!user || !user.is_onboarded) {
        const err = new ForbiddenError('Onboarding not completed');
        (err as any).code = 'ONBOARDING_REQUIRED';
        throw err;
      }
      next();
    })
    .catch(next);
}
