import express from "express";
import { getPersonalProjects } from "../../controller/time-sheet/project.controller.js";


const router = express.Router();

router.get('/', getPersonalProjects);


export default router;