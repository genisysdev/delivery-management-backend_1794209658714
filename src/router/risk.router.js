import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
  getRisks,
  getRiskByProjectId,
  createRisk,
  updateRisk,
  deleteRisk,
} from '../controller/risk.controller.js';

// get all risks
router.get('/', verifyToken, getRisks);

// get risk by id
router.get('/:id', verifyToken, getRiskByProjectId);

// create a risk
router.post('/', verifyToken, createRisk);

// update a risk
router.put('/:id', verifyToken, updateRisk);

// delete a risk
router.delete('/:id', verifyToken, deleteRisk);

export default router;
