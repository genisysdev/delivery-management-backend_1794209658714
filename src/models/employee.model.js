import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PracticeEnum } from '../constants/practice-enum.js';
import { employeeType } from '../constants/employment-type.js';

const EmployeeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: uuidv4,
      required: true,
      unique: true,
    },
    managerId: {
      type: String,
      default: uuidv4,
    },
    genisysId: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    emailId: {
      type: String,
      required: true,
    },
    practice: {
      type: Number,
      enum: Object.values(PracticeEnum),
    },
    experience: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value >= 1 && value <= 50; // Allow values from 1 to 50
        },
        message: 'Experience must be between 1 and 50.',
      },
    },
    availability: {
      type: Number,
      default: 0,
    },
    officeLocation: {
      type: String,
    },
    lastUpdatedBy: {
      type: String,
    },
    billable: {
      type: Boolean,
      default: true,
    },
    employmentType: {
      type: Number,
      enum: Object.values(employeeType),
      default: employeeType.Permanent, // Default is Permanent
      validate: {
        validator: function (value) {
          return this.billable ? !!value : true; // Required if billable is true
        },
        message: 'Employment Type is required when billable is true.',
      },
    },
    employmentPercentage: {
      type: Number,
      min: [0, 'Employment percentage cannot be negative.'],
      max: [100, 'Employment percentage cannot exceed 100%.'],
      default: 100, // Default is 100%
      validate: {
        validator: function (value) {
          return this.billable ? value > 0 : true; // Must be > 0 if billable is true
        },
        message: 'Employment Percentage must be greater than 0 when billable is true.',
      },
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    terminationDate: {
      type: Date,
      validate: {
        validator: function (value) {
          // Allow null or undefined values (terminationDate is not mandatory)
          if (!value) return true;
          // Ensure the date is today or in the future
          return value >= new Date().setHours(0, 0, 0, 0);
        },
        message: "Termination date must be today or a future date."
      }
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

const Employee = mongoose.model('Employee', EmployeeSchema);

export default Employee;