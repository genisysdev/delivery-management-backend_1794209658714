import mongoose from 'mongoose';
import { capacityMonth } from '../constants/capacity-enum.js';

const capacitySchema = new mongoose.Schema(
    {
        genisysId: {
            type: String,
            required: true,
            unique: true
        },
        displayName: {
            type: String,
            required: true,
        },
        billableHours: {
            type: Number,
            default: 0,
        },
        holidays: {
            type: Number,
            default: 0,
        },
        plannedLeaves: {
            type: Number,
            default: 0,
        },
        plannedHours: {
            type: Number,
            default: 0,
        },
        unPlannedLeaves:{
            type:Number,
            default: 0,
        },
        actualHours:{
            type:Number,
            default: 0,
        },
        varience: {
            type: Number,
            default: 0,
        },
        project: {
            type: String,
        },
        month: {
            type: Number,
            enum: Object.values(capacityMonth),
        },
        year: {
            type: Number,
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

const Capacity = mongoose.model('capacity', capacitySchema);

export default Capacity;