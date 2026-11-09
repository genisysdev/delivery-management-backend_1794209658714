import express from 'express';
import { verifyToken } from '../../middleware/verify-token.middleware.js';
import { createDeliveryReview, getDeliveryReview } from '../../controller/deliveryReview/delivery-review.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/:deliveryAssignmentId', getDeliveryReview);
router.post('/',createDeliveryReview); 
export default router;