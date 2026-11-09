import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
    prjTypeEnum,
    prjStatusEnum,
    prjBillModelEnum,
    riskLevelEnum,
    subPrjEnum,
    sbuEnum
} from '../constants/enum.js';

const projectSchema = new mongoose.Schema(
    {
        prjId:
        {
            type: String,
            default: uuidv4,
        },
        prjCode: {
            type: String,
            required: true,
            unique: true
        },
        prjName: {
            type: String,
            required: true,
        },
        prjDesc: {
            type: String,
        },
        prjType: {
            type: Number,
            required: true,
            default: prjTypeEnum.Client,
            enum: Object.values(prjTypeEnum)
        },
        prjStatus: {
            type: Number,
            required: true,
            default: prjStatusEnum.Started,
            enum: Object.values(prjStatusEnum)
        },
        custName: {
            type: String,
            required: true
        },
        cntctPrsn: {
            type: String,
        },
        prjStartDt: {
            type: Date,
        },
        prjDueDt: {
            type: Date,
        },
        prjCloseDt: {
            type: Date,
        },
        prjBillModel: {
            type: Number,
            default: prjBillModelEnum.NoBilling,
            enum: Object.values(prjBillModelEnum),
        },
        riskLevel: {
            type: Number,
            default: riskLevelEnum.Low,
            enum: Object.values(riskLevelEnum)
        },
        industry: {
            type: String,
        },
        hasSubPrj: {
            type: Number,
            default: subPrjEnum.No,
            enum: Object.values(subPrjEnum)
        },
        accManager: {
            type: String,
            required: true
        },
        sbu: {
            type: Number,
            required: true,
            default: sbuEnum.Americas,
            enum: Object.values(sbuEnum),
        },
        prjMgr: {
            type: String,
            require: true
        },
        prjMgrId:{
            type: String,
            require: true
        },
        prjAddedBy:{
            type: String
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
const project = mongoose.model('project', projectSchema);

export default project;
