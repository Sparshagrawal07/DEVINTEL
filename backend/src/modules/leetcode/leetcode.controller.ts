import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { LeetCodeService } from './leetcode.service';
import { cacheDelete } from '../../config/redis';

export class LeetCodeController {
  constructor(private readonly lcService: LeetCodeService) {}

  connect = async (req: Request, res: Response): Promise<void> => {
    const { username } = req.body;
    const stats = await this.lcService.connect(req.user!.userId, username);
    res.status(StatusCodes.OK).json({ status: 'success', data: { stats } });
  };

  disconnect = async (req: Request, res: Response): Promise<void> => {
    await this.lcService.disconnect(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'LeetCode disconnected' });
  };

  sync = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const stats = await this.lcService.syncProfile(userId);
    await cacheDelete(`dashboard:${userId}`);
    res.status(StatusCodes.OK).json({ status: 'success', data: { stats } });
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.lcService.getStats(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: { stats } });
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.lcService.getProfile(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: { profile } });
  };
}
