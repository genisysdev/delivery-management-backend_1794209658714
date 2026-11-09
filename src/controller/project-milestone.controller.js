import { milestoneStatusEnum } from '../constants/milestone-enum.js';
import ProjectMilestoneModel from '../models/project-milestone.model.js';

// Create Milestone
export const createProjectMilestone = async (req, res) => {
    try {
        const { prjCode, milestone, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate, status, comments } = req.body;

        if (!prjCode || !milestone || !plannedStartDate) {
            return res.status(400).json({ message: 'Project code, milestone name, and planned start date are required.' });
        }

        // Validate status if provided
        if (status && !milestoneStatusEnum.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }

        // Validate date logic
        const plannedStart = new Date(plannedStartDate);
        const plannedEnd = plannedEndDate ? new Date(plannedEndDate) : null;
        const actualStart = actualStartDate ? new Date(actualStartDate) : null;
        const actualEnd = actualEndDate ? new Date(actualEndDate) : null;

        if (plannedEnd && plannedEnd < plannedStart) {
            return res.status(400).json({ message: 'Planned end date cannot be before planned start date.' });
        }

        if (actualStart && actualEnd && actualEnd < actualStart) {
            return res.status(400).json({ message: 'Actual end date cannot be before actual start date.' });
        }

        const milestoneObj = new ProjectMilestoneModel({
            prjCode,
            milestone,
            plannedStartDate: plannedStart,
            plannedEndDate: plannedEnd,
            actualStartDate: actualStart,
            actualEndDate: actualEnd,
            status,
            comments,
        });

        const savedMilestone = await milestoneObj.save();
        res.status(201).json(savedMilestone);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Milestone
export const updateProjectMilestone = async (req, res) => {
    const { id } = req.params;
    const { milestone, plannedEndDate, actualStartDate, actualEndDate, status, comments } = req.body;

    try {
       
        const existingMilestone = await ProjectMilestoneModel.findOne({ _id: id, isDeleted: false });

        if (!existingMilestone) {
            return res.status(404).json({ message: 'Milestone not found.' });
        }

        // Prevent update if milestone is completed
        if (existingMilestone.status.toLowerCase() === 'completed') {
            return res.status(400).json({ message: 'Completed milestones cannot be updated.' });
        }

        // Validate status if provided
        if (status && !milestoneStatusEnum.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value.' });
        }

        const plannedEnd = plannedEndDate ? new Date(plannedEndDate) : null;
        const actualStart = actualStartDate ? new Date(actualStartDate) : null;
        const actualEnd = actualEndDate ? new Date(actualEndDate) : null;

        if (plannedEnd && plannedEnd < existingMilestone.plannedStartDate) {
            return res.status(400).json({ message: 'Planned end date cannot be before planned start date.' });
        }

        if (actualStart && actualEnd && actualEnd < actualStart) {
            return res.status(400).json({ message: 'Actual end date cannot be before actual start date.' });
        }

        const updatedMilestone = await ProjectMilestoneModel.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { milestone, plannedEndDate: plannedEnd, actualStartDate: actualStart, actualEndDate: actualEnd, status, comments },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedMilestone);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


  

// Delete Milestone
export const deleteProjectMilestone = async (req, res) => {
    const { id } = req.params;

    try {
        const milestone = await ProjectMilestoneModel.findOne({ _id: id, isDeleted: false });

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        if (milestone.status.toLowerCase() === 'completed') {
            return res.status(400).json({ message: 'Completed milestones cannot be deleted.' });
        }

        milestone.isDeleted = true;
        await milestone.save();

        res.status(200).json({ message: 'Milestone deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get All Milestones with optional status filter
export const getProjectMilestones = async (req, res) => {
    const { prjCode, status } = req.query;

    try {
        const query = { isDeleted: false };

        if (prjCode) {
            query.prjCode = prjCode;
        }

        if (status) {
            query.status = { $regex: new RegExp(`^${status}$`, 'i') };
        }

        const milestones = await ProjectMilestoneModel.find(query).sort({ plannedDate: 1 });

        res.status(200).json(milestones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Single Milestone by ID
export const getProjectMilestoneById = async (req, res) => {
    const { id } = req.params;

    try {
        const milestone = await ProjectMilestoneModel.findOne({ _id: id, isDeleted: false });

        if (!milestone) {
            return res.status(404).json({ message: 'Milestone not found' });
        }

        res.status(200).json(milestone);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
