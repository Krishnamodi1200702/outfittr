import { Router } from 'express';
import {
  swapItem,
  submitFeedback,
  getFeedback,
  getPersonalizationSummary,
} from '../controllers/outfits';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { swapItemSchema, outfitFeedbackSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.post('/:outfitId/swap-item', validate(swapItemSchema), swapItem);
router.post('/:outfitId/feedback', validate(outfitFeedbackSchema), submitFeedback);
router.get('/:outfitId/feedback', getFeedback);
router.get('/personalization/summary', getPersonalizationSummary);

export default router;
