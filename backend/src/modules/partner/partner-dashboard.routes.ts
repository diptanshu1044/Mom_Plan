import { Router } from 'express';
import { PartnerCasesController } from './partner-cases.controller';
import { authenticateOrgUser } from './partner-auth.middleware';

const router = Router();
const ctrl = new PartnerCasesController();

router.get('/summary', authenticateOrgUser, ctrl.getSummary.bind(ctrl));

export default router;
