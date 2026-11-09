import ProjectModel from '../models/project.model.js';
import EmployeeModel from '../models/employee.model.js';
import ProjectAssignmentModel from '../models/project-assignment.model.js';
import { prjAllocationStatusEnum } from '../constants/project-allocation-status-enum.js';
import { roles } from '../constants/role-enum.js';
import { canCreateAssignment } from '../helper/projectAssignment.js';

export const getProjectAssignments = async (req, res) => {
  try {
    const { id: managerId, role } = req.user;

    // Define project filter based on role
    const projectFilter = role === roles.PM ? { isDeleted: false, prjMgrId: managerId } : { isDeleted: false };

    // Get projects based on role
    const projects = await ProjectModel.find(projectFilter);
    if (!projects.length) {
      return res.status(404).json({ message: "No projects found" });
    }

    // Get assignments only for these projects
    const projectAssignments = await ProjectAssignmentModel.aggregate([
      {
        $match: {
          prjCode: { $in: projects.map(project => project.prjCode) },
          isDeleted: false
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'genisysId',
          foreignField: 'genisysId',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $lookup: {
          from: 'personnelskills',
          localField: 'employee.id',
          foreignField: 'empId',
          as: 'skills',
          pipeline: [
            {
              $match: { isDeleted: false }
            }
          ]
        }
      },
      {
        $addFields: {
          skills: {
            $reduce: {
              input: '$skills',
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ', '] },
                  '$$this.skillName'
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          prjAssId: 1,
          prjCode: 1,
          prjName: 1,
          genisysId: 1,
          displayName: 1,
          allocation: 1,
          status: 1,
          startDate: 1,
          endDate: 1,
          prjRole: 1,
          experience: '$employee.experience',
          practice: '$employee.practice',
          skills: 1
        }
      }
    ]);


    res.status(200).json(projectAssignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProjectAssignment = async (req, res) => {
  try {
    const { prjCode, genisysId, displayName, allocation, status, startDate, endDate, prjRole } = req.body;

    // Check if allocation is valid
    if (parseInt(allocation) <= 0 || parseInt(allocation) > 100) {
      return res.status(400).json({ message: 'Allocation must be a positive number and cannot be more than 100' });
    }

    // Check if Project exists
    const projectExists = await ProjectModel.findOne({ prjCode, isDeleted: false });
    if (!projectExists) {
      return res.status(400).json({ message: `Project with code ${prjCode} does not exist` });
    }

    // Check if Employee exists
    const employeeExists = await EmployeeModel.findOne({ genisysId: genisysId, isDeleted: false });
    if (!employeeExists) {
      return res.status(400).json({ message: `Employee with ID ${genisysId} does not exist` });
    }

    // Validate dates
    const employeeJoiningDate = new Date(employeeExists.joiningDate);
    const allocationStartDate = new Date(startDate);
    const allocationEndDate = new Date(endDate);

    if (employeeJoiningDate > allocationStartDate) {
      return res.status(400).json({ message: 'Employee joining date should not be later than allocation start date' });
    }

    if (allocationStartDate > allocationEndDate) {
      return res.status(400).json({ message: 'Allocation start date should not be later than allocation end date' });
    }

    // Commenting this condition for allowing overlapping assignments
    
    // const canCreateNewAssignment = await canCreateAssignment({
    //   prjCode,
    //   genisysId,
    //   startDate
    // });

    // if (!canCreateNewAssignment) {
    //   return res.status(400).json({ message: 'Cannot assign to the project because an existing assignment overlaps with the new assignment.' });
    // }

    const projectAssignment = new ProjectAssignmentModel({
      prjCode,
      prjName: projectExists.prjName,
      genisysId,
      displayName,
      allocation,
      status,
      startDate,
      endDate,
      prjRole,
    });

    const savedProjectAssignment = await projectAssignment.save();
    res.status(201).json({ message: 'Project Assignment created successfully', data: savedProjectAssignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProjectAssignment = async (req, res) => {
  const { id } = req.params;
  const { prjCode, genisysId, displayName, allocation, status, startDate, endDate, prjRole } = req.body;

  try {
    // Check if allocation is valid
    if (allocation <= 0 || allocation > 100) {
      return res.status(400).json({ message: 'Allocation must be a positive number and cannot be more than 100' });
    }
    // Check if Project exists
    const projectExists = await ProjectModel.findOne({ prjCode, isDeleted: false });
    if (!projectExists) {
      return res.status(400).json({ message: `Project with code ${prjCode} does not exist` });
    }

    // Check if Employee exists
    const employeeExists = await EmployeeModel.findOne({ genisysId: genisysId, isDeleted: false });
    if (!employeeExists) {
      return res.status(400).json({ message: `Employee with ID ${genisysId} does not exist` });
    }

    // Validate dates
    const employeeJoiningDate = new Date(employeeExists.joiningDate);
    const allocationStartDate = new Date(startDate);
    const allocationEndDate = new Date(endDate);

    if (employeeJoiningDate > allocationStartDate) {
      return res.status(400).json({ message: 'Employee joining date should not be later than allocation start date' });
    }

    if (allocationStartDate > allocationEndDate) {
      return res.status(400).json({ message: 'Allocation start date should not be later than allocation end date' });
    }

    // Check for duplicate entry
    const duplicateAssignment = await ProjectAssignmentModel.findOne({
      prjCode,
      genisysId,
      status,
      prjAssId: { $ne: id }, // Exclude the current record being updated
      isDeleted: false,
    });

    if (duplicateAssignment) {
      return res.status(400).json({ message: `Duplicate entry: Employee with ID ${genisysId} is already assigned to project ${prjCode}` });
    }

    const updatedAssignment = await ProjectAssignmentModel.findOneAndUpdate(
      { prjAssId: id },
      { prjCode, genisysId, displayName, allocation, status, startDate, endDate, prjRole },
      { new: true, runValidators: true }
    );

    if (!updatedAssignment) {
      return res.status(404).json({ message: 'Project assignment not found' });
    }

    res.status(200).json(updatedAssignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProjectAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const projectAssignment = await ProjectAssignmentModel.findOneAndUpdate(
      { prjAssId: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!projectAssignment) {
      return res.status(404).json({ message: 'Project Assignment not found' });
    }

    res.status(200).json({ message: 'Project Assignment deleted successfully', data: projectAssignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchProjectAssignmentByEmpName = async (req, res) => {
  try {
    const { empName } = req.query;
    const projectAssignments = await ProjectAssignmentModel.find(
      { displayName: { $regex: empName, $options: 'i' }, isDeleted: false });
    res.status(200).json(projectAssignments);
  }
  catch (error) { res.status(500).json({ message: error.message }); }
};

export const searchProjectAssignmentByPrjId = async (req, res) => {
  try {
    const { prjId } = req.query;
    const projectAssignments = await ProjectAssignmentModel.find({ prjCode: prjId, isDeleted: false });
    res.status(200).json(projectAssignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchProjectAssignmentByPrjName = async (req, res) => {
  try {
    const { prjName } = req.query;
    const projectAssignments = await ProjectAssignmentModel.find({ prjName: { $regex: prjName, $options: 'i' }, isDeleted: false });
    res.status(200).json(projectAssignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeeProjectAssignments = async (req, res) => {
  try {
    const { genisysId } = req.params;

    // Check if Employee exists
    const employee = await EmployeeModel.findOne({ genisysId, isDeleted: false });
    if (!employee) {
      return res.status(404).json({ message: `Employee with ID ${genisysId} does not exist` });
    }

    // Get project assignments for the employee
    const assignments = await ProjectAssignmentModel.find({ genisysId, isDeleted: false });

    if (assignments.length === 0) {
      return res.status(200).json([]);
    }

    let totalBilledAllocation = 0;
    let totalInternalAllocation = 0;
    let totalBlockedAllocation = 0;
    let totalAvailableAllocation = employee.employmentPercentage;
    let totalShadowAllocation = 0;

    const assignmentDetails = await Promise.all(assignments.map(async assignment => {
      const project = await ProjectModel.findOne({ prjCode: assignment.prjCode, isDeleted: false });

      let status = '';
      const allocation = parseFloat(assignment.allocation.replace('%', '')); // Parse allocation as number

      if (assignment.status === prjAllocationStatusEnum.Billed) { // Billed
        totalBilledAllocation += allocation;
        status = allocation >= employee.employmentPercentage ? `Billed` : `Partially Billed`;
      } else if (assignment.status === prjAllocationStatusEnum.Internal) { // Shadow
        totalInternalAllocation += allocation;
        totalShadowAllocation += allocation;
        status = `Internal`;
      } else if (assignment.status === prjAllocationStatusEnum.Blocked) { // Blocked
        totalInternalAllocation += allocation;
        totalBlockedAllocation += allocation;
        status = `Blocked`;
      }


      totalAvailableAllocation -= allocation;

      return {
        projectName: project.prjName,
        projectCode: project.prjCode,
        clientName: project.custName,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        allocation: `${allocation}%`,
        status: status
      };
    }));

    const statusArray = [];
    if (totalBilledAllocation >= employee.employmentPercentage) {
      statusArray.push(`${totalBilledAllocation}% - Billed`);
    } else if (totalBilledAllocation > 0) {
      statusArray.push(`${totalBilledAllocation}% - Partially Billed`);
    }

    if (totalBlockedAllocation > 0) {
      statusArray.push(`${totalBlockedAllocation}% - Blocked`);
    }

    if (totalShadowAllocation > 0) {
      statusArray.push(`${totalShadowAllocation}% - Internal`);
    }

    if (totalAvailableAllocation > 0) {
      statusArray.push(`${totalAvailableAllocation}% - Available`);
    }

    const systemStatus = statusArray.join(', ');

    res.status(200).json({
      assignments: assignmentDetails,
      systemStatus: systemStatus
    });
  } catch (error) {
    console.error('Error fetching project assignments:', error);
    res.status(500).json({ message: error.message });
  }
};