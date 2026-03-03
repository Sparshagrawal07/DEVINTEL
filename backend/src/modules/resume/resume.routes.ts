import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { StatusCodes } from 'http-status-codes';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeRepository } from './resume.repository';
import { ResumeBuilderService } from './resume-builder.service';
import { authenticate, uploadRateLimit, requireOnboarded } from '../../middleware';
import { asyncHandler } from '../../utils';
import { getEnv } from '../../config/env';

const router = Router();

const resumeRepo = new ResumeRepository();
const resumeService = new ResumeService(resumeRepo);
const resumeController = new ResumeController(resumeService);
const builderService = new ResumeBuilderService();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = getEnv().UPLOAD_DIR;
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: getEnv().MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// ── Resume Analyzer (legacy) ──
router.post('/upload', authenticate, requireOnboarded, uploadRateLimit, upload.single('resume'), asyncHandler(resumeController.upload));
router.post('/analyze', authenticate, requireOnboarded, uploadRateLimit, upload.single('resume'), asyncHandler(resumeController.uploadAndProcess));
router.post('/:id/process', authenticate, requireOnboarded, asyncHandler(resumeController.process));
router.get('/analyses', authenticate, requireOnboarded, asyncHandler(resumeController.getAll));

// ── Resume Builder ──
router.post(
  '/generate',
  authenticate,
  requireOnboarded,
  asyncHandler(async (req: Request, res: Response) => {
    const { sections, template } = req.body;
    const resume = await builderService.generate(req.user!.userId, sections, template);
    res.status(StatusCodes.CREATED).json({ status: 'success', data: resume });
  })
);

router.get(
  '/generated',
  authenticate,
  requireOnboarded,
  asyncHandler(async (req: Request, res: Response) => {
    const list = await builderService.getHistory(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: list });
  })
);

router.get(
  '/generated/:id',
  authenticate,
  requireOnboarded,
  asyncHandler(async (req: Request, res: Response) => {
    const resume = await builderService.getById(req.user!.userId, req.params.id);
    if (!resume) {
      res.status(StatusCodes.NOT_FOUND).json({ status: 'error', message: 'Resume not found' });
      return;
    }
    res.status(StatusCodes.OK).json({ status: 'success', data: resume });
  })
);

// Must come after /analyses and /generated to avoid param collision
router.get('/:id', authenticate, requireOnboarded, asyncHandler(resumeController.getOne));

export default router;
