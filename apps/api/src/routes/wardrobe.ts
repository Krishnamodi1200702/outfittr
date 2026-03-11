import { Router } from 'express';
import { listItems, createItem, updateItem, deleteItem } from '../controllers/wardrobe';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createWardrobeItemSchema, updateWardrobeItemSchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get('/', listItems);
router.post('/', validate(createWardrobeItemSchema), createItem);
router.put('/:id', validate(updateWardrobeItemSchema), updateItem);
router.delete('/:id', deleteItem);

export default router;
