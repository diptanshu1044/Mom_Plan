import { Request, Response, NextFunction } from 'express';
import { PartnerCasesService } from './partner-cases.service';
import { UnauthorizedError } from '../../utils/errors';

const svc = new PartnerCasesService();

export class PartnerCasesController {
  async createCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.orgUser) throw new UnauthorizedError('Not authenticated');
      const data = await svc.createCase(req.orgUser.orgId, req.orgUser.orgUserId, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async listCases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.orgUser) throw new UnauthorizedError('Not authenticated');
      const data = await svc.listCases(req.orgUser.orgId, {
        quarter: req.query.quarter as string | undefined,
        year: req.query.year ? Number(req.query.year) : undefined,
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        program: req.query.program as string | undefined,
        caseworker: req.query.caseworker as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.orgUser) throw new UnauthorizedError('Not authenticated');
      const data = await svc.getCaseDetail(req.orgUser.orgId, req.params.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.orgUser) throw new UnauthorizedError('Not authenticated');
      const data = await svc.getDashboardSummary(
        req.orgUser.orgId,
        req.query.quarter as string | undefined,
        req.query.year ? Number(req.query.year) : undefined
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.orgUser) throw new UnauthorizedError('Not authenticated');
      const data = await svc.getFilterOptions(req.orgUser.orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async sendReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.orgUser) throw new UnauthorizedError('Not authenticated');
      const data = await svc.sendReminder(req.orgUser.orgId, req.params.id, req.orgUser.orgUserId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
