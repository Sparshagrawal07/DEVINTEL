import { Router } from 'express';
import { LeetCodeController } from './leetcode.controller';
import { LeetCodeService } from './leetcode.service';
import { LeetCodeRepository } from './leetcode.repository';
import { authenticate } from '../../middleware';
import { validate, asyncHandler } from '../../utils';
import { connectLeetCodeSchema } from './leetcode.validation';

const router = Router();

const lcRepo = new LeetCodeRepository();
const lcService = new LeetCodeService(lcRepo);
const lcController = new LeetCodeController(lcService);

router.post('/connect', authenticate, validate(connectLeetCodeSchema), asyncHandler(lcController.connect));
router.post('/disconnect', authenticate, asyncHandler(lcController.disconnect));
router.post('/sync', authenticate, asyncHandler(lcController.sync));
router.get('/stats', authenticate, asyncHandler(lcController.getStats));
router.get('/profile', authenticate, asyncHandler(lcController.getProfile));

export default router;
