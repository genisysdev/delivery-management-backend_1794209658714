import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
    getProjectAssignments,
    createProjectAssignment,
    updateProjectAssignment,
    deleteProjectAssignment,
    searchProjectAssignmentByEmpName,
    searchProjectAssignmentByPrjId,
    searchProjectAssignmentByPrjName,
    getEmployeeProjectAssignments
} from '../controller/project-assignment.controller.js';

// get all project assignment
router.get('/', verifyToken, getProjectAssignments);

// create project assignment
router.post('/', verifyToken, createProjectAssignment);

// update project assignment
router.put('/:id', verifyToken, updateProjectAssignment);

// delete project assignment
router.delete('/:id', verifyToken, deleteProjectAssignment);

// search a project assignment by employee name
router.get('/search/empName', verifyToken, searchProjectAssignmentByEmpName);

// search a project assignment by project id
router.get('/search/prjId', verifyToken, searchProjectAssignmentByPrjId);

// search a project assignment by project name
router.get('/search/prjName', verifyToken, searchProjectAssignmentByPrjName);

router.get('/employee/:genisysId', verifyToken, getEmployeeProjectAssignments);

export default router;
