import EmployeeModel from '../models/employee.model.js';
import ProjectModel from '../models/project.model.js';
import ProjectAssignmentModel from '../models/project-assignment.model.js';
import { prjAllocationStatusEnum } from '../constants/project-allocation-status-enum.js';
import { getCurrentMonthFilter } from '../helper/currentmonth.js';
import { roles } from '../constants/role-enum.js';
import { sortEmployeesByName } from '../helper/sortemployee.js';
import { reportFilterTypes } from '../constants/report-filter-type.js';

const generateReport = async (id = null) => {
  const currentDate = new Date();
  const sixMonthsAgo = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 5, 1, 0, 0, 0)); // First day of six months ago

  // Fetch Projects & Assignments
  const projectFilter = id ? { isDeleted: false, prjMgrId: id } : { isDeleted: false };
  const projects = await ProjectModel.find(projectFilter);

  const assignments = await ProjectAssignmentModel.find({
    prjCode: { $in: projects.map(project => project.prjCode) },
    isDeleted: false,
    startDate: { $lte: currentDate },
    endDate: { $gte: sixMonthsAgo }
  });

  // Get Employees: Either all or specific to PM’s projects
  const assignedEmployeeGenisysIds = assignments.map(assignment => assignment.genisysId);
  const employeeFilter = id
    ? { isDeleted: false, $or: [{ managerId: id }, { genisysId: { $in: assignedEmployeeGenisysIds } }] }
    : { isDeleted: false };
  const employees = await EmployeeModel.find(employeeFilter);

  // Generate six-month range
  const months = [];
  for (let d = new Date(sixMonthsAgo); d <= currentDate; d.setMonth(d.getMonth() + 1)) {
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  return months.map(({ year, month }) => {
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const today = new Date();
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // Last day of the month
    const endOfMonth = lastDayOfMonth > today ? today : lastDayOfMonth;

    const activeEmployees = employees.filter(emp => {
      const joinDate = new Date(emp.joiningDate);
      const terminationDate = emp.terminationDate ? new Date(emp.terminationDate) : null;
      return joinDate <= endOfMonth && (!terminationDate || terminationDate >= startOfMonth);
    });

    const exitedEmployees = employees.filter(emp => {
      if (!emp.terminationDate) return false;
      const terminationDate = new Date(emp.terminationDate);
      return terminationDate >= new Date(); // present/future
    });

    const monthlyAssignments = assignments.filter(assignment =>
      assignment.startDate <= endOfMonth &&
      assignment.endDate >= startOfMonth &&
      assignment.endDate >= new Date().setHours(0, 0, 0, 0)
    );

    let unbilled = 0, totalOverallBilledAllocation = 0, blocked = 0, billed = 0, partiallyBilled = 0, unassigned = 0, internal = 0;
    let totalAllocation = 0, billedResignedCount = 0, unbilledResignedCount = 0;
    let unbilledAllocation = 0;
    let billedEmployeeAllocations = 0;  
    let unBilledEmployeeAllocations = 0;  
    let employeesFortotalPeopleUtilization = [], billedEmployees = [], unBilledEmployees = [];
    let totalPeopleUtilizationAllocation = 0; 

    activeEmployees.forEach(employee => {
      if (!employee.billable) return;
      const employeeAssignments = monthlyAssignments
        .filter(assignment => assignment.genisysId === employee.genisysId)
        .sort((a, b) => a.status - b.status);

      let totalBilledAllocation = 0;
      let isBlocked = false;
      let isInternal = false;

      employeeAssignments.forEach(assignment => {
        const allocation = parseInt(assignment.allocation); // percent
        if (!isNaN(allocation)) {
          totalAllocation += allocation;
          if (assignment.status === prjAllocationStatusEnum.Billed) {
            totalBilledAllocation += allocation;
            totalOverallBilledAllocation += allocation;
            billedEmployeeAllocations += allocation;
            if (!billedEmployees.includes(assignment.genisysId)) billedEmployees.push(assignment.genisysId);
          } else {
            unbilledAllocation += allocation;
            unBilledEmployeeAllocations += allocation;
            if (!unBilledEmployees.includes(assignment.genisysId)) unBilledEmployees.push(assignment.genisysId);
          }

          // For legacy average people utilization (not displayed unless needed)
          if (!isBlocked) {
            totalPeopleUtilizationAllocation += allocation;
            if (!employeesFortotalPeopleUtilization.includes(assignment.genisysId)) {
              employeesFortotalPeopleUtilization.push(assignment.genisysId);
            }
          }
        }

        if (assignment.status) {
          if (assignment.status === prjAllocationStatusEnum.Blocked) isBlocked = true;
          if (assignment.status === prjAllocationStatusEnum.Internal) isInternal = true;
        }
      });

      const isExitingThisMonth = exitedEmployees.some(exitedEmployee => exitedEmployee.id === employee.id);

      if (totalBilledAllocation >= employee.employmentPercentage) {
        billed++;
        if (isExitingThisMonth) billedResignedCount++;
      } else if (totalBilledAllocation < employee.employmentPercentage && totalBilledAllocation > 0) {
        partiallyBilled++;
        if (isExitingThisMonth) billedResignedCount++;
      } else if (isExitingThisMonth) {
        unbilledResignedCount++;
      } else {
        if (isBlocked) {
          blocked++;
        } else if (isInternal) {
          internal++;
        } else {
          unassigned++;
        }
      }
    });

    const activeEmployeeIds = activeEmployees.map(emp => emp.genisysId);
    const billedEmployeeIds = monthlyAssignments
      .filter(a => a.status === prjAllocationStatusEnum.Billed && activeEmployeeIds.includes(a.genisysId))
      .map(a => a.genisysId);

    let unBilledEmployeeIds = monthlyAssignments
      .filter(a => a.status !== prjAllocationStatusEnum.Billed && activeEmployeeIds.includes(a.genisysId))
      .map(a => a.genisysId);
    unBilledEmployeeIds = unBilledEmployeeIds.filter(id => !billedEmployeeIds.includes(id));

    const totalEmployeeCount = activeEmployees.length;
    const totalNonBillableCount = activeEmployees.filter(emp => !emp.billable).length;
    const totalBillableCount = totalEmployeeCount - totalNonBillableCount;
    const billedHeadcount = billed + partiallyBilled;
    const billedAllocation = billedHeadcount > 0 ? Number((totalOverallBilledAllocation / 100).toFixed(2)) : 0; // total billed FTE

    // Legacy average people utilization (not required to display now)
    const peopleUtilizationLegacy = (employeesFortotalPeopleUtilization.length > 0)
      ? (totalPeopleUtilizationAllocation / employeesFortotalPeopleUtilization.length).toFixed(2) + '%'
      : '0.00%';

    const billableUtilization = ((billedAllocation / Math.max((totalBillableCount - unbilledResignedCount), 1)) * 100).toFixed(2) + '%';

    // People Utilization : Billed (average % per billed employee)
    const billedPeopleUtilizationPctNum = (billedEmployees.length > 0)
      ? (billedEmployeeAllocations / billedEmployees.length)
      : 0;

    // People Utilization : Unbilled (average % per unbilled employee)
    const unbilledPeopleUtilizationPctNum = (unBilledEmployees.length > 0)
      ? (unBilledEmployeeAllocations / unBilledEmployees.length)
      : 0;

    // Final People Utilization = mean of the two
    const peopleUtilizationPctNum = (billedPeopleUtilizationPctNum + unbilledPeopleUtilizationPctNum) / 2;

    const billedPeopleUtilization = `${billedPeopleUtilizationPctNum.toFixed(2)}%`;
    const unbilledPeopleUtilization = `${unbilledPeopleUtilizationPctNum.toFixed(2)}%`;
    const peopleUtilization = `${peopleUtilizationPctNum.toFixed(2)}%`;

    // Headcount unbilled (as before)
    unbilled = totalBillableCount - billedHeadcount;

    return {
      year,
      month,
      totalEmployeeCount,
      totalNonBillableEmployeeCount: totalNonBillableCount,
      totalBillableCount,
      unbilled,
      blocked,
      billedHeadcount,
      unassigned,
      internal,
      billed,
      partiallyBilled,
      billedAllocation, 
      billableUtilization, 
      peopleUtilization,              
      billedPeopleUtilization,        
      unbilledPeopleUtilization,       
      peopleUtilizationLegacy,
      exits: exitedEmployees.length,
      billedResignedCount,
      unbilledResignedCount,
      totalOverallBilledAllocation,
      totalAllocation
    };
  });
};

// Generate report for SD and PM
export const generateSixMonthReport = async (req, res) => {
  try {
    const { id, role } = req.user;
    const managerId = role === roles.PM ? id : null;
    const results = await generateReport(managerId);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFilteredReport = async (req, res) => {
  try {
    const { filterType } = req.query;
    const { id: managerId, role } = req.user;
    const { startOfMonth, endOfMonth } = getCurrentMonthFilter();
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectFilter = role === roles.PM ? { isDeleted: false, prjMgrId: managerId } : { isDeleted: false };
    const projects = await ProjectModel.find(projectFilter);

    let employees = [];
    let projectAssignments = [];

    switch (parseInt(filterType)) {
      case reportFilterTypes.NonBillable:
        employees = await EmployeeModel.find({
          isDeleted: false, billable: false,
          ...(role === roles.PM ? { managerId: managerId } : {})
        });
        break;

      case reportFilterTypes.Exit:
        employees = await EmployeeModel.find({
          isDeleted: false,
          terminationDate: { $gte: startOfMonth, $lte: endOfMonth },
          ...(role === roles.PM ? { managerId: managerId } : {})
        });
        break;

      case reportFilterTypes.Available: {
        const allEmployees = await EmployeeModel.find({
          isDeleted: false,
          billable: true,
          ...(role === roles.PM ? { managerId: managerId } : {})
        });

        if (projects.length === 0) {
          employees = allEmployees.filter(emp => {
            const isExitedThisMonth =
              emp.terminationDate &&
              emp.terminationDate >= startOfMonth &&
              emp.terminationDate <= endOfMonth;
            return !isExitedThisMonth;
          });
        } else {
          const allocatedEmployees = await ProjectAssignmentModel.find({
            prjCode: { $in: projects.map(project => project.prjCode) },
            isDeleted: false,
            $and: [
              { startDate: { $lte: endOfMonth } },
              { endDate: { $gte: startOfMonth } },
              { endDate: { $gte: today } }
            ]
          }).select('genisysId');

          const allocatedEmployeeIds = new Set(allocatedEmployees.map(e => e.genisysId));

          employees = allEmployees.filter(emp => {
            const hasAllocation = allocatedEmployeeIds.has(emp.genisysId);
            const isExitedThisMonth =
              emp.terminationDate &&
              emp.terminationDate >= startOfMonth &&
              emp.terminationDate <= endOfMonth;
            return !hasAllocation && !isExitedThisMonth;
          });
        }
        break;
      }

      case reportFilterTypes.FullyBilled:
        if (!projects.length) {
          return res.status(404).json({ message: "No projects found" });
        }
        projectAssignments = await ProjectAssignmentModel.aggregate([
          {
            $match: {
              prjCode: { $in: projects.map(project => project.prjCode) },
              status: prjAllocationStatusEnum.Billed,
              isDeleted: false,
              $and: [
                { startDate: { $lte: endOfMonth } },
                { endDate: { $gte: startOfMonth } },
                { endDate: { $gte: new Date() } }
              ]
            }
          },
          {
            $lookup: {
              from: "employees",
              localField: "genisysId",
              foreignField: "genisysId",
              as: "employee"
            }
          },
          { $unwind: "$employee" },
          {
            $group: {
              _id: "$genisysId",
              totalAllocation: { $sum: { $toInt: "$allocation" } },
              allocationCapacity: { $first: { $toInt: "$employee.employmentPercentage" } },
              assignments: { $push: "$$ROOT" }
            }
          },
          {
            $match: {
              $expr: { $gte: ["$totalAllocation", "$allocationCapacity"] }
            }
          },
          { $unwind: "$assignments" },
          { $replaceRoot: { newRoot: "$assignments" } }
        ]);
        break;

      case reportFilterTypes.PartiallyBilled:
        if (!projects.length) {
          return res.status(404).json({ message: "No projects found" });
        }
        projectAssignments = await ProjectAssignmentModel.aggregate([
          {
            $match: {
              status: prjAllocationStatusEnum.Billed,
              isDeleted: false,
              prjCode: { $in: projects.map(project => project.prjCode) },
              $and: [
                { startDate: { $lte: endOfMonth } },
                { endDate: { $gte: startOfMonth } },
                { endDate: { $gte: new Date() } }
              ]
            }
          },
          {
            $lookup: {
              from: "employees",
              localField: "genisysId",
              foreignField: "genisysId",
              as: "employee"
            }
          },
          { $unwind: "$employee" },
          {
            $group: {
              _id: "$genisysId",
              totalAllocation: { $sum: { $toInt: "$allocation" } },
              allocationCapacity: { $first: { $toInt: "$employee.employmentPercentage" } },
              assignments: { $push: "$$ROOT" }
            }
          },
          {
            $match: {
              $expr: { $lt: ["$totalAllocation", "$allocationCapacity"] }
            }
          },
          { $unwind: "$assignments" },
          { $replaceRoot: { newRoot: "$assignments" } }
        ]);
        break;

      case reportFilterTypes.Internal:
        if (!projects.length) {
          return res.status(404).json({ message: "No projects found" });
        }
        {
          let shadowAssignments = await ProjectAssignmentModel.find({
            status: prjAllocationStatusEnum.Internal,
            isDeleted: false,
            prjCode: { $in: projects.map(project => project.prjCode) },
            $and: [
              { startDate: { $lte: endOfMonth } },
              { endDate: { $gte: startOfMonth } },
              { endDate: { $gte: today } }
            ]
          });
          const shadowGenisysIds = shadowAssignments.map(a => a.genisysId);
          const allAssignments = await ProjectAssignmentModel.find({
            genisysId: { $in: shadowGenisysIds },
            isDeleted: false
          });
          const filteredGenisysIds = shadowGenisysIds.filter(genisysId => {
            const a = allAssignments.filter(x => x.genisysId === genisysId);
            const hasHigherPriorityStatus = a.some(x =>
              [prjAllocationStatusEnum.Billed, prjAllocationStatusEnum.Blocked].includes(x.status) &&
              x.startDate <= endOfMonth &&
              x.endDate >= startOfMonth &&
              x.endDate >= new Date()
            );
            return !hasHigherPriorityStatus;
          });

          const shadowEmployees = await EmployeeModel.find({
            genisysId: { $in: filteredGenisysIds },
            isDeleted: false,
            $or: [{ terminationDate: { $exists: false } }, { terminationDate: null }]
          });

          projectAssignments = shadowAssignments.filter(assignment =>
            shadowEmployees.some(emp => emp.genisysId === assignment.genisysId)
          );
        }
        break;

      case reportFilterTypes.Blocked:
        if (!projects.length) {
          return res.status(404).json({ message: "No projects found" });
        }
        {
          let blockedAssignments = await ProjectAssignmentModel.find({
            status: prjAllocationStatusEnum.Blocked,
            isDeleted: false,
            prjCode: { $in: projects.map(project => project.prjCode) },
            $and: [
              { startDate: { $lte: endOfMonth } },
              { endDate: { $gte: startOfMonth } },
              { endDate: { $gte: new Date() } }
            ]
          });
          const blockedGenisysIds = blockedAssignments.map(a => a.genisysId);
          const allBlockedAssignments = await ProjectAssignmentModel.find({
            genisysId: { $in: blockedGenisysIds },
            isDeleted: false
          });
          const filteredBlockedGenisysIds = blockedGenisysIds.filter(genisysId => {
            const a = allBlockedAssignments.filter(x => x.genisysId === genisysId);
            const hasHigherPriorityStatus = a.some(x =>
              [prjAllocationStatusEnum.Billed].includes(x.status) &&
              x.startDate <= endOfMonth &&
              x.endDate >= startOfMonth &&
              x.endDate >= new Date()
            );
            return !hasHigherPriorityStatus;
          });

          const blockedEmployees = await EmployeeModel.find({
            genisysId: { $in: filteredBlockedGenisysIds },
            isDeleted: false,
            $or: [{ terminationDate: { $exists: false } }, { terminationDate: null }]
          });

          projectAssignments = blockedAssignments.filter(assignment =>
            blockedEmployees.some(emp => emp.genisysId === assignment.genisysId)
          );
        }
        break;

      case reportFilterTypes.BilledResigned: {
        if (!projects.length) {
          return res.status(404).json({ message: "No projects found" });
        }
        let allPA = await ProjectAssignmentModel.find({
          isDeleted: false,
          prjCode: { $in: projects.map(project => project.prjCode) },
          $and: [
            { startDate: { $lte: endOfMonth } },
            { endDate: { $gte: startOfMonth } },
            { endDate: { $gte: new Date() } }
          ]
        });
        const billedExitEmployees = await EmployeeModel.find({
          isDeleted: false,
          billable: true,
          ...(role === roles.PM ? { managerId: managerId } : {})
        });
        employees = [];
        billedExitEmployees.forEach(emp => {
          const hasExit = emp.terminationDate != null && emp.terminationDate != undefined;
          const hasBilled = allPA.some(a => a.genisysId === emp.genisysId && a.status === prjAllocationStatusEnum.Billed);
          if (hasExit && hasBilled) {
            employees.push(emp);
          }
        });
        break;
      }

      case reportFilterTypes.UnbilledResigned: {
        const unbilledExitEmployees = await EmployeeModel.find({
          isDeleted: false,
          billable: true,
          ...(role === roles.PM ? { managerId: managerId } : {})
        });

        if (!projects.length) {
          employees = unbilledExitEmployees.filter(emp => emp.terminationDate != null && emp.terminationDate != undefined);
        } else {
          const allPA = await ProjectAssignmentModel.find({
            isDeleted: false,
            prjCode: { $in: projects.map(project => project.prjCode) },
            $and: [
              { startDate: { $lte: endOfMonth } },
              { endDate: { $gte: startOfMonth } },
              { endDate: { $gte: new Date() } }
            ]
          });
          employees = unbilledExitEmployees.filter(emp => {
            const hasExit = emp.terminationDate != null && emp.terminationDate != undefined;
            const hasBilled = allPA.some(a => a.genisysId === emp.genisysId && a.status === prjAllocationStatusEnum.Billed);
            return hasExit && !hasBilled;
          });
        }
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid filter type provided' });
    }

    // Fix equality bugs
    if (employees.length === 0 && projectAssignments.length === 0) {
      return res.status(404).json({ message: 'No records found' });
    }

    if (employees.length > 0) {
      const sortedEmployees = sortEmployeesByName(employees);
      return res.status(200).json(sortedEmployees);
    }

    if (projectAssignments.length > 0) {
      return res.status(200).json(projectAssignments);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMasterEmpData = async (req, res) => {
  try {
    const loggedInManagerId = req.user.id;
    const role = req.user.role;
    const query = { isDeleted: false };
    if (role === roles.PM) {
      query.managerId = loggedInManagerId;
    }

    const data = await EmployeeModel.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'projectassignments',
          localField: 'genisysId',
          foreignField: 'genisysId',
          as: 'projectAssignments'
        }
      },
      {
        $project: {
          id: 1,
          emailId: 1,
          displayName: 1,
          genisysId: 1,
          experience: 1,
          billable: 1,
          employmentType: 1,
          employmentPercentage: 1,
          joiningDate: 1,
          terminationDate: 1,
          projectAssignments: {
            $map: {
              input: {
                $filter: {
                  input: '$projectAssignments',
                  cond: { $eq: ['$$this.isDeleted', false] }
                }
              },
              as: 'assignment',
              in: {
                prjAssId: '$$assignment.prjAssId',
                prjCode: '$$assignment.prjCode',
                prjName: '$$assignment.prjName',
                genisysId: '$$assignment.genisysId',
                allocation: '$$assignment.allocation',
                status: '$$assignment.status',
                startDate: '$$assignment.startDate',
                endDate: '$$assignment.endDate',
                prjRole: '$$assignment.prjRole',
                isDeleted: '$$assignment.isDeleted'
              }
            }
          }
        }
      }
    ]);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in aggregation:', error);
    res.status(500).json({ message: 'Server Error', error });
  }
};

export const getUnbilledReport = async (req, res) => {  0
  try {
    const { id: managerId, role } = req.user;
    const { startOfMonth, endOfMonth } = getCurrentMonthFilter();
    const today = new Date();

    const projectFilter = role === roles.PM ? { isDeleted: false, prjMgrId: managerId } : { isDeleted: false };
    const projects = await ProjectModel.find(projectFilter);
    const projectCodes = projects.map(project => project.prjCode);

    let projectAssignments = [];

    if (projects.length > 0) {
      const allAllocations = await ProjectAssignmentModel.find({
        isDeleted: false,
        prjCode: { $in: projectCodes },
        $and: [
          { startDate: { $lte: endOfMonth } },
          { endDate: { $gte: startOfMonth } },
          { endDate: { $gte: new Date() } }
        ]
      });

      const allEmployees = await EmployeeModel.find({
        isDeleted: false,
        billable: true,
        ...(role === roles.PM ? { managerId: managerId } : {})
      });

      const billedEmployeeIds = new Set(
        allAllocations.filter(e => e.status === prjAllocationStatusEnum.Billed).map(e => e.genisysId)
      );
      const allocatedEmployeeIds = new Set(allAllocations.map(e => e.genisysId));

      projectAssignments = Object.values(
        allAllocations
          .filter(assignment => {
            const employee = allEmployees.find(emp => emp.genisysId === assignment.genisysId);
            if (employee?.terminationDate && new Date(employee.terminationDate) < today) {
              return false;
            }
            return (
              !billedEmployeeIds.has(assignment.genisysId) &&
              [prjAllocationStatusEnum.Internal, prjAllocationStatusEnum.Blocked].includes(assignment.status)
            );
          })
          .reduce((acc, assignment) => {
            const existingAssignment = acc[assignment.genisysId];
            const priorityOrder = {
              [prjAllocationStatusEnum.Blocked]: 1,
              [prjAllocationStatusEnum.Internal]: 2
            };
            if (!existingAssignment || priorityOrder[assignment.status] < priorityOrder[existingAssignment.status]) {
              acc[assignment.genisysId] = assignment;
            }
            return acc;
          }, {})
      );

      allEmployees.forEach(emp => {
        if (emp.terminationDate && new Date(emp.terminationDate) < today) return;
        if (!allocatedEmployeeIds.has(emp.genisysId)) {
          projectAssignments.push({
            displayName: emp.displayName,
            startDate: null,
            endDate: null,
            allocation: '0',
            genisysId: emp.genisysId,
            prjName: 'Unallocated'
          });
        }
      });
    }

    res.status(200).json({ projectAssignments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};