import PersonnelSkillModel from '../models/personnel-skill.model.js';
import SkillModel from '../models/skill.model.js';
import EmployeeModel from '../models/employee.model.js';


export const getPersonnelSkills = async (req, res) => {
  try {
    const empId = req.user.id;

    const personnelSkill = await PersonnelSkillModel.find({ empId: empId, isDeleted: false });

    // If no personnel skill is found, return an error
    if (!personnelSkill) {
      return res.status(404).json({ message: `Personnel Skill for the provided employee not found` });
    }
    res.status(200).json(personnelSkill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPersonnelSkill = async (req, res) => {
  try {
    const { skillId, skillExp, skillLevel } = req.body;
    const empId = req.user.id;

    // Check if the Employee exists
    const employeeExists = await EmployeeModel.findOne({ id: empId, isDeleted: false });
    if (!employeeExists) {
      return res
        .status(400)
        .json({ message: `Employee with employeeId ${empId} does not exist` });
    }

    // Check if the skill exists
    const skillExists = await SkillModel.findOne({ skillId: skillId, isDeleted: false });
    if (!skillExists) {
      return res
        .status(400)
        .json({ message: `Skill with skillId ${skillId} does not exist` });
    }

    // Check if a PersonnelSkill entry already exists with the same EmpId and SkillId
    const existingPersonnelSkill = await PersonnelSkillModel.findOne({ empId: empId, skillId: skillId, isDeleted: false });
    if (existingPersonnelSkill) {
      return res.status(400).json({ message: `PersonnelSkill with EmpId ${empId} and SkillId ${skillId} already exists` });
    }

    const personnelSkill = await PersonnelSkillModel.create({
      empId,
      skillId,
      skillExp,
      skillLevel,
      skillName: skillExists.skillName,
    });

    const savedPersonnelSkill = await personnelSkill.save();
    res.status(201).json({
      message: 'PersonnelSkill created successfully',
      data: savedPersonnelSkill,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePersonnelSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillId, skillExp, skillLevel } = req.body;
    const empId = req.user.id;  // Get empId from the token

    // Validate that PersonnelSkill entryId is provided
    if (!id) {
      return res.status(400).json({ message: 'Personnel skill Id is required' });
    }

    // Find the PersonnelSkill entry by its Id 
    const personnelSkillExists = await PersonnelSkillModel.findOne({ personnelSkillId: id, isDeleted: false });
    if (!personnelSkillExists) {
      return res.status(404).json({ message: 'Personnel Skill not found' });
    }

    // Check if the Employee exists
    const employeeExists = await EmployeeModel.findOne({ id: empId, isDeleted: false });
    if (!employeeExists) {
      return res.status(400).json({ message: `Employee with employeeId ${empId} does not exist` });
    }

    // Check if the skill exists
    const skillExists = await SkillModel.findOne({ skillId: skillId, isDeleted: false });
    if (!skillExists) {
      return res.status(400).json({ message: `Skill with skillId ${skillId} does not exist` });
    }

    // Check if another entry exists with the same empId and skillId but different personnelSkillId
    const duplicatePersonnelSkill = await PersonnelSkillModel.findOne({
      empId,
      skillId,
      isDeleted: false,
      _id: { $ne: personnelSkillExists._id }, // Exclude the current entry being updated
    });

    if (duplicatePersonnelSkill) {
      return res.status(400).json({ message: `PersonnelSkill with EmpId ${empId} and SkillId ${skillId} already exists` });
    }

    // Update the PersonnelSkill entry
    personnelSkillExists.skillExp = skillExp;
    personnelSkillExists.skillLevel = skillLevel;
    personnelSkillExists.skillName = skillExists.skillName;

    // Save the updated entry
    await personnelSkillExists.save();

    res.status(200).json({
      message: 'PersonnelSkill updated successfully',
      data: personnelSkillExists,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePersonnelSkill = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that PersonnelSkill EntryId is provided
    if (!id) {
      return res.status(400).json({ message: 'Personnel skill Id is required' });
    }

    const personnelSkill = await PersonnelSkillModel.findOneAndUpdate(
      { personnelSkillId: id, isDeleted: false },
      { isDeleted: true }, // Update object
      { new: true } // Options object
    );

    if (!personnelSkill) {
      return res.status(404).json({ message: 'Personnel Skill not found' });
    }

    res.status(200).json({
      message: 'Personnel Skill deleted successfully',
      personnelSkill,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
