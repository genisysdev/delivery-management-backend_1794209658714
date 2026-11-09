import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { prsnlTypeEnum, skillLevelEnum } from '../constants/enum.js';
import SkillModel from '../models/skill.model.js';

const personnelSkillSchema = new mongoose.Schema(
  {
    personnelSkillId: {
      type: String,
      default: uuidv4,
    },
    empId: {
      type: String, 
      ref: 'Employee', 
    },
    prsnlType: {
      type: Number,
      default: prsnlTypeEnum.Employee,
      enum: Object.values(prsnlTypeEnum),
    },
    skillId: {
      type: String,
      required: true,
      ref: 'Skill',
    },
    skillExp: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value >= 1 && value <= 20; // Allow values from 1 to 20
        },
        message: 'Skill Experience must be between 1 and 20.',
      },
    },
    skillLevel: {
      type: Number,
      required: true,
      default: skillLevelEnum.Beginner,
      enum: Object.values(skillLevelEnum),
    },
    skillName: {
      type: String,
      ref: 'Skill'
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

personnelSkillSchema.pre('save', async function (next) {
  try {
    if (this.isModified('skillId') || this.isNew) {
      const skill = await SkillModel.findOne({ skillId: this.skillId, isDeleted: false });
      if (!skill) {
        throw new Error('Skill not found');
      }
      this.skillName = skill.skillName; 
    }
    next();
  } catch (error) {
    next(error);
  }
});

const personnelSkill = mongoose.model('personnelSkill', personnelSkillSchema);

export default personnelSkill;
