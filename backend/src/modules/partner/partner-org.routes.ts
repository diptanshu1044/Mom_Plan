import { Router } from 'express';
import { PartnerOrgController } from './partner-org.controller';
import { authenticateOrgUser, requireOrgRole } from './partner-auth.middleware';

const router = Router();
const ctrl = new PartnerOrgController();

router.get(
  '/',
  authenticateOrgUser,
  requireOrgRole('admin'),
  ctrl.getOrganization.bind(ctrl)
);
router.post(
  '/onboarding/complete',
  authenticateOrgUser,
  ctrl.completeOnboarding.bind(ctrl)
);

export default router;
