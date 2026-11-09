import RiskModel from '../models/risk.model.js';
import ProjectModel from '../models/project.model.js';

export const getRisks = async (req, res) => {
  try {
    const risk = await RiskModel.find({ isDeleted: false });
    res.status(200).json(risk);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRiskByProjectId = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that RiskId is provided
    if (!id) {
      return res.status(400).json({ message: 'Project id is required to get the risks associated with projects.' });
    }
    const risk = await RiskModel.find({ prjId: id, isDeleted: false });

    if (!risk) {
      return res.status(404).json({ message: `Risk not found for the selected project.` });
    }

    res.status(200).json(risk);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createRisk = async (req, res) => {
  try {
    const createData = req.body;

    // Check if the Project exists and is not deleted
    const projectExists = await ProjectModel.findOne({
      prjId: createData.prjId,
      isDeleted: false,
    });

    if (!projectExists) {
      return res.status(400).json({
        message: `Project with ID ${createData.prjId} either does not exist or has been deleted.`,
      });
    }

    // Create the new Risk document
    const newRisk = new RiskModel({
      prjId: createData.prjId,
      prjCode: createData.prjCode,
      prjName: createData.prjName,
      dateRaised: new Date(createData.dateRaised),
      riskType: createData.riskType,
      description: createData.description,
      impactLevel: createData.impactLevel,
      probabilityLevel: createData.probabilityLevel,
      mitigationAction: createData.mitigationAction,
      contingencyPlan: createData.contingencyPlan,
      update: createData.update,
      status: createData.status,
      riskScore: createData.impactLevel * createData.probabilityLevel
    });

    // Save the risk
    const savedRisk = await newRisk.save();
    res.status(201).json({
      message: 'Risk created successfully for the project',
      risk: savedRisk
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate that RiskId is provided
    if (!id) {
      return res.status(400).json({ message: 'RiskId is required' });
    }

    // Check if the Project exists
    const projectExists = await ProjectModel.findOne({ prjId: updateData.prjId, isDeleted: false });
    if (!projectExists) {
      return res.status(400).json({ message: `Project with projectId ${updateData.prjId} does not exist` });
    }

    // Fetch the existing risk
    const existingRisk = await RiskModel.findOne({ riskId: id, isDeleted: false });
    if (!existingRisk) {
      return res.status(404).json({ message: 'Risk not found or deleted' });
    }

    // Prepare update data with proper field mapping
    const mappedUpdateData = {
      prjId: updateData.prjId,
      prjCode: updateData.prjCode,
      prjName: updateData.prjName,
      dateRaised: new Date(updateData.dateRaised),
      riskType: updateData.riskType,
      description: updateData.description,
      impactLevel: updateData.impactLevel,
      probabilityLevel: updateData.probabilityLevel,
      mitigationAction: updateData.mitigationAction,
      contingencyPlan: updateData.contingencyPlan,
      update: updateData.update,
      status: updateData.status,
      riskScore: updateData.impactLevel * updateData.probabilityLevel
    };

    // Update the Risk document
    const updatedRisk = await RiskModel.findOneAndUpdate(
      { riskId: id },
      { $set: mappedUpdateData },
      { new: true, runValidators: true }
    );

    res.status(200).json(updatedRisk);
  } catch (error) {
    console.error('Error updating risk:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const deleteRisk = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that RiskId is provided
    if (!id) {
      return res.status(400).json({ message: 'RiskId is required' });
    }

    const risk = await RiskModel.findOneAndUpdate(
      { riskId: id, isDeleted: false }, // Only find risks that are not deleted yet
      { isDeleted: true },               // Set isDeleted to true
      { new: true } // Options object
    );

    if (!risk) {
      return res.status(404).json({ message: 'Risk not found' });
    }

    res.status(200).json({ message: 'Risk deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
