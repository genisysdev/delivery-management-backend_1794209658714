import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';


const timeSheetApprovedSchema = new mongoose.Schema(
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
        appliedOn: {
            type: Date,
            default: Date.now()
        },
        approvedBy: {
            type: String,
        },
        approvedOn: {
            type: Date,
            default: Date.now()
        },
        timeSheetId: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: Number,
            default: 3
        }
    },
    {
        timestamps: true,
    }
);
const timeSheetApproved = mongoose.model('approved_timesheet', timeSheetApprovedSchema);

export default timeSheetApproved;
