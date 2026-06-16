import { Router } from 'express';
import { PartnerAuthController } from './partner-auth.controller';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimiter';
import {
  partnerRegisterSchema,
  partnerLoginSchema,
  partnerRefreshSchema,
  partnerChangePasswordSchema,
} from './partner-auth.schema';
import { authenticateOrgUser } from './partner-auth.middleware';

const router = Router();
const ctrl = new PartnerAuthController();

router.post('/register', authLimiter, validate(partnerRegisterSchema), ctrl.register.bind(ctrl));
router.post('/login',    authLimiter, validate(partnerLoginSchema),    ctrl.login.bind(ctrl));
router.post('/logout',   ctrl.logout.bind(ctrl));
router.post('/refresh',  validate(partnerRefreshSchema),               ctrl.refresh.bind(ctrl));
router.post('/change-password', authenticateOrgUser, validate(partnerChangePasswordSchema), ctrl.changePassword.bind(ctrl));

export default router;
