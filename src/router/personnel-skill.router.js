import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
  getPersonnelSkills,
  createPersonnelSkill,
  updatePersonnelSkill,
  deletePersonnelSkill,
} from '../controller/personnel-skill.controller.js';

// get all personnel skills
router.get('/', verifyToken, getPersonnelSkills);

// create a personnel skill
router.post('/', verifyToken, createPersonnelSkill);

// update a personnel skill
router.put('/:id', verifyToken, updatePersonnelSkill);

// delete a personnel skill
router.delete('/:id', verifyToken, deletePersonnelSkill);

export default router;
