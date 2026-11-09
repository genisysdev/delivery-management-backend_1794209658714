import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
    getAllCapacity,
    getCombinedCapacity,
    createCapacity,
    updateCapacity,
    deleteCapacity,
} from '../controller/capacity-tracker.controller.js';

// get all Capacities
router.get('/all', verifyToken, getAllCapacity);

// get Capacity by id
router.get('/', verifyToken, getCombinedCapacity);

// create a Capacity
router.post('/', verifyToken, createCapacity);

// update a Capacity
router.put('/:genisysId', verifyToken, updateCapacity);

// delete a Capacity
router.delete('/:genisysId', verifyToken, deleteCapacity);

export default router;
