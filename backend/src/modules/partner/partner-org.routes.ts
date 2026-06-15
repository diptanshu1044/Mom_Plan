import { Router } from 'express';
import { PartnerOrgController } from './partner-org.controller';
import { authenticateOrgUser } from './partner-auth.middleware';

const router = Router();
const ctrl = new PartnerOrgController();

router.get('/',                    authenticateOrgUser, ctrl.getOrganization.bind(ctrl));
router.post('/onboarding/complete', authenticateOrgUser, ctrl.completeOnboarding.bind(ctrl));

export default router;
