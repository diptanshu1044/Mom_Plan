import { Router } from 'express';
import { MothersController } from './mothers.controller';
import { authenticateOrgUser, requireOrgRole } from '../partner/partner-auth.middleware';
import { validate } from '../../middleware/validate';
import { assignCaseworkerSchema } from './mothers.schema';

const router = Router();
const ctrl = new MothersController();

router.get('/', authenticateOrgUser, ctrl.listMothers.bind(ctrl));
router.get('/caseworkers', authenticateOrgUser, requireOrgRole('admin'), ctrl.listCaseworkers.bind(ctrl));
router.get('/:id', authenticateOrgUser, ctrl.getMother.bind(ctrl));
router.patch(
  '/:id/assign-caseworker',
  authenticateOrgUser,
  requireOrgRole('admin'),
  validate(assignCaseworkerSchema),
  ctrl.assignCaseworker.bind(ctrl)
);
router.patch(
  '/:id/unassign-caseworker',
  authenticateOrgUser,
  requireOrgRole('admin'),
  ctrl.unassignCaseworker.bind(ctrl)
);

export default router;
