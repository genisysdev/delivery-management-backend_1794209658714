import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const deliveryAssignmentSchema = mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
    },
    projectId: {
        type: String,
        required: true,
    },
    deliveryTemplateId: {
        type: String,
        required: true,
    },
    assignedTo: {
        type: String,
        required: true,
    },
    assignedBy: {
        type: String,
        required: true,
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    reviewBy: {
        type: Date,
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
});

const DeliveryAssignment = mongoose.model("deliveryAssignment", deliveryAssignmentSchema);
export default DeliveryAssignment;
