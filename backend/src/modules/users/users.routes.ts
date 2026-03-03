import { Router } from 'express';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { authenticate, requireOnboarded } from '../../middleware';
import { validate, asyncHandler } from '../../utils';
import { updateProfileSchema } from './users.validation';

const router = Router();

const usersRepo = new UsersRepository();
const usersService = new UsersService(usersRepo);
const usersController = new UsersController(usersService);

router.get('/me', authenticate, asyncHandler(usersController.getMyProfile));
router.patch('/me', authenticate, requireOnboarded, validate(updateProfileSchema), asyncHandler(usersController.updateProfile));
router.get('/me/stats', authenticate, requireOnboarded, asyncHandler(usersController.getStats));
router.delete('/me', authenticate, requireOnboarded, asyncHandler(usersController.deleteAccount));
router.get('/:username', asyncHandler(usersController.getByUsername));

export default router;
