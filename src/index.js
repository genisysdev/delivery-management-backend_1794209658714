import express from 'express';
import cors from 'cors';
import skillRoutes from './router/skill.router.js';
import personnelSkillRoutes from './router/personnel-skill.router.js';
import riskRoutes from './router/risk.router.js';
import employeeRoutes from './router/employee.router.js';
import projectRoutes from './router/project.router.js';
import projectWeeklyUpdateRoutes from './router/project-weekly-update.router.js';
import projectAssignmentRoutes from './router/project-assignment.router.js';
import appUsersRoutes from './router/app-user.router.js';
import connectDB from './config/db.js';
import capacityTrackerRoutes from './router/capacity.router.js';
import dependencyRoutes from './router/dependency.router.js';
import sprintSummaryRoutes from './router/sprint-summary.router.js'
import reportRoutes from './router/report.router.js';
import projectMilestoneRoutes from './router/project-milestone.router.js'
import deliveryTemplateRoutes from './router/deliveryReview/delivery-template.router.js';
import deliveryAssignmentRoutes from './router/deliveryReview/delivery-assignment.router.js';
import deliveryReviewRoutes from './router/deliveryReview/delivery-review.router.js';
import timeSheetRoutes from './router/time-sheet/time-sheet.route.js';
import dotenv from 'dotenv';
import powerbiRoutes from './router/powerbi.js';

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${env}` });
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log('Incoming Request:', req.method, req.url);
  console.log('Headers:', req.headers);
  next();
});
const BASE_PATH = process.env.BASE_PATH || '/';
app.use(`${BASE_PATH}api/powerbi`, powerbiRoutes);
app.use(`${BASE_PATH}api/appusers`, appUsersRoutes);
app.use(`${BASE_PATH}api/skills`, skillRoutes);
app.use(`${BASE_PATH}api/personnelskills`, personnelSkillRoutes);
app.use(`${BASE_PATH}api/risks`, riskRoutes);
app.use(`${BASE_PATH}api/employees`, employeeRoutes);
app.use(`${BASE_PATH}api/projects`, projectRoutes);
app.use(`${BASE_PATH}api/projectweeklyupdates`, projectWeeklyUpdateRoutes);
app.use(`${BASE_PATH}api/projectassignments`, projectAssignmentRoutes);
app.use(`${BASE_PATH}api/capacity`, capacityTrackerRoutes);
app.use(`${BASE_PATH}api/dependencies`, dependencyRoutes);
app.use(`${BASE_PATH}api/sprint-summary`, sprintSummaryRoutes);
app.use(`${BASE_PATH}api/reports`, reportRoutes);
app.use(`${BASE_PATH}api/projectMilestone`, projectMilestoneRoutes)
app.use(`${BASE_PATH}api/delivery-template`, deliveryTemplateRoutes);
app.use(`${BASE_PATH}api/delivery-assignment`, deliveryAssignmentRoutes);
app.use(`${BASE_PATH}api/delivery-review`, deliveryReviewRoutes);
app.use(`${BASE_PATH}api/time-sheet`, timeSheetRoutes);



app.get(BASE_PATH, (req, res) => {
  res.send('Welcome to Delivery Management tool!');
});

await connectDB();

app.listen(port, () => {
  console.log(`Server is running on Port ${port}`);
});