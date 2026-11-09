import SprintSummaryModel from '../models/sprint-summary.model.js';
import ProjectModel from '../models/project.model.js';

export const getSprintsByProject = async (req, res) => {
  try {
    const { prjCode } = req.params;
    if (!prjCode) {
      return res.status(400).json({ message: 'Project Code (prjCode) is required' });
    }

    const sprintSummaries = await SprintSummaryModel.find({ prjCode, isDeleted: false });
    if (sprintSummaries.length === 0) {
      return res.status(404).json({ message: `No sprint summary found for project code: ${prjCode}` });
    }

    res.status(200).json(sprintSummaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSprintSummary = async (req, res) => {
    try {
      const { prjCode } = req.body;
  
      if (!prjCode) {
        return res.status(400).json({ message: 'prjCode is required' });
      }
  
      const projectExists = await ProjectModel.findOne({ prjCode , isDeleted: false,});
      if (!projectExists) {
        return res.status(400).json({ message: `Project with prjCode ${prjCode} does not exist` });
      }
  
      const newSprintSummary = await SprintSummaryModel.create(req.body);
      res.status(200).json(newSprintSummary);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
   
export const getSprintSummaries = async (req, res) => {
  try {
    const sprintSummaries = await SprintSummaryModel.find();
    res.status(200).json(sprintSummaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSprintSummary = async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = req.body;
  
      if (!id) {
        return res.status(400).json({ message: 'sprintSummaryId is required' });
      }
  
      const updatedSprintSummary = await SprintSummaryModel.findOneAndUpdate(
        { sprintSummaryId: id, isDeleted: false },
        updateFields,
        { new: true, runValidators: true }
      );
  
      if (!updatedSprintSummary) {
        return res.status(404).json({ message: 'Sprint Summary not found' });
      }
  
      res.status(200).json(updatedSprintSummary);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
  export const deleteSprintSummary = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        return res.status(400).json({ message: 'sprintSummaryId is required' });
      }
  
      const deletedSprintSummary = await SprintSummaryModel.findOneAndUpdate(
        { sprintSummaryId: id, isDeleted: false }, // Query
        { isDeleted: true }, // Mark as deleted in the update
        { new: true }
      );
  
      if (!deletedSprintSummary) {
        return res.status(404).json({ message: 'Sprint Summary not found' });
      }
      res.status(200).json({message: 'Sprint Summary deleted successfully', deletedSprintSummary});
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
