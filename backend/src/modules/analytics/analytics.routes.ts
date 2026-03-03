import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { ResumeRepository } from '../resume/resume.repository';
import { authenticate, requireOnboarded } from '../../middleware';
import { validate, asyncHandler } from '../../utils';
import { createCareerTargetSchema, updateCareerTargetSchema } from './analytics.validation';

const router = Router();

const analyticsRepo = new AnalyticsRepository();
const resumeRepo = new ResumeRepository();
const analyticsService = new AnalyticsService(analyticsRepo, resumeRepo);
const analyticsController = new AnalyticsController(analyticsService);

router.post('/score/compute', authenticate, requireOnboarded, asyncHandler(analyticsController.computeScore));
router.get('/dashboard', authenticate, requireOnboarded, asyncHandler(analyticsController.getDashboard));
router.get('/score/trend', authenticate, requireOnboarded, asyncHandler(analyticsController.getScoreTrend));
router.get('/skills', authenticate, requireOnboarded, asyncHandler(analyticsController.getSkills));

// Career targets
router.post('/targets', authenticate, requireOnboarded, validate(createCareerTargetSchema), asyncHandler(analyticsController.createTarget));
router.get('/targets', authenticate, requireOnboarded, asyncHandler(analyticsController.getTargets));
router.patch('/targets/:id', authenticate, requireOnboarded, validate(updateCareerTargetSchema), asyncHandler(analyticsController.updateTarget));
router.delete('/targets/:id', authenticate, requireOnboarded, asyncHandler(analyticsController.deleteTarget));

export default router;
