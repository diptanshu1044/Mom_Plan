import { Router } from 'express';
import { EligibilityController } from './eligibility.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getResultParamSchema, getResultsQuerySchema } from './eligibility.schema';
import { withControllerLog } from '../../utils/controllerLog';

const router = Router();
const eligibilityController = withControllerLog(new EligibilityController(), 'eligibility');

router.use(authenticate);

router.post('/scan', eligibilityController.runScan);
router.get('/results', validate(getResultsQuerySchema), eligibilityController.getResults);
router.get('/results/:programId', validate(getResultParamSchema), eligibilityController.getResultByProgramId);

export default router;
