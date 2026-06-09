import { Router } from 'express';
import { ProgramsController } from './programs.controller';
import { authenticate, authorizeRoles } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  listProgramsQuerySchema,
  programIdParamSchema,
  createProgramSchema,
  updateProgramSchema,
  quarterDueDatesQuerySchema,
  backfillQuarterDueDatesSchema,
} from './programs.schema';

const router = Router();
const programsController = new ProgramsController();

// Publicly readable endpoints (filterable)
router.get('/', validate(listProgramsQuerySchema), programsController.listPrograms);
router.get('/:id', validate(programIdParamSchema), programsController.getProgramById);

// Admin-only mutation endpoints
router.use(authenticate);
router.use(authorizeRoles('admin'));

router.post('/', validate(createProgramSchema), programsController.createProgram);
router.post(
  '/quarter-due-dates/backfill',
  validate(backfillQuarterDueDatesSchema),
  programsController.backfillQuarterDueDates
);
router.get(
  '/:id/quarter-due-dates',
  validate(quarterDueDatesQuerySchema),
  programsController.getProgramQuarterDueDates
);
router.put('/:id', validate(updateProgramSchema), programsController.updateProgram);
router.delete('/:id', validate(programIdParamSchema), programsController.deleteProgram);

export default router;
