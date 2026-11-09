import DeliveryAssignment from "../../models/delivery-assignment.model.js";
import project from "../../models/project.model.js";
import Employee from "../../models/employee.model.js";
import DeliveryReview from "../../models/delivery-review.model.js";
import { sendEmail } from "../../helper/mailer.js";

async function validateAssignmentAndGetManagerEmail(projectId, assignedTo, reviewBy) {
  const projectData = await project.findOne({ prjCode: projectId, isDeleted: false }, { prjName: 1, _id: 0 });
  if (!projectData) throw new Error("Project not found");

  const manager = await Employee.findOne({ id: assignedTo, isDeleted: false }, { emailId: 1, displayName: 1, _id: 0 });
  if (!manager) throw new Error("Manager not found");

  const existingAssignments = await DeliveryAssignment.find({ projectId, assignedTo, isDeleted: false }, { reviewBy: 1, _id: 0 });

  if (existingAssignments.length > 0) {
    const incomingTimestamp = new Date(reviewBy).getTime();
    const isInvalid = existingAssignments.some(({ reviewBy }) => incomingTimestamp <= new Date(reviewBy).getTime());
    if (isInvalid) {
      throw new Error(`Review By date must be a future date compared to existing assignments for employee ${manager.displayName} in project ${projectData.prjName}`);
    }
  }
  return manager;
}

export const createDeliveryAssignment = async (req, res) => {
  try {
    const assignedBy = req.user.id;
    const { projectId, deliveryTemplateId, assignedTo, reviewBy } = req.body;

    if (!projectId || !deliveryTemplateId || !assignedTo || !reviewBy) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const manager = await validateAssignmentAndGetManagerEmail(projectId, assignedTo, reviewBy);

    const projectData = await project.findOne({ prjCode: projectId, isDeleted: false }, { prjName: 1, _id: 0 });
    if (!projectData) {
      return res.status(404).json({ message: "Project Not Found" });
    }

    try {
      await sendEmail(
        manager.emailId,
        "P-Sense : NPLB Review - New Delivery Review Task Assigned",
        `
          <p>Hello ${manager.displayName},</p>
          <p>A new Project Review have been assigned to you for <b>${projectData.prjName}</b>.</p>
          <p>Please review the same on or before <b>${new Date(reviewBy).toLocaleDateString()}</b>.</p> <p>Check your dashboard for further details.</p>
          <p style="color:#0041C2;">Warm Regards,</p>
          <p style="color:#0041C2;">SD Delivery</p>
          </p>
        `
      );
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: "Failed to send notification email", error: error });
    }

    const newDeliveryAssignment = new DeliveryAssignment({
      projectId,
      deliveryTemplateId,
      assignedTo,
      assignedBy,
      reviewBy
    });

    await newDeliveryAssignment.save();
    res.status(201).json(newDeliveryAssignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDeliveryAssignments = async (req, res) => {
  try {
    const user = req.user.id;

    const deliveryAssignments = await DeliveryAssignment.find(
      { assignedTo: user, isDeleted: false },
      { id: 1, projectId: 1, reviewBy: 1, _id: 0 }
    );

    if (!deliveryAssignments || deliveryAssignments.length === 0) {
      return res.status(200).json({ message: "No delivery review pending." });
    }

    const assignmentIds = deliveryAssignments.map(a => a.id);

    const reviewedAssignments = await DeliveryReview.find(
      { forDeliveryAssignment: { $in: assignmentIds } },
      { forDeliveryAssignment: 1 }
    );
    const reviewedAssignmentIds = reviewedAssignments.map(r => r.forDeliveryAssignment);

    const filteredAssignments = deliveryAssignments.filter(
      a => !reviewedAssignmentIds.includes(a.id)
    );

    if (filteredAssignments.length === 0) {
      return res.status(200).json({ message: "All assignments have already been reviewed" });
    }

    const projectIds = filteredAssignments.map(a => a.projectId);

    const projectDetails = await project.find(
      { prjCode: { $in: projectIds }, isDeleted: false },
      { prjName: 1, prjCode: 1 }
    );

    const response = filteredAssignments.map(assignment => {
      const project = projectDetails.find(p => p.prjCode === assignment.projectId);
      return {
        assignmentId: assignment.id,
        reviewBy: assignment.reviewBy,
        prjName: project ? project.prjName : null
      };
    });

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllDeliveryAssignments = async (req, res) => {
  try {
    const deliveryAssignments = await DeliveryAssignment.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "deliveryreviews",
          localField: "id",
          foreignField: "forDeliveryAssignment",
          as: "reviewData",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "assignedTo",
          foreignField: "id",
          as: "employeeData",
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "prjCode",
          as: "projectData",
        },
      },
      {
        $unwind: {
          path: "$reviewData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$employeeData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$projectData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          id: 1,
          projectId: 1,
          projectName: "$projectData.prjName",
          assignedTo: "$employeeData.displayName",
          reviewBy: 1,
          reviewDate: "$reviewData.reviewedAt",
        },
      },
    ]);

    if (!deliveryAssignments || deliveryAssignments.length === 0) {
      return res.status(200).json({ message: "No delivery assignments found" });
    }

    res.status(200).json(deliveryAssignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
