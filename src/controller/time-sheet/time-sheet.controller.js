import { prjRoleEnum } from "../../constants/project-allocation-status-enum.js";
import Employee from "../../models/employee.model.js";
import TimeSheet from "../../models/time-sheet.model.js";
import ExcelJS from "exceljs";
import { generateCalendarReportByProjects } from "./generateCalendarReportByProject.js";

export function validateTimeSheetInput(timeSheet) {
    const errors = [];

    if (!timeSheet || typeof timeSheet !== "object") {
        return { valid: false, errors: ["Invalid timesheet data structure"] };
    }

    const { logs = [], leave = [], ot = [] } = timeSheet;

    for (const lv of leave) {
        if (!lv.type || typeof lv.type !== "string" || lv.type.trim() === "") {
            errors.push("Each leave entry must have a non-empty type");
            continue;
        }
        const days = Object.keys(lv).filter(k => ["1", "2", "3", "4", "5", "6", "7"].includes(k));
        if (days.length !== 7) {
            errors.push(`Leave type ${lv.type} must have exactly 7 day entries (1–7)`);
        }
    }

    for (const log of logs) {
        if (!log.projectId) {
            errors.push("Each log entry must have a projectId");
            continue;
        }
        if (!log.day) {
            errors.push(`Project ${log.projectId} has no day entries`);
            continue;
        }

        const dayKeys = Object.keys(log.day);
        if (dayKeys.length !== 7 || ![1, 2, 3, 4, 5, 6, 7].every(d => dayKeys.includes(d.toString()))) {
            errors.push(`Project ${log.projectId} must have exactly 7 day entries (1–7)`);
        }

        for (let d = 1; d <= 7; d++) {
            const dayEntry = log.day[d];
            if (!dayEntry) {
                errors.push(`Project ${log.projectId} missing entry for day ${d}`);
                continue;
            }

            const slots = Object.keys(dayEntry);

            if ("billable" in dayEntry && "hours" in dayEntry) {
                if (!(dayEntry.billable === false && dayEntry.hours === "0")) {
                    errors.push(`Project ${log.projectId} day ${d} must either contain task slots or { billable:false, hours:"0" }`);
                }
                continue;
            }

            for (const slot of slots) {
                const task = dayEntry[slot];
                if (!task || typeof task !== "object" || !("billable" in task) || !("hours" in task)) {
                    errors.push(`Project ${log.projectId} day ${d} slot ${slot} missing billable/hours`);
                    continue;
                }
            }
        }
    }

    const leaveByDay = {};
    const dayTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    let weeklyTotal = 0;

    for (const lv of leave) {
        let zeroHoursCount = 0;
        for (let day = 1; day <= 7; day++) {
            const hours = lv[day] || 0;
            if ((day === 6 || day === 7) && hours > 0) {
                errors.push(`Leave type ${lv.type} is not allowed on weekends (day ${day})`);
            }
            if (hours >= 0) {
                if (hours === 0) { zeroHoursCount += 1; }
                if (hours !== 4 && hours !== 8 && hours !== 0) {
                    errors.push(`Leave type ${lv.type} has invalid hours (${hours}) on day ${day}`);
                }
                if (!leaveByDay[day]) leaveByDay[day] = [];
                if (hours != 0) {
                    leaveByDay[day].push({ type: lv.type, hours });
                }
                dayTotals[day] += hours;
            }
        }
        if (zeroHoursCount === 7) {
            errors.push(`Leave type ${lv.type} has zero hours for all weekdays`);
        }
    }

    for (const [day, leaves] of Object.entries(leaveByDay)) {
        if (leaves.length > 1) {
            errors.push(`Multiple leave types applied on day ${day}`);
        }
    }

    for (const log of logs) {
        for (let day = 1; day <= 7; day++) {
            const entry = log.day[day];
            if (!entry) continue;

            if ("billable" in entry && "hours" in entry) {
                const hours = Number(entry.hours);
                if (isNaN(hours) || hours < 0) {
                    errors.push(`Invalid hours for project ${log.projectId} on day ${day}`);
                }
                dayTotals[day] += hours;
            } else {
                for (const slot of Object.keys(entry)) {
                    const task = entry[slot];
                    const hours = Number(task.hours);
                    if (isNaN(hours) || hours < 0) {
                        errors.push(`Invalid hours for project ${log.projectId} on day ${day} slot ${slot}`);
                    }
                    dayTotals[day] += hours;
                }
            }
        }
    }

    const validateEntries = (entries, label) => {
        for (const log of entries) {
            const { projectId, day } = log;

            if (typeof projectId !== "string" || projectId.trim() === "") {
                errors.push(`Each ${label} entry must have a non-empty projectId`);
                continue;
            }

            if (!day || typeof day !== "object") {
                errors.push(`Missing or invalid day entries for project ${projectId} in ${label}`);
                continue;
            }

            let hasValidTaskType = false;

            for (let d = 1; d <= 7; d++) {
                const entry = day[d];
                if (!entry || typeof entry !== "object") continue;


                const taskTypes = Object.keys(entry).filter(
                    t => typeof t === "string" && t.trim() !== ""
                );

                if (taskTypes.length > 0) {
                    hasValidTaskType = true;
                    break;
                }
            }


            if (!hasValidTaskType) {
                errors.push(`Project ${projectId} in ${label} does not have any valid task type`);
            }
        }
    };

    validateEntries(logs, "log");

    if (Array.isArray(ot) && ot.length > 0) {
        validateEntries(ot, "ot");
    }

    for (let day = 1; day <= 7; day++) {
        const totalHours = dayTotals[day];
        const leaveEntry = leaveByDay[day]?.[0];

        if (leaveEntry) {
            if (leaveEntry.hours === 8) {
                if (totalHours !== 8) {
                    const projectsWithHours = [];
                    for (const log of logs) {
                        const entry = log.day[day];
                        if (!entry) continue;

                        let projectHours = 0;
                        if ("billable" in entry && "hours" in entry) {
                            projectHours += Number(entry.hours) || 0;
                        } else {
                            for (const slot of Object.keys(entry)) {
                                projectHours += Number(entry[slot].hours) || 0;
                            }
                        }

                        if (projectHours > 0) {
                            projectsWithHours.push(log.projectId);
                        }
                    }

                    if (projectsWithHours.length > 0) {
                        errors.push(
                            `Full day leave on day ${day}, work hours logged as well for projects ${projectsWithHours.join(", ")}`
                        );
                    }
                }
            }

            if (leaveEntry.hours === 4) {
                if (totalHours <= 4) {
                    errors.push(`Half day leave on day ${day}, but no work hours logged`);
                }
            }
        } else {
            if (day <= 5 && totalHours <= 0) {
                errors.push(`Day ${day} (weekday) has no leave, working hours must be greater than 0`);
            }
        }

        weeklyTotal += totalHours;
    }

    const weekdayTotal = [1, 2, 3, 4, 5].reduce((sum, d) => sum + dayTotals[d], 0);
    if (weekdayTotal < 40) {
        errors.push(`Total weekday hours (Mon–Fri, including leave) must be at least 40, found ${weekdayTotal}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
export function validateProjectsAndTasks(timeSheet) {
    const errors = [];

    if (!timeSheet || typeof timeSheet !== "object") {
        return { valid: false, errors: ["Invalid timesheet data structure"] };
    }

    const { logs = [], ot = [], leave = [] } = timeSheet;

    for (const lv of leave) {
        if (!lv.type || typeof lv.type !== "string" || lv.type.trim() === "") {
            errors.push("Each leave entry must have a non-empty type");
            continue;
        }
        const days = Object.keys(lv).filter(k => ["1", "2", "3", "4", "5", "6", "7"].includes(k));
        if (days.length !== 7) {
            errors.push(`Leave type ${lv.type} must have exactly 7 day entries (1–7)`);
        }
    }

    const validateEntries = (entries, label) => {
        for (const log of entries) {
            const { projectId, day } = log;

            if (typeof projectId !== "string" || projectId.trim() === "") {
                errors.push(`Each ${label} entry must have a non-empty projectId`);
                continue;
            }

            if (!day || typeof day !== "object") {
                errors.push(`Missing or invalid day entries for project ${projectId} in ${label}`);
                continue;
            }

            let hasValidTaskType = false;

            for (let d = 1; d <= 7; d++) {
                const entry = day[d];
                if (!entry || typeof entry !== "object") continue;


                const taskTypes = Object.keys(entry).filter(
                    t => typeof t === "string" && t.trim() !== ""
                );

                if (taskTypes.length > 0) {
                    hasValidTaskType = true;
                    break;
                }
            }


            if (!hasValidTaskType) {
                errors.push(`Project ${projectId} in ${label} does not have any valid task type`);
            }
        }
    };

    validateEntries(logs, "log");

    if (Array.isArray(ot) && ot.length > 0) {
        validateEntries(ot, "ot");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}


export const createTimeSheet = async (req, res) => {
    const user = req.user;
    const { startDate, endDate, timeSheet, isDraft = null } = req.body;

    const timeSheetStatus = isDraft ? 1 : 2;
    const validationResult = isDraft ? validateProjectsAndTasks(timeSheet) : validateTimeSheetInput(timeSheet);

    if (!validationResult.valid) {
        return res.status(400).json({ message: "Invalid time sheet data", errors: validationResult.errors });
    }

    try {

        const existing = await TimeSheet.findOne({
            forUser: user.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        });

        if (existing) {
            return res.status(409).json({ message: "Time sheet for this date range already exists" });
        }


        const newTimeSheet = await TimeSheet.create({
            forUser: user.id,
            startDate,
            endDate,
            timeSheet,
            status: timeSheetStatus
        });

        return res.status(201).json({ message: "Time sheet saved successfully", timeSheet: newTimeSheet });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getTimeSheets = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { startDate, endDate, prevStartDate, prevEndDate } = req.query;
        if (!startDate || !endDate) return res.status(400).json({ message: "startDate and endDate are required" });
        const buildQuery = (start, end) => ({
            forUser: userId,
            startDate: { $gte: new Date(start) },
            endDate: { $lte: new Date(new Date(end).setHours(23, 59, 59, 999)) }
        });
        const projection = { _id: 0, createdAt: 0, updatedAt: 0, forUser: 0, __v: 0 };
        const queries = [TimeSheet.find(buildQuery(startDate, endDate), projection).sort({ startDate: -1 })];
        if (prevStartDate && prevEndDate) queries.push(TimeSheet.find(buildQuery(prevStartDate, prevEndDate), projection).sort({ startDate: -1 }));
        const [timeSheets, prevTimeSheets = []] = await Promise.all(queries);
        return res.status(200).json({ timeSheets, prevTimeSheets });
    } catch (error) {
        console.error("Error fetching timesheets:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updateTimeSheet = async (req, res) => {
    const {
        timeSheetId,
        timeSheet = null,
        isDraft = null,
        isSubmit = null,
        isApproving = null,
        isRejecting = null,
        rejectComment = null
    } = req.body;


    if (!timeSheetId) {
        return res.status(400).json({ message: "Time sheet ID is required" });
    }


    const actions = [isDraft, isSubmit, isApproving, isRejecting].filter(Boolean);
    if (actions.length !== 1) {
        return res.status(400).json({ message: "Only one action is allowed per request (draft, submit, approve, reject)" });
    }

    try {
        const timeSheetRecord = await TimeSheet.findOne({ id: timeSheetId });
        if (!timeSheetRecord) {
            return res.status(404).json({ message: "Invalid time sheet ID" });
        }


        if (timeSheet) {
            if (!isDraft && !isSubmit) {
                return res.status(400).json({ message: "Either isDraft or isSubmit must be true when timeSheet is provided" });
            }


            if (isDraft && timeSheetRecord.status === 4) {
                return res.status(400).json({ message: "Cannot save as draft after rejection" });
            }


            if (isSubmit) {
                const validationResult = validateTimeSheetInput(timeSheet);
                if (!validationResult.valid) {
                    return res.status(400).json({ message: "Invalid time sheet data", errors: validationResult.errors });
                }
            }
            if (isDraft) {
                const validationResult = validateProjectsAndTasks(timeSheet);
                if (!validationResult.valid) {
                    return res.status(400).json({ message: "Invalid time sheet data", errors: validationResult.errors });
                }
            }

            const updatedTimeSheet = await TimeSheet.findByIdAndUpdate(
                timeSheetRecord._id,
                {
                    timeSheet,
                    status: isDraft ? 1 : timeSheetRecord.status === 4 ? 5 : 2,
                    ...(isSubmit && { appliedOn: new Date() })
                },
                { new: true }
            );

            return res.status(200).json({
                message: isDraft ? "Time sheet saved as draft" : "Time sheet submitted successfully",
                timeSheet: updatedTimeSheet
            });
        }


        if (isApproving) {
            const updateData = {
                status: 3,
                approvedOrRejectedOn: new Date()
            };


            if (timeSheetRecord.rejectComment) {
                updateData.rejectComment = undefined;
            }

            if (isApproving) {
                const approvedBy = req.user?.id;
                if (!approvedBy) {
                    return res.status(401).json({ message: "Unauthorized: Approving user not identified" });
                }
                if (timeSheetRecord.forUser === approvedBy) {
                    return res.status(400).json({ message: "Action not allowed." })
                }
                const approvedTimeSheet = await TimeSheet.findByIdAndUpdate(
                    timeSheetRecord._id,
                    {
                        $set: {
                            status: 3,
                            approvedOrRejectedOn: new Date(),
                            approvedBy: approvedBy
                        },
                        $unset: {
                            rejectComment: ""
                        }
                    },
                    { new: true }
                );

                return res.status(200).json({
                    message: "Time sheet approved successfully",
                    timeSheet: approvedTimeSheet
                });
            }


            return res.status(200).json({
                message: "Time sheet approved successfully",
                timeSheet: approvedTimeSheet
            });
        }


        if (isRejecting) {
            if (!rejectComment) {
                return res.status(400).json({ message: "Reject comment is required when rejecting a time sheet" });
            }

            const rejectedTimeSheet = await TimeSheet.findByIdAndUpdate(
                timeSheetRecord._id,
                {
                    status: 4,
                    rejectComment,
                    approvedOrRejectedOn: new Date()
                },
                { new: true }
            );

            return res.status(200).json({
                message: "Time sheet rejected successfully",
                timeSheet: rejectedTimeSheet
            });
        }


        return res.status(400).json({ message: "Invalid request. No valid action matched." });

    } catch (error) {
        console.error("Error updating time sheet:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getSubmittedTimeSheets = async (req, res) => {
    const user = req.user;
    const { type } = req.params;
    const userRole = user.role.toLowerCase();
    if (type !== "pending" && type !== "approved" && type !== "rejected") {
        return res.status(400).json({ message: "Invalid type parameter" });
    }
    if (userRole !== "pm" && userRole !== "sd") {
        return res.status(403).json({ message: "You are not authorized for this action" });
    }
    const timeSheetStatus = type === "pending" ? [2, 5] : type === "approved" ? [3] : [4];

    try {
        const forEmployees = await Employee.find({ managerId: user.id }, { id: 1, displayName: 1, _id: 0 });

        const employeeIds = forEmployees.map(emp => emp.id);

        const timeSheets = await TimeSheet.find(
            {
                forUser: { $in: employeeIds },
                status: { $in: timeSheetStatus }
            },
            { id: 1, forUser: 1, startDate: 1, endDate: 1, appliedOn: 1, status: 1, timeSheet: 1, rejectComment: 1, _id: 0 }
        ).sort({ startDate: -1 });

        const formattedTimeSheets = timeSheets.map(ts => {
            const employee = forEmployees.find(emp => emp.id === ts.forUser);
            return {
                ...ts.toObject(),
                employeeName: employee ? employee.displayName : "Unknown"
            };
        });

        return res.status(200).json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} records fetched successfully`, timeSheets: formattedTimeSheets });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const getTimeSheetDetailsById = async (req, res) => {
    const { timeSheetId } = req.params;
    if (!timeSheetId) {
        return res.status(400).json({ message: "Time sheet ID is required" });
    }

    try {
        const timeSheet = await TimeSheet.findOne(
            { id: timeSheetId },
            { startDate: 1, endDate: 1, timeSheet: 1, status: 1, appliedOn: 1, id: 1, _id: 0 }
        ).lean();

        if (!timeSheet) {
            return res.status(404).json({ message: "Invalid time sheet ID" });
        }

        const projectIds = timeSheet.timeSheet?.logs?.map(log => log.projectId) || [];

        const projects = await Projects.find(
            { prjCode: { $in: projectIds } },
            { prjCode: 1, prjName: 1, _id: 0 }
        ).lean();

        const projectMap = projects.reduce((acc, p) => {
            acc[p.prjCode] = p.prjName;
            return acc;
        }, {});

        timeSheet.timeSheet.logs = timeSheet.timeSheet.logs.map(log => ({
            ...log,
            prjName: projectMap[log.projectId] || null
        }));

        return res.status(200).json({
            message: "Time sheet details fetched successfully",
            timeSheet
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" })
    }
};

export const prjRoleEnumReverse = Object.fromEntries(
    Object.entries(prjRoleEnum).map(([k, v]) => [v, k])
);

export const generateReport = async (req, res) => {
    const { projectIds, fromDate, toDate, filterType } = req.query;

    if (!projectIds || !Array.isArray(JSON.parse(projectIds)) || JSON.parse(projectIds).length === 0) {
        return res.status(400).json({ message: "Please provide projectIds as an array" });
    }

    const parsedProjectIds = JSON.parse(projectIds);


    const { projectNames, columns, data } = await generateCalendarReportByProjects(
        parsedProjectIds,
        fromDate,
        toDate,
        filterType
    );

    const workbook = new ExcelJS.Workbook();
    const sheetName = "Timesheet Report";
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((header) => ({
        key: header,
        width: header.length + 5,
    }));

    const headerRow = worksheet.addRow(columns);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    for (const row of data) {
        const rowData = [
            row.genisysId,
            row.name,
            row.role,
            row.projectId,
            row.projectName,
            row.taskType.replace(/^(.)(.*)$/, (_, a, b) => a.toUpperCase() + b.toLowerCase()),
            ...columns.slice(6, -1).map((col) => row[col] || 0),
            row.overall,
        ];
        worksheet.addRow(rowData);
    }

    worksheet.columns.forEach((col) => {
        let maxLength = 0;
        col.eachCell({ includeEmpty: true }, (cell) => {
            maxLength = Math.max(maxLength, cell.value ? cell.value.toString().length : 10);
        });
        col.width = maxLength + 2;
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const fileName = `TimeSheet_Report(${fromDate}-${toDate}).xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    await workbook.xlsx.write(res);
    return res.end();



};
