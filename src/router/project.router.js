import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
  getAllProjects,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controller/project.controller.js';

// get all projects
router.get('/allprojects', verifyToken, getAllProjects);

// get projects by UserType
router.get('/', verifyToken, getProjects);

// get project by id
router.get('/:id', verifyToken, getProject);

// create a project
router.post('/', verifyToken, createProject);

// update a project
router.put('/:id', verifyToken, updateProject);

// delete a project
router.delete('/:id', verifyToken, deleteProject);

export default router;
