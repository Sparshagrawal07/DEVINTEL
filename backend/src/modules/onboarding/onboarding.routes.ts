import { Router } from 'express';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingRepository } from './onboarding.repository';
import { authenticate, authRateLimit } from '../../middleware';
import { validate, asyncHandler } from '../../utils';
import {
  stepUsernameSchema,
  stepPasswordSchema,
  stepProfileSchema,
  stepBioSchema,
  stepLinksSchema,
  stepEducationSchema,
  stepSkillsSchema,
} from './onboarding.validation';

const router = Router();

const repo = new OnboardingRepository();
const service = new OnboardingService(repo);
const controller = new OnboardingController(service);

// All onboarding routes require authentication but NOT requireOnboarded
router.use(authenticate);

router.get('/status', asyncHandler(controller.getStatus));
router.get('/check-username/:username', asyncHandler(controller.checkUsername));

router.post('/step/username', authRateLimit, validate(stepUsernameSchema), asyncHandler(controller.stepUsername));
router.post('/step/password', authRateLimit, validate(stepPasswordSchema), asyncHandler(controller.stepPassword));
router.post('/step/profile', validate(stepProfileSchema), asyncHandler(controller.stepProfile));
router.post('/step/bio', validate(stepBioSchema), asyncHandler(controller.stepBio));
router.post('/step/links', validate(stepLinksSchema), asyncHandler(controller.stepLinks));
router.post('/step/education', validate(stepEducationSchema), asyncHandler(controller.stepEducation));
router.post('/step/skills', validate(stepSkillsSchema), asyncHandler(controller.stepSkills));
router.post('/complete', asyncHandler(controller.complete));

export default router;
