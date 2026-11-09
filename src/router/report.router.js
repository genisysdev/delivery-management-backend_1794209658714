import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/verify-token.middleware.js';

import {
    generateSixMonthReport,
    getFilteredReport,
    getUnbilledReport,
    getMasterEmpData,
} from '../controller/report.controller.js';

// get all reports
router.get('/', verifyToken, generateSixMonthReport);

router.get('/filteredreport', verifyToken, getFilteredReport);

router.get('/unbilled', verifyToken, getUnbilledReport);

router.get('/masterdata', verifyToken, getMasterEmpData);

export default router;