import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { prjAllocationStatusEnum, prjRoleEnum } from '../constants/project-allocation-status-enum.js';

const projectAssignmentSchema = new mongoose.Schema(
    {
        prjAssId:
        {
            type: String,
            default: uuidv4,
        },
        prjCode: {
            type: String,
            required: true,
            ref: 'Project',
        },
        prjName: {
            type: String,
        },
        genisysId: {
            type: String,
            required: true,
        },
        displayName: {
            type: String,
            required: true,
        },
        allocation: {
            type: String,
            required: true,
        },
        status:
        {
            type: Number,
            required: true,
            enum: Object.values(prjAllocationStatusEnum),
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        prjRole: {
            type: Number,
            required: true,
            enum: Object.values(prjRoleEnum),
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

const projectAssignment = mongoose.model('projectAssignment', projectAssignmentSchema);

export default projectAssignment;
