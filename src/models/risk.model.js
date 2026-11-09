import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { riskStatusEnum } from '../constants/enum.js';

const riskSchema = new mongoose.Schema(
    {
        riskId: {
            type: String,
            default: uuidv4,
        },
        prjId:
        {
            type: String,
            require: true,
            ref: 'Project'
        },

        prjCode: {
            type: String,
            required: true,
        },
        prjName: {
            type: String,
            required: true,
        },
        dateRaised: {
            type: Date,
            required: true
        },
        riskType: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        impactLevel: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        probabilityLevel: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        riskScore: {
            type: Number
        },
        mitigationAction: {
            type: String,
            required: true,
        },
        contingencyPlan: {
            type: String,
            required: true
        },
        update: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            required: true,
            enum: Object.values(riskStatusEnum),
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save hook to calculate RiskScore
riskSchema.pre("save", function (next) {
    this.riskScore = this.impactLevel * this.probabilityLevel;
    next();
});

const risk = mongoose.model('risk', riskSchema);

export default risk;
