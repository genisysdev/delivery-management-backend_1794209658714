import express from 'express';
import { verifyToken } from '../middleware/verify-token.middleware.js';
import {
  getEmployees,
  getEmployeesforAssignment,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controller/employee.controller.js';

const router = express.Router();

// get all employees
router.get('/:roleFilter',verifyToken, getEmployees);

// Get all billable employees
router.get('/assignment', verifyToken, getEmployeesforAssignment);

// get employee by id
router.get('/:id', verifyToken, getEmployee);

// create a employee
router.post('/', verifyToken, createEmployee);

// update a employee
router.put('/:id', verifyToken, updateEmployee);

// delete a employee
router.delete('/:id', verifyToken, deleteEmployee);

export default router;
