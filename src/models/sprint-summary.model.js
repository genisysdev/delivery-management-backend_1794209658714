import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const sprintSummarySchema = new mongoose.Schema(
  {
    sprintSummaryId: {
        type: String,
        default:uuidv4,
    },
    release: {
      type: String,
      required: true,
    },
    prjCode: {
        type: String,
        required: true,
        ref: 'project'
    },
    sprint: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    userStoriesPlanned: {
      type: Number,
    },
    userStoriesCompleted: {
      type: Number,
    },
    storyPointsPlanned: {
      type: Number,
    },
    storyPointsCompleted: {
      type: Number,
    },
    estimatedHours: {
      type: Number,
    },
    spentHours: {
      type: Number,
    },
    remainingHours: {
      type: Number,
    },
    openBugs: {
      type: Number,
    },
    isDeleted: {
        type: Boolean,
        default: false
      }
  },
  {
    timestamps: true,
  }
);

const sprintSummary = mongoose.model('sprintSummary', sprintSummarySchema);

export default sprintSummary;
