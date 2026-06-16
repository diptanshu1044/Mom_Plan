import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { MotherOrgEnrollmentService } from './mother-org-enrollment.service';

const router = Router();
const svc = new MotherOrgEnrollmentService();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listPartnerOrganizations();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
