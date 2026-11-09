import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { dependencyEnum } from '../constants/dependency-enum.js';

const dependencySchema = mongoose.Schema(
{
    dependencyId: 
    {
      type: String,
      default: uuidv4,
    },
    dependencyDescription: {
      type: String,
      required: true
    },

    createdDate: {
      type: Date,
      required: true
    },

    owner: {
      type: String,
      required: true
    },

    status: {
      type: Number,
      required: true,
      enum: Object.values(dependencyEnum),
    },

    closedDate: {
      type: Date,
      },
    estimatedTimeOfArrival:{
      type : Date
    },

    prjCode: {
        type: String,
        required: true,
        ref: 'project'
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

const dependency = mongoose.model('dependency', dependencySchema);

export default dependency;
