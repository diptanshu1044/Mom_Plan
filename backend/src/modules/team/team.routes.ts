import { Router } from 'express';
import { TeamController } from './team.controller';
import { authenticateOrgUser, requireOrgRole } from '../partner/partner-auth.middleware';
import { validate } from '../../middleware/validate';
import {
  bulkCreateMembersSchema,
  memberIdParamsSchema,
  updateMemberStatusSchema,
} from './team.schema';

const router = Router();
const ctrl = new TeamController();

router.use(authenticateOrgUser, requireOrgRole('admin'));

router.get('/', ctrl.listMembers.bind(ctrl));
router.post('/bulk-create', validate(bulkCreateMembersSchema), ctrl.bulkCreate.bind(ctrl));
router.delete('/:id', validate(memberIdParamsSchema), ctrl.deleteMember.bind(ctrl));
router.post('/:id/reset-password', validate(memberIdParamsSchema), ctrl.resetPassword.bind(ctrl));
router.patch('/:id/status', validate(updateMemberStatusSchema), ctrl.updateStatus.bind(ctrl));

export default router;
