import DependencyModel from '../models/dependency.model.js';
import ProjectModel from '../models/project.model.js';

export const createDependency = async (req, res) => {
  try {
    const { dependencyDescription, owner, status, prjCode, createdDate, closedDate, estimatedTimeOfArrival } = req.body;

    const projectExists = await ProjectModel.findOne({ prjCode , isDeleted: false,});
    if (!projectExists) {
      return res.status(400).json({ message: `Project with prjCode ${prjCode} does not exist` });
    }

    const newDependency = new DependencyModel({
      dependencyDescription,
      owner,
      status,
      prjCode,
      createdDate,
      closedDate,
      estimatedTimeOfArrival
    });
    await newDependency.save();
    res.status(200).json(newDependency);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDependenciesByProject = async (req, res) => {
  try {
    const { prjCode } = req.params;
    if (!prjCode) {
      return res.status(400).json({ message: 'Project Code (prjCode) is required' });
    }

    const dependencies = await DependencyModel.find({ prjCode, isDeleted: false });
    if (dependencies.length === 0) {
      return res.status(404).json({ message: `No dependencies found for project code: ${prjCode}` });
    }

    res.status(200).json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDependencies = async (req, res) => {
  try {
    const dependencies = await DependencyModel.find({ isDeleted: false });
    res.status(200).json(dependencies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDependency = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    if (!id) {
      return res.status(400).send({ error: 'dependencyId is required' });
    }

    const updatedDependency = await DependencyModel.findOneAndUpdate(
      { dependencyId: id, isDeleted: false },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedDependency) {
      return res.status(404).send({ error: 'Dependency not found' });
    }

    res.status(200).send(updatedDependency);
  } catch (error) {
    res.status(500).send({ error: 'Internal server error' });
  }
};

export const deleteDependency = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'dependencyId is required' });
    }

    const deletedDependency = await DependencyModel.findOneAndUpdate(
      { dependencyId: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!deletedDependency) {
      return res.status(404).json({ message: 'Dependency not found' });
    }

    res.status(200).json({
      message: 'Dependency deleted successfully',
      deletedDependency,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting dependency', error: error.message });
  }
};
