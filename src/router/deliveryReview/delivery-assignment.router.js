import express from 'express';
import { verifyToken } from '../../middleware/verify-token.middleware.js';
import {createDeliveryAssignment, getAllDeliveryAssignments, getDeliveryAssignments} from '../../controller/deliveryReview/delivery-assignment.controller.js';

const router = express.Router();

router.post('/create',verifyToken, createDeliveryAssignment);
router.get('/all',verifyToken,getAllDeliveryAssignments);
router.get('/',verifyToken,getDeliveryAssignments)

export default router;