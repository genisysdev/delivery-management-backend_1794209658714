import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { skillCatgEnum } from '../constants/enum.js';

const skillSchema = new mongoose.Schema(
  {
    skillId: {
      type: String,
      default: uuidv4,
    },
    skillName: {
      type: String,
      required: true,
    },
    skillDesc: {
      type: String,
      required: true,
    },
    skillCatg: {
      type: Number,
      required: true,
      default: skillCatgEnum.NotTechnology,
      enum: Object.values(skillCatgEnum),
    },
    isDeleted: {
      type: Boolean,
      default: false
  },
  },
  { timestamps: true }
);

const skill = mongoose.model('skill', skillSchema);

export default skill;