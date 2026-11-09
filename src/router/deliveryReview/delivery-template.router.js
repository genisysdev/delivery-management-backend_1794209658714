import express from 'express';
import { verifyToken } from '../../middleware/verify-token.middleware.js';
import {
    createDeliveryTemplate,
    getDeliveryTemplates,
    getDeliveryTemplateById,
    updateDeliveryTemplate,
    deleteDeliveryTemplate
} from '../../controller/deliveryReview/delivery-template.controller.js';

const router = express.Router();

router.post('/create',verifyToken,createDeliveryTemplate);
router.get('/',verifyToken,getDeliveryTemplates);
router.get('/:deliveryTemplateId',verifyToken,getDeliveryTemplateById);
router.put('/delete',verifyToken,deleteDeliveryTemplate)
router.put('/:deliveryTemplateId',verifyToken,updateDeliveryTemplate);
export default router;