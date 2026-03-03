import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { OnboardingService } from './onboarding.service';

export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  getStatus = async (req: Request, res: Response): Promise<void> => {
    const status = await this.service.getStatus(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: status });
  };

  checkUsername = async (req: Request, res: Response): Promise<void> => {
    const { username } = req.params;
    const result = await this.service.checkUsername(username, req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', data: result });
  };

  stepUsername = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepUsername(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Username saved' });
  };

  stepPassword = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepPassword(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Password saved' });
  };

  stepProfile = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepProfile(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Profile saved' });
  };

  stepBio = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepBio(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Bio saved' });
  };

  stepLinks = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepLinks(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Links saved' });
  };

  stepEducation = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepEducation(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Education saved' });
  };

  stepSkills = async (req: Request, res: Response): Promise<void> => {
    await this.service.stepSkills(req.user!.userId, req.body);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Skills saved' });
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    await this.service.complete(req.user!.userId);
    res.status(StatusCodes.OK).json({ status: 'success', message: 'Onboarding complete' });
  };
}
