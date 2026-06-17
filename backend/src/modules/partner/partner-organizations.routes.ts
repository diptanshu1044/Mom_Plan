import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { MotherOrgEnrollmentService } from './mother-org-enrollment.service';
import { logHandler } from '../../utils/controllerLog';

const router = Router();
const svc = new MotherOrgEnrollmentService();

router.get(
  '/',
  logHandler('partner.organizations', 'listPartnerOrganizations', async (_req, res, next) => {
    try {
      const data = await svc.listPartnerOrganizations();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  })
);

export default router;
