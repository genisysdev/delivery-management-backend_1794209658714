import mongoose from "mongoose";
import { milestoneStatusEnum } from "../constants/milestone-enum.js";

const projectMilestoneSchema = new mongoose.Schema(
    {
        prjCode: {
            type: String,
            required: true,
            ref: 'Project',
        },
        milestone: {
            type: String,
            required: true,
        },
        plannedStartDate: {
            type: Date,
            required: true,
        },
        plannedEndDate: {
            type: Date,
        },
        actualStartDate: {
            type: Date,
        },
        actualEndDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: milestoneStatusEnum,
            default: 'Not Started',
        },
        comments: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const ProjectMilestone = mongoose.model('projectmilestone', projectMilestoneSchema);

export default ProjectMilestone;