import express from "express";
import { verifyToken } from '../../middleware/verify-token.middleware.js';
import projectRouter from './project.route.js'
import { createTimeSheet, generateReport, getSubmittedTimeSheets, getTimeSheets, updateTimeSheet } from "../../controller/time-sheet/time-sheet.controller.js";
import { approveTimeSheet, getApprovedTimeSheets, revokeTimeSheet } from "../../controller/time-sheet/approval.controller.js";
const router = express.Router();

router.use('/projects', verifyToken, projectRouter);

router.post('/apply', verifyToken, createTimeSheet);
router.put('/update', verifyToken, updateTimeSheet);
router.get('/submitted/:type', verifyToken, getSubmittedTimeSheets);
// router.get('/details/:timeSheetId', verifyToken, getTimeSheetDetailsById);

router.post('/approve', verifyToken, approveTimeSheet);
router.delete('/revoke', verifyToken, revokeTimeSheet);
router.get('/approved-sheets', verifyToken, getApprovedTimeSheets);

router.get('/report', verifyToken, generateReport);

router.get('/', verifyToken, getTimeSheets)
export default router;