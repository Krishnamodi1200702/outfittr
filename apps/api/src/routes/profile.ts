import { Router } from 'express';
import { getStyleProfile, upsertStyleProfile } from '../controllers/profile';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { styleProfileSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/style', getStyleProfile);
router.put('/style', validate(styleProfileSchema), upsertStyleProfile);

export default router;
