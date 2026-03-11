import { Router } from 'express';
import { swapItem } from '../controllers/outfits';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { swapItemSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/:outfitId/swap-item', validate(swapItemSchema), swapItem);

export default router;
