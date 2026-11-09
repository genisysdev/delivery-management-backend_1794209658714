import ProjectWeeklyUpdateModel from '../models/project-weekly-update.model.js';
import ProjectModel from '../models/project.model.js';
import { StatusCodes } from 'http-status-codes';
import ProjectAssignmentModel from '../models/project-assignment.model.js';

export const getProjectWeeklyUpdates = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate that Project code is provided
        if (!id) {
            return res.status(400).json({ message: 'PrjCode is required' });
        }

        const projectExists = await ProjectModel.findOne({ prjCode: id, isDeleted: false });

        if (!projectExists) {
            return res.status(400).json({
                message: `Project with ProjectId ${id} either does not exist or has been deleted.`,
            });
        }

        const projectWeeklyUpdates = await ProjectWeeklyUpdateModel.find({
            prjCode: id,
            isDeleted: false,
        }).sort({ createdAt: -1 });

        res.status(200).json(projectWeeklyUpdates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createProjectWeeklyUpdate = async (req, res) => {
    const prjMgrName = req.user.name

    try {
        const { prjCode } = req.body;

        const projectExists = await ProjectModel.findOne({ prjCode, isDeleted: false });
        if (!projectExists) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: `Project with ProjectId ${prjCode} either does not exist or has been deleted.`,
            });
        }

        const projectWeeklyUpdate = await ProjectWeeklyUpdateModel.create({ ...req.body, prjMgrName });
        res.status(StatusCodes.OK).json(projectWeeklyUpdate);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const updateProjectWeeklyUpdate = async (req, res) => {
    try {
        const { weeklyUpdate, prjWkUpdateId } = req.body;

        if (!prjWkUpdateId) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'PrjWkUpdId is required' });
        }

        const updatedProjectWeeklyUpdate = await ProjectWeeklyUpdateModel.findOneAndUpdate(
            { prjWkUpdateId: prjWkUpdateId, isDeleted: false },
            weeklyUpdate,
            { new: true, runValidators: true }
        );
        if (!updatedProjectWeeklyUpdate) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Project weekly update not found' });
        }
        res.status(StatusCodes.OK).json(updatedProjectWeeklyUpdate);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getProjectTeamMembersByPrjCode = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(StatusCodes.BAD_REQUEST).json({ message: 'prjCode is required' });
        }

        const teamMembers = await ProjectAssignmentModel.find(
            { prjCode: id, isDeleted: false },
            { displayName: 1, prjRole: 1, startDate: 1, endDate: 1, _id: 0 }
        );

        if (!teamMembers || teamMembers.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'No team members found for this project code' });
        }

        res.status(StatusCodes.OK).json({ teamMembers });
    }
    catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};
