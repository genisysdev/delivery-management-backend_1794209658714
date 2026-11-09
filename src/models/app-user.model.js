import mongoose from 'mongoose';
import { roles } from '../constants/role-enum.js'; 

const appUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: Object.values(roles),
        default: roles.Default,
    },
    canManageAccess:{
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    addedBy: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
},
{ timestamps: true }
);

const AppUser = mongoose.model('AppUser', appUserSchema);

export default AppUser;
