import { Router } from 'express';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';
import { GitHubRepository } from './github.repository';
import { authenticate } from '../../middleware';
import { asyncHandler } from '../../utils';

const router = Router();

const ghRepo = new GitHubRepository();
const ghService = new GitHubService(ghRepo);
const ghController = new GitHubController(ghService);

router.post('/sync', authenticate, asyncHandler(ghController.fullSync));
router.post('/sync/repos', authenticate, asyncHandler(ghController.syncRepos));
router.post('/sync/commits', authenticate, asyncHandler(ghController.syncCommits));
router.post('/sync/prs', authenticate, asyncHandler(ghController.syncPRs));
router.get('/repos', authenticate, asyncHandler(ghController.getRepos));
router.get('/metrics', authenticate, asyncHandler(ghController.getMetrics));

export default router;
