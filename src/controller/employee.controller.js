import dotenv from 'dotenv';
import EmployeeModel from '../models/employee.model.js';
import ProjectAssignmentModel from '../models/project-assignment.model.js';
import { roles } from '../constants/role-enum.js';
import { loadEmployees } from '../seeder/seedEmployee.js';
import { prjAllocationStatusEnum } from '../constants/project-allocation-status-enum.js';
import { sortEmployeesByName } from '../helper/sortemployee.js';

const env = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${env}` });

export const getEmployees = async (req, res) => {
  try {
    const role = req.user.role;
    const { checkAD } = req.query;
    const { roleFilter } = req.params;

    if (checkAD) {
      await loadEmployees();
    }

    let employees = [];

    if (role === roles.SD || role === roles.PM) {
      employees = await EmployeeModel.aggregate([
        {
          $match: {
            isDeleted: false,
            ...((role === roles.PM && parseInt(roleFilter) === 1) ? { $or: [{ managerId: req.user.id }, { id: req.user.id }] } : {}),
          },
        },
        {
          $lookup: {
            from: "projectassignments",
            localField: "genisysId",
            foreignField: "genisysId",
            as: "projects",
            pipeline: [
              {
                $match: { isDeleted: false }
              }
            ]
          }
        },
        {
          $addFields: {
            totalBilledAllocation: {
              $sum: {
                $map: {
                  input: "$projects",
                  as: "project",
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $ne: ["$$project.allocation", null] },
                          { $eq: ["$$project.isDeleted", false] },
                          { $eq: ["$$project.status", prjAllocationStatusEnum.Billed] },
                        ],
                      },
                      then: { $toInt: "$$project.allocation" },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },

        {
          $addFields: {
            totalInternalAllocation: {
              $sum: {
                $map: {
                  input: "$projects",
                  as: "project",
                  in: {
                    $cond: {
                      if: { $and: [{ $ne: ["$$project.allocation", null] }, { $eq: ["$$project.isDeleted", false] }, { $eq: ["$$project.status", prjAllocationStatusEnum.Internal] }] },
                      then: { $toInt: "$$project.allocation" },
                      else: 0
                    }
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            totalBlockedAllocation: {
              $sum: {
                $map: {
                  input: "$projects",
                  as: "project",
                  in: {
                    $cond: {
                      if: { $and: [{ $ne: ["$$project.allocation", null] }, { $eq: ["$$project.isDeleted", false] }, { $eq: ["$$project.status", prjAllocationStatusEnum.Blocked] }] },
                      then: { $toInt: "$$project.allocation" },
                      else: 0
                    }
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            statusArray: {
              $setUnion: [
                {
                  $filter: {
                    input: [
                      {
                        $cond: [{ $gt: ["$totalBilledAllocation", "$employmentPercentage"] }, "Overbilled", null],
                      },
                      {
                        $cond: [{ $eq: [{ $toInt: "$totalBilledAllocation" }, "$employmentPercentage"] }, "Billed", null],
                      },
                      {
                        $cond: [
                          { $and: [{ $gt: ["$totalBilledAllocation", 0] }, { $lt: ["$totalBilledAllocation", "$employmentPercentage"] }] },
                          "Partially Billed",
                          null,
                        ],
                      },
                      {
                        $cond: [{ $in: [prjAllocationStatusEnum.Blocked, "$projects.status"] }, "Blocked", null],
                      },
                      {
                        $cond: [{ $in: [prjAllocationStatusEnum.Internal, "$projects.status"] }, "Internal", null],
                      }
                    ],
                    as: "status",
                    cond: { $ne: ["$$status", null] },
                  },
                },
                []
              ],
            },
          },
        },
        {
          $addFields: {
            status: {
              $concat: [
                {
                  $reduce: {
                    input: "$statusArray",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        {
                          $cond: [{
                            $eq: ["$$value", ""]
                          }, "", ", "]
                        },
                        "$$this"
                      ]
                    }
                  }
                },
                {
                  $cond: {
                    if: {
                      $and: [
                        { $not: { $in: ["Billed", "$statusArray"] } },
                        { $not: { $in: ["Overbilled", "$statusArray"] } },
                        { $not: { $eq: ["$totalBlockedAllocation", 100] } }
                      ]
                    },
                    then: {
                      $cond: {
                        if: { $eq: ["$status", ""] },
                        then: "Available",
                        else: {
                          $cond: {
                            if: { $eq: [{ $size: "$statusArray" }, 0] },
                            then: "Available",
                            else: ", Available"
                          }
                        }
                      }
                    },
                    else: "",
                  },
                },
              ],
            },
          },
        },
        {
          $addFields: {
            projectAssignmentList: "$projects",
          },
        },
        {
          $lookup: {
            from: "personnelskills",
            localField: "id",
            foreignField: "empId",
            as: "skills",
            pipeline: [
              {
                $match: { isDeleted: false }
              }
            ]
          },
        },
        {
          $project: {
            projects: {
              $reduce: {
                input: "$projects",
                initialValue: "",
                in: {
                  $concat: [
                    "$$value",
                    { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                    "$$this.prjName",
                  ],
                },
              },
            },
            skills: {
              $reduce: {
                input: "$skills",
                initialValue: "",
                in: {
                  $concat: [
                    "$$value",
                    { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                    "$$this.skillName",
                  ],
                },
              },
            },
            employeeData: { $mergeObjects: ["$$ROOT", "$$REMOVE"] },
          },
        },
        {
          $addFields: {
            projects: {
              $cond: {
                if: { $eq: ["$projects", ""] },
                then: "Unallocated",
                else: "$projects",
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$employeeData",
                { projects: "$projects", skills: "$skills", status: "$status" },
              ],
            },
          },
        },
        {
          $addFields: {
            statuspercentage: {
              $cond: {
                if: { $gt: [{ $size: "$statusArray" }, 0] },
                then: {
                  $let: {
                    vars: {
                      billed: {
                        $cond: {
                          if: { $ne: ["$totalBilledAllocation", 0] },
                          then: {
                            $concat: [
                              { $toString: "$totalBilledAllocation" },
                              " - Billed"
                            ],
                          },
                          else: "",
                        },
                      },
                      internal: {
                        $cond: {
                          if: { $ne: ["$totalInternalAllocation", 0] },
                          then: {
                            $concat: [
                              { $toString: "$totalInternalAllocation" },
                              " - Internal"
                            ],
                          },
                          else: "",
                        },
                      },
                      blocked: {
                        $cond: {
                          if: { $ne: ["$totalBlockedAllocation", 0] },
                          then: {
                            $concat: [
                              { $toString: "$totalBlockedAllocation" },
                              " - Blocked"
                            ],
                          },
                          else: "",
                        },
                      },
                    },
                    in: {
                      $concat: [
                        "$$billed",
                        { $cond: [{ $ne: ["$$billed", ""] }, ", ", ""] },
                        "$$internal",
                        { $cond: [{ $ne: ["$$internal", ""] }, ", ", ""] },
                        "$$blocked",
                        { $cond: [{ $ne: ["$$blocked", ""] }, ", ", ""] },
                      ]
                    },
                  },
                },
                else: "0 - Available",
              },
            },
          },
        }
        ,
        {
          $project: {
            statusArray: 0,
            totalBilledAllocation: 0,
            totalInternalAllocation: 0,
            totalBlockedAllocation: 0,
            statuspercentage: 0,
            __v: 0,
          },
        },
      ]);
    } else {
      return res.status(200).json([]);
    }
    if (employees.length > 0) {
      return res.status(200).json(sortEmployeesByName(employees));
    }

    return res.status(200).json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that Employee id is provided
    if (!id) {
      return res.status(400).json({ message: 'Employee id is required' });
    }

    const employee = await EmployeeModel.findOne({ id, isDeleted: false });

    if (!employee) {
      return res.status(404).json({ message: `Employee with id ${id} not found` });
    }

    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const employee = await EmployeeModel.create(req.body);
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that Employee id is provided
    if (!id) {
      return res.status(400).json({ message: 'Employee id is required' });
    }

    const updatedEmployee = await EmployeeModel.findOneAndUpdate({ id }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employeeWithStatus = await EmployeeModel.aggregate([
      {
        $match: {
          id,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "projectassignments",
          localField: "genisysId",
          foreignField: "genisysId",
          as: "projects",
          pipeline: [
            {
              $match: { isDeleted: false },
            },
          ],
        },
      },
      {
        $addFields: {
          totalBilledAllocation: {
            $sum: {
              $map: {
                input: "$projects",
                as: "project",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$$project.allocation", null] },
                        { $eq: ["$$project.isDeleted", false] },
                        { $eq: ["$$project.status", prjAllocationStatusEnum.Billed] },
                      ],
                    },
                    then: { $toInt: "$$project.allocation" },
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          totalInternalAllocation: {
            $sum: {
              $map: {
                input: "$projects",
                as: "project",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$$project.allocation", null] },
                        { $eq: ["$$project.isDeleted", false] },
                        { $eq: ["$$project.status", prjAllocationStatusEnum.Internal] },
                      ],
                    },
                    then: { $toInt: "$$project.allocation" },
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          totalBlockedAllocation: {
            $sum: {
              $map: {
                input: "$projects",
                as: "project",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$$project.allocation", null] },
                        { $eq: ["$$project.isDeleted", false] },
                        { $eq: ["$$project.status", prjAllocationStatusEnum.Blocked] },
                      ],
                    },
                    then: { $toInt: "$$project.allocation" },
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          statusArray: {
            $setUnion: [
              {
                $filter: {
                  input: [
                    {
                      $cond: [{ $gt: ["$totalBilledAllocation", "$employmentPercentage"] }, "Overbilled", null],
                    },
                    {
                      $cond: [{ $eq: [{ $toInt: "$totalBilledAllocation" }, "$employmentPercentage"] }, "Billed", null],
                    },
                    {
                      $cond: [
                        { $and: [{ $gt: ["$totalBilledAllocation", 0] }, { $lt: ["$totalBilledAllocation", "$employmentPercentage"] }] },
                        "Partially Billed",
                        null,
                      ],
                    },
                    {
                      $cond: [{ $in: [prjAllocationStatusEnum.Blocked, "$projects.status"] }, "Blocked", null],
                    },
                    {
                      $cond: [{ $in: [prjAllocationStatusEnum.Internal, "$projects.status"] }, "Internal", null],
                    },
                  ],
                  as: "status",
                  cond: { $ne: ["$$status", null] },
                },
              },
              [],
            ],
          },
        },
      },
      {
        $addFields: {
          status: {
            $concat: [
              {
                $reduce: {
                  input: "$statusArray",
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: [{
                          $eq: ["$$value", ""]
                        }, "", ", "]
                      },
                      "$$this"
                    ]
                  }
                }
              },
              {
                $cond: {
                  if: {
                    $and: [
                      { $not: { $in: ["Billed", "$statusArray"] } },
                      { $not: { $in: ["Overbilled", "$statusArray"] } },
                      { $not: { $eq: ["$totalBlockedAllocation", 100] } }
                    ]
                  },
                  then: {
                    $cond: {
                      if: { $eq: ["$status", ""] },
                      then: "Available",
                      else: {
                        $cond: {
                          if: { $eq: [{ $size: "$statusArray" }, 0] },
                          then: "Available",
                          else: ", Available"
                        }
                      }
                    }
                  },
                  else: "",
                },
              },
            ],
          },
        },
      },
      {
        $addFields: {
          projectAssignmentList: "$projects",
        },
      },
      {
        $lookup: {
          from: "personnelskills",
          localField: "id",
          foreignField: "empId",
          as: "skills",
          pipeline: [
            {
              $match: { isDeleted: false },
            },
          ],
        },
      },
      {
        $project: {
          projects: {
            $reduce: {
              input: "$projects",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this.prjName",
                ],
              },
            },
          },
          skills: {
            $reduce: {
              input: "$skills",
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  { $cond: [{ $eq: ["$$value", ""] }, "", ", "] },
                  "$$this.skillName",
                ],
              },
            },
          },
          employeeData: { $mergeObjects: ["$$ROOT", "$$REMOVE"] },
        },
      },
      {
        $addFields: {
          projects: {
            $cond: {
              if: { $eq: ["$projects", ""] },
              then: "Unallocated",
              else: "$projects",
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$employeeData",
              { projects: "$projects", skills: "$skills", status: "$status" },
            ],
          },
        },
      },
      {
        $addFields: {
          statuspercentage: {
            $cond: {
              if: { $gt: [{ $size: "$statusArray" }, 0] },
              then: {
                $let: {
                  vars: {
                    billed: {
                      $cond: {
                        if: { $ne: ["$totalBilledAllocation", 0] },
                        then: {
                          $concat: [
                            { $toString: "$totalBilledAllocation" },
                            " - Billed"
                          ],
                        },
                        else: "",
                      },
                    },
                    internal: {
                      $cond: {
                        if: { $ne: ["$totalInternalAllocation", 0] },
                        then: {
                          $concat: [
                            { $toString: "$totalInternalAllocation" },
                            " - Internal"
                          ],
                        },
                        else: "",
                      },
                    },
                    blocked: {
                      $cond: {
                        if: { $ne: ["$totalBlockedAllocation", 0] },
                        then: {
                          $concat: [
                            { $toString: "$totalBlockedAllocation" },
                            " - Blocked"
                          ],
                        },
                        else: "",
                      },
                    },
                  },
                  in: {
                    $concat: [
                      "$$billed",
                      { $cond: [{ $ne: ["$$billed", ""] }, ", ", ""] },
                      "$$internal",
                      { $cond: [{ $ne: ["$$internal", ""] }, ", ", ""] },
                      "$$blocked",
                      { $cond: [{ $ne: ["$$blocked", ""] }, ", ", ""] },
                    ]
                  },
                },
              },
              else: "0 - Available",
            },
          },
        },
      },
      {
        $project: {
          statusArray: 0,
          totalBilledAllocation: 0,
          totalInternalAllocation: 0,
          totalBlockedAllocation: 0,
          statuspercentage: 0,
          __v: 0,
        },
      },
    ]);

    res.status(200).json(employeeWithStatus[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that employee id is provided
    if (!id) {
      return res.status(400).json({ message: 'Employee id is required' });
    }

    const employee = await EmployeeModel.findOneAndUpdate(
      { id },
      { isDeleted: true }, // Update object
      { new: true } // Options object
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await ProjectAssignmentModel.updateMany(
      { genisysId: employee.genisysId, isDeleted: false },
      { isDeleted: true }
    );

    res.status(200).json({ message: 'Employee and related project assignments deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployeesforAssignment = async (req, res) => {
  try {
    const employees = await EmployeeModel.find({ isDeleted: false, billable: true });
    if (employees.length === 0) {
      return res.status(404).json({ message: 'No billable employees found' });
    }
    const sortedEmployees = sortEmployeesByName(employees);
    res.status(200).json(sortedEmployees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};