import mongoose from 'mongoose';
import {ragEnum } from '../constants/enum.js';
import { v4 as uuidv4 } from 'uuid';

const projectWeeklyUpdateSchema = new mongoose.Schema(
    {
        prjWkUpdateId:
        {
            type: String,
            default: uuidv4,
        },
        prjCode: {
            type: String,
            required: true,
            ref: 'Project'
        },
        rag: {
            type: Number,
            required: true,
            enum: Object.values(ragEnum)
        },
        overview: {
            type: String,
        },
        currentStatus: {
            type: String,
        },
        keyTarget: {
            type: String,
        },
        keyAcheivements: {
            type: String,
        },
        issues: {
            type: String,
        },
        nextMileStone: {
            type: String,
        },
        weekStartDate : {
            type : Date,
        },
        weekEndDate : {
            type : Date
        },
        prjMgrName : {
            type : String
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        isSubmittedStatusReport: {
            type: Boolean,
            default: false
        },
        isTimesheetSubmittedLastWeek: {
            type: Boolean,
            default: false
        },
        isTimesheetSubmittedLastMonth: {
            type: Boolean,
            default: false
        },
        isInvoiceSubmittedLastMonth: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    }
);

const projectWeeklyUpdate = mongoose.model('projectWeeklyUpdate', projectWeeklyUpdateSchema);

export default projectWeeklyUpdate;
