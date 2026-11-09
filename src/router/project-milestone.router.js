import express from 'express';
import {
    createProjectMilestone,
    updateProjectMilestone,
    deleteProjectMilestone,
    getProjectMilestones,
    getProjectMilestoneById
} from '../controller/project-milestone.controller.js';
import { verifyToken } from '../middleware/verify-token.middleware.js';

const router = express.Router();

// For creating milestone
router.post('/', verifyToken, createProjectMilestone);

// For updating milestone
router.put('/:id', verifyToken, updateProjectMilestone);

// For deleting milestone
router.delete('/:id', verifyToken, deleteProjectMilestone);

// For getting all milestones of project
router.get('/', verifyToken, getProjectMilestones);

// For getting individual milestone
router.get('/:id', verifyToken, getProjectMilestoneById);

export default router;
