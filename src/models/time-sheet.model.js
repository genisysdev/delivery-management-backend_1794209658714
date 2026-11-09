import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';


const timeSheetSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            default: uuidv4
        },
        forUser: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        timeSheet: {
            type: JSON,
            required: true
        },
        status: {
            type: Number,
            required: true // 1-draft,2-applied,3-approved,4-rejected,5-reApplied
        },
        appliedOn: {
            type: Date,
            default: Date.now()
        },
        approvedBy: {
            type: String,
        },
        approvedOrRejectedOn: {
            type: Date,
        },
        rejectComment: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);
const timesheet = mongoose.model('timesheet', timeSheetSchema);

export default timesheet;
