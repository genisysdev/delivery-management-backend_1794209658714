import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const deliveryReviewSchema = mongoose.Schema({
    id: {
        type: String,
        default: uuidv4,
    },
    forDeliveryAssignment: {
        type: String,
        required: true,
    },
    reviewDetails: {
        type:JSON,
        required: true,
    },
    reviewedBy: {
        type: String,
        required: true,
    },
    reviewedAt: {
        type: Date,
        default: Date.now
    }
});
const DeliveryReview = mongoose.model("deliveryReview", deliveryReviewSchema);
export default DeliveryReview;