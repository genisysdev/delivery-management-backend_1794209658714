import express from 'express';
const router = express.Router();
import {
  getDependencies,
  getDependenciesByProject,
  createDependency,
  updateDependency,
  deleteDependency,
} from '../controller/dependency.controller.js';

// Get all dependencies
router.get('/',getDependencies);

// Get Dependency by PrjCode
router.get('/:prjCode',getDependenciesByProject);

// Create a new dependency
router.post('/', createDependency);

// Update an existing dependency
router.put('/:id', updateDependency);

// Delete a dependency
router.delete('/:id', deleteDependency);

export default router;
