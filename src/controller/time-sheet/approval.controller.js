import Employee from "../../models/employee.model.js";
import TimeSheetApproved from "../../models/time-sheet-approved.model.js";
import TimeSheet from "../../models/time-sheet.model.js";
import { validateTimeSheetInput } from "./time-sheet.controller.js";
export const approveTimeSheet = async (req, res) => {
    const user = req.user;
    const { startDate, endDate, timeSheet, timeSheetId, forUser, appliedOn } = req.body;

    if (!timeSheetId && Object.keys(timeSheet).length === 0) {
        return res.status(400).json({ message: "Timesheet details are required" });
    }

    const validationResult = validateTimeSheetInput(timeSheet);
    if (!validationResult.valid) {
        return res.status(400).json({ message: "Invalid time sheet data", errors: validationResult.errors });
    }

    try {

        const existing = await TimeSheetApproved.findOne({
            timeSheetId
        });

        if (existing) {
            return res.status(409).json({ message: "Time sheet is already approved" });
        }


        const approvedSheet = await TimeSheetApproved.create({
            forUser,
            startDate,
            endDate,
            timeSheet,
            appliedOn,
            approvedBy: user.id,
            timeSheetId,
        });

        await TimeSheet.updateOne({ id: timeSheetId }, { status: 3 });

        return res.status(201).json({ message: "Time sheet approved successfully", timeSheet: approvedSheet });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }

};

export const getApprovedTimeSheets = async (req, res) => {
    const user = req.user;
    const userRole = user.role.toLowerCase();
    if (userRole !== "pm" && userRole !== "sd") {
        return res.status(403).json({ message: "You are not authorized for this action" });
    }
    const whereClause = {};
    let forEmployees;
    forEmployees = await Employee.find({ managerId: user.id }, { id: 1, displayName: 1, _id: 0 });
    const employeeIds = forEmployees.map(emp => emp.id);
    whereClause.forUser = { $in: employeeIds };

    const timeSheets = await TimeSheetApproved.find(
        whereClause,
        { id: 1, forUser: 1, startDate: 1, endDate: 1, appliedOn: 1, timeSheet: 1, timeSheetId: 1, status: 1, _id: 0 }
    ).sort({ startDate: -1 });

    const formattedTimeSheets = timeSheets.map(ts => {
        const employee = forEmployees.find(emp => emp.id === ts.forUser);
        return {
            ...ts.toObject(),
            employeeName: employee ? employee.displayName : "Unknown"
        };
    });

    return res.status(200).json({ message: "Approved sheets fetched successfully", timeSheets: formattedTimeSheets });

};

export const revokeTimeSheet = async (req, res) => {
    const user = req.user;
    const userRole = user.role.toLowerCase();
    if (userRole !== "pm" && userRole !== "sd") {
        return res.status(403).json({ message: "You are not authorized for this action" });
    }
    const { timeSheetId } = req.body;
    try {
        await TimeSheetApproved.deleteOne({ timeSheetId });
        await TimeSheet.updateOne({ id: timeSheetId }, { status: 2 });
        return res.status(200).json({ message: "Timesheet revoked successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}