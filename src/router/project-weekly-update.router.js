import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
    getProjectWeeklyUpdates,
    createProjectWeeklyUpdate,
    updateProjectWeeklyUpdate,
    getProjectTeamMembersByPrjCode
} from '../controller/project-weekly-update.controller.js';

// get project weekly update by id
router.get('/:id', verifyToken, getProjectWeeklyUpdates);

// create a project weekly update
router.post('/', verifyToken, createProjectWeeklyUpdate);

// update a project weekly update
router.put('/', verifyToken, updateProjectWeeklyUpdate);

router.get('/team/:id', verifyToken, getProjectTeamMembersByPrjCode);

export default router;
