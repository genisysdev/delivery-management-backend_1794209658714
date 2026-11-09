import express from 'express';
const router = express.Router();

import {
  getSprintSummaries,
  createSprintSummary,
  updateSprintSummary,
  deleteSprintSummary,
  getSprintsByProject,
} from '../controller/sprint-summary.controller.js';

// Get all sprint summaries
router.get('/', getSprintSummaries);

// Get all sprints for a project
router.get('/:prjCode', getSprintsByProject);

// Create a new sprint summary
router.post('/', createSprintSummary);

// Update an existing sprint summary
router.put('/:id', updateSprintSummary);

// Delete a sprint summary
router.delete('/:id', deleteSprintSummary);

export default router;
