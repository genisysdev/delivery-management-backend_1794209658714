import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
  getSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
} from '../controller/skill.controller.js';

// get all skills
router.get('/', verifyToken, getSkills);

// get skill by id
router.get('/:id', verifyToken, getSkill);

// create a skill
router.post('/', verifyToken, createSkill);

// update a skill
router.put('/:id', verifyToken, updateSkill);

// delete a skill
router.delete('/:id', verifyToken, deleteSkill);

export default router;
