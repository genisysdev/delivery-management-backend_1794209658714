import mongoose from 'mongoose';
import { roles } from '../constants/role-enum.js';

const appScopeSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: Object.values(roles),
        default: roles.Default,
    },
    canAccessDashboard: {
        type: Boolean,
    },
    canAccessDirectReportees: {
        type: Boolean,
    },
    canAccessProjects: {
        type: Boolean,
    },
    canAccessAllocations: {
        type: Boolean,
    },
    canAccessSkillMaster: {
        type: Boolean,
    },
    canAccessPersonalSkills: {
        type: Boolean,
    },
    canAccessReport: {
        type: Boolean,
    },
    canAccessAllocationReport: {
        type: Boolean,
    },
    canAccessCapacityTracker: {
        type: Boolean,
    },
    canAccessSprintSummary: {
        type: Boolean,
    },
    canAccessRisk: {
        type: Boolean
    },
    canAccessDependencies: {
        type: Boolean
    },
    canAccessResourceView: {
        type: Boolean
    },
    canApplyForTimesheet: {
        type: Boolean
    },
    canApproveTimesheet: {
        type: Boolean
    },
    canDownloadTimesheetReport: {
        type: Boolean
    },
    canAccessTemplateManagement: {
        type: Boolean
    },
    canAccessNplbAssignReview: {
        type: Boolean
    },
    canAccessNplbProjectReview: {
        type: Boolean
    },
    canAccessNplbReviewSummary: {
        type: Boolean
    }
},
    { timestamps: true }
);

const AppScope = mongoose.model('AppScope', appScopeSchema);

export default AppScope;
