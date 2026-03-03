import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GitHubService } from './github.service';
import { cacheDelete } from '../../config/redis';

export class GitHubController {
  constructor(private readonly ghService: GitHubService) {}

  syncRepos = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const result = await this.ghService.syncRepositories(userId);
    await cacheDelete(`dashboard:${userId}`);
    res.status(StatusCodes.OK).json({ status: 'success', data: result });
  };

  syncCommits = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { repoId } = req.query;
    const result = await this.ghService.syncCommits(userId, repoId as string | undefined);
    await cacheDelete(`dashboard:${userId}`);
    res.status(StatusCodes.OK).json({ status: 'success', data: result });
  };

  syncPRs = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const result = await this.ghService.syncPullRequests(userId);
    await cacheDelete(`dashboard:${userId}`);
    res.status(StatusCodes.OK).json({ status: 'success', data: result });
  };

  getRepos = async (req: Request, res: Response): Promise<void> => {
    const repos = await this.ghService.getRepositories(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: { repositories: repos } });
  };

  getMetrics = async (req: Request, res: Response): Promise<void> => {
    const metrics = await this.ghService.computeIntelligenceMetrics(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: { metrics } });
  };

  fullSync = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const repoResult = await this.ghService.syncRepositories(userId);
    const commitResult = await this.ghService.syncCommits(userId);
    const prResult = await this.ghService.syncPullRequests(userId);

    // Invalidate dashboard cache so fresh data is returned immediately
    await cacheDelete(`dashboard:${userId}`);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: {
        repositories: repoResult.synced,
        commits: commitResult.synced,
        pullRequests: prResult.synced,
      },
    });
  };
}
