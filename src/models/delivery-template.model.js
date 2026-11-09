import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const deliveryTemplateSchema = mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
    },
    createdBy:{
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    sections:{
        type: JSON,
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    }
},{timestamps: true});

const DeliveryTemplate = mongoose.model("deliveryTemplate", deliveryTemplateSchema);
export default DeliveryTemplate;