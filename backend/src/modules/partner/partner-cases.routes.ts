import { Router } from 'express';
import { PartnerCasesController } from './partner-cases.controller';
import { authenticateOrgUser } from './partner-auth.middleware';

const router = Router();
const ctrl = new PartnerCasesController();

router.get('/', authenticateOrgUser, ctrl.listCases.bind(ctrl));
router.get('/filters', authenticateOrgUser, ctrl.getFilters.bind(ctrl));
router.get('/:id', authenticateOrgUser, ctrl.getCase.bind(ctrl));
router.post('/:id/reminder', authenticateOrgUser, ctrl.sendReminder.bind(ctrl));

export default router;
