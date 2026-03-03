import { Router } from 'express';
import { LeetCodeController } from './leetcode.controller';
import { LeetCodeService } from './leetcode.service';
import { LeetCodeRepository } from './leetcode.repository';
import { authenticate, requireOnboarded } from '../../middleware';
import { validate, asyncHandler } from '../../utils';
import { connectLeetCodeSchema } from './leetcode.validation';

const router = Router();

const lcRepo = new LeetCodeRepository();
const lcService = new LeetCodeService(lcRepo);
const lcController = new LeetCodeController(lcService);

router.post('/connect', authenticate, requireOnboarded, validate(connectLeetCodeSchema), asyncHandler(lcController.connect));
router.post('/disconnect', authenticate, requireOnboarded, asyncHandler(lcController.disconnect));
router.post('/sync', authenticate, requireOnboarded, asyncHandler(lcController.sync));
router.get('/stats', authenticate, requireOnboarded, asyncHandler(lcController.getStats));
router.get('/profile', authenticate, requireOnboarded, asyncHandler(lcController.getProfile));

export default router;
