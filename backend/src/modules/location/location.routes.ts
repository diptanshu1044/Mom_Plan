import { Router } from 'express';
import { LocationController } from './location.controller';
import { validate } from '../../middleware/validate';
import { validateZipSchema } from './location.schema';
import { withControllerLog } from '../../utils/controllerLog';

const router = Router();
const locationController = withControllerLog(new LocationController(), 'location');

router.post('/validate-zip', validate(validateZipSchema), locationController.validateZip);

export default router;
