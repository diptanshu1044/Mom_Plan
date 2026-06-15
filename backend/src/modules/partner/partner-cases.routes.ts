import { Router } from 'express';
import { PartnerCasesController } from './partner-cases.controller';
import { authenticateOrgUser } from './partner-auth.middleware';
import { validate } from '../../middleware/validate';
import { createPartnerCaseSchema } from './partner-cases.schema';

const router = Router();
const ctrl = new PartnerCasesController();

router.post('/', authenticateOrgUser, validate(createPartnerCaseSchema), ctrl.createCase.bind(ctrl));
router.get('/', authenticateOrgUser, ctrl.listCases.bind(ctrl));
router.get('/filters', authenticateOrgUser, ctrl.getFilters.bind(ctrl));
router.get('/:id', authenticateOrgUser, ctrl.getCase.bind(ctrl));
router.post('/:id/reminder', authenticateOrgUser, ctrl.sendReminder.bind(ctrl));

export default router;
