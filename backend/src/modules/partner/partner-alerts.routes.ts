import { Router } from 'express';
import { PartnerAlertsController } from './partner-alerts.controller';
import { authenticateOrgUser } from './partner-auth.middleware';

const router = Router();
const ctrl = new PartnerAlertsController();

router.get('/summary', authenticateOrgUser, ctrl.getSummary.bind(ctrl));
router.get('/', authenticateOrgUser, ctrl.listAlerts.bind(ctrl));
router.post('/:id/snooze', authenticateOrgUser, ctrl.snoozeAlert.bind(ctrl));

export default router;
