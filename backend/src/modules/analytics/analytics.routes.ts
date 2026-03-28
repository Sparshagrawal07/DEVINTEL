import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { ResumeRepository } from '../resume/resume.repository';
import { authenticate } from '../../middleware';
import { validate, asyncHandler } from '../../utils';
import { createCareerTargetSchema, updateCareerTargetSchema } from './analytics.validation';

const router = Router();

const analyticsRepo = new AnalyticsRepository();
const resumeRepo = new ResumeRepository();
const analyticsService = new AnalyticsService(analyticsRepo, resumeRepo);
const analyticsController = new AnalyticsController(analyticsService);

router.post('/score/compute', authenticate, asyncHandler(analyticsController.computeScore));
router.get('/dashboard', authenticate, asyncHandler(analyticsController.getDashboard));
router.get('/score/trend', authenticate, asyncHandler(analyticsController.getScoreTrend));
router.get('/skills', authenticate, asyncHandler(analyticsController.getSkills));

// Career targets
router.post('/targets', authenticate, validate(createCareerTargetSchema), asyncHandler(analyticsController.createTarget));
router.get('/targets', authenticate, asyncHandler(analyticsController.getTargets));
router.patch('/targets/:id', authenticate, validate(updateCareerTargetSchema), asyncHandler(analyticsController.updateTarget));
router.delete('/targets/:id', authenticate, asyncHandler(analyticsController.deleteTarget));

export default router;
