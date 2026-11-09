import SkillModel from '../models/skill.model.js';

export const getSkills = async (req, res) => {
  try {
    const skills = await SkillModel.find({ isDeleted: false });
    res.status(200).json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSkill = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate that SkillId is provided
    if (!id) {
      return res.status(400).json({ message: 'SkillId is required' });
    }
    const skill = await SkillModel.findOne({ skillId: id, isDeleted: false });
    // If no skill is found, return an error
    if (!skill) {
      return res.status(404).json({ message: `Skill not found` });
    }
    res.status(200).json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSkill = async (req, res) => {
  try {
    const skill = await SkillModel.create(req.body);
    res.status(200).json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that SkillId is provided
    if (!id) {
      return res.status(400).json({ message: 'SkillId is required' });
    }

    // Find the skill and ensure it is not deleted
    const skill = await SkillModel.findOneAndUpdate(
      { skillId: id, isDeleted: false }, // Query
      req.body, // Update data
      { new: true, runValidators: true } // Options
    );

    // If no skill is found, return an error
    if (!skill) {
      return res.status(404).json({ message: `Skill not found or deleted` });
    }

    res.status(200).json({
      message: 'Skill updated successfully',
      skill,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that SkillId is provided
    if (!id) {
      return res.status(400).json({ message: 'SkillId is required' });
    }

    // Find the skill and set isDeleted to true
    const skill = await SkillModel.findOneAndUpdate(
      { skillId: id, isDeleted: false }, // Query
      { isDeleted: true }, // Update
      { new: true } // Options
    );

    // If no skill is found, return an error
    if (!skill) {
      return res.status(404).json({ message: `Skill not found or already deleted` });
    }

    res.status(200).json({
      message: 'Skill deleted successfully',
      skill,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
