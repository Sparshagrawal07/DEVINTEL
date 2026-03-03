import { Router } from 'express';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';
import { GitHubRepository } from './github.repository';
import { authenticate, requireOnboarded } from '../../middleware';
import { asyncHandler } from '../../utils';

const router = Router();

const ghRepo = new GitHubRepository();
const ghService = new GitHubService(ghRepo);
const ghController = new GitHubController(ghService);

router.post('/sync', authenticate, requireOnboarded, asyncHandler(ghController.fullSync));
router.post('/sync/repos', authenticate, requireOnboarded, asyncHandler(ghController.syncRepos));
router.post('/sync/commits', authenticate, requireOnboarded, asyncHandler(ghController.syncCommits));
router.post('/sync/prs', authenticate, requireOnboarded, asyncHandler(ghController.syncPRs));
router.get('/repos', authenticate, requireOnboarded, asyncHandler(ghController.getRepos));
router.get('/metrics', authenticate, requireOnboarded, asyncHandler(ghController.getMetrics));

export default router;
