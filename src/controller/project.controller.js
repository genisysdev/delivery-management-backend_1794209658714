import { StatusCodes } from 'http-status-codes';
import { roles } from '../constants/role-enum.js';
import ProjectModel from '../models/project.model.js';
import ProjectAssignmentModel from '../models/project-assignment.model.js';

export const getAllProjects = async (req, res) => {
  try {

    const query = { isDeleted: false };

    const projects = await ProjectModel.find(query);
    res.status(StatusCodes.OK).json(projects);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const getProjects = async (req, res) => {
  try {

    const loggedInManagerId = req.user.id;
    const role = req.user.role;

    const query = { isDeleted: false };
    if (role === roles.PM) {
      query.$or = [
        { prjAddedBy: loggedInManagerId },
        { prjMgrId: loggedInManagerId }
      ];
    }
    const projects = await ProjectModel.find(query);
    res.status(StatusCodes.OK).json(projects);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that Project code is provided
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'PrjId is required' });
    }

    const project = await ProjectModel.findOne({ prjId: id, isDeleted: false });

    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: `Project not found` });
    }

    res.status(StatusCodes.OK).json(project);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const createProject = async (req, res) => {
  try {

    req.body.prjAddedBy = req.user.id;

    const { prjCode, prjStartDt, prjCloseDt } = req.body;

    // Validate that end date is not earlier than start date
    if (prjCloseDt && prjStartDt) {
      if (new Date(prjCloseDt) < new Date(prjStartDt)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'End date should not be earlier than start date' });
      }
    }

    let project = await ProjectModel.findOne({ prjCode });

    if (project) {
      // If project exists, update it with new values
      Object.assign(project, req.body);
      project.isDeleted = false;
      project = await project.save();
    } else {
      // Create a new project if no existing project is found
      project = await ProjectModel.create(req.body);
    }

    res.status(StatusCodes.CREATED).json(project);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    const { prjStartDt, prjCloseDt } = req.body;

    // Validate that end date is not earlier than start date
    if (prjCloseDt && prjStartDt) {
      if (new Date(prjCloseDt) < new Date(prjStartDt)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'End date should not be earlier than start date' });
      }
    }

    // Validate that Project code is provided
    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'PrjId is required' });
    }

    const project = await ProjectModel.findOneAndUpdate(
      { prjId: id, isDeleted: false },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Project not found' });
    }

    res.status(StatusCodes.OK).json(project);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'PrjId is required' });
    }

    const project = await ProjectModel.findOneAndUpdate(
      { prjId: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!project) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Project not found' });
    }

    const projectAssignment = await ProjectAssignmentModel.updateMany(
      { prjCode: project.prjCode, isDeleted: false },
      { $set: { isDeleted: true } }
    );

    if (projectAssignment.modifiedCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'No Project Assignment found to delete' });
    }

    res.status(StatusCodes.OK).json({ message: 'Project and related assignments deleted successfully' });
  } catch (error) {
    console.error('Error during project deletion:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};