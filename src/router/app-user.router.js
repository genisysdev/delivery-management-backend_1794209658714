import express from 'express';
import { verifyToken } from '../middleware/verify-token.middleware.js';
import {
  addAppUser,
  getAllAppUsers,
  checkAccess,
  updateAppUser,
  deleteAppUser,
  getAppUsersByRole
} from '../controller/app-user.controller.js';

const router = express.Router();

// get all app users
router.get('/', verifyToken, getAllAppUsers);

//get app users by Role 
router.get('/app_user_by_role/:role?', verifyToken, getAppUsersByRole);

// Endpoint to check user access
router.get('/check-access', verifyToken, checkAccess);

// create a app user
router.post('/', verifyToken, addAppUser);

router.put('/:id', verifyToken, updateAppUser); 

router.delete('/:id', verifyToken, deleteAppUser); 

export default router;
