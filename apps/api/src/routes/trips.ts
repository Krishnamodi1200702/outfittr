import { Router } from 'express';
import { listTrips, createTrip, getTrip, deleteTrip, refreshWeather } from '../controllers/trips';
import { generateOutfits } from '../controllers/outfits';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTripSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', listTrips);
router.post('/', validate(createTripSchema), createTrip);
router.get('/:id', getTrip);
router.delete('/:id', deleteTrip);
router.post('/:id/refresh-weather', refreshWeather);
router.post('/:id/generate-outfits', generateOutfits);

export default router;
