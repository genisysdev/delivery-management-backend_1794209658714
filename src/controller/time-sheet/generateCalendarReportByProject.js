import timeSheetApproved from "../../models/time-sheet-approved.model.js";
import Employee from "../../models/employee.model.js";
import ProjectAssignments from "../../models/project-assignment.model.js";
import { prjRoleEnumReverse } from "./time-sheet.controller.js";


const formatDateKey = (date) => {
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export const generateCalendarReportByProjects = async (
    projectIds = [],
    fromDate,
    toDate,
    filterType = "all"
) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);


    const timesheets = await timeSheetApproved
        .find({
            startDate: { $lte: to },
            endDate: { $gte: from },
            $or: [
                { "timeSheet.logs.projectId": { $in: projectIds } },
                { "timeSheet.ot.projectId": { $in: projectIds } },
            ],
        })
        .lean();

    if (!timesheets.length)
        return { projectNames: [], columns: [], data: [] };


    const dateColumns = [];
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
        dateColumns.push(formatDateKey(d));
    }


    const reportMap = {};

    for (const ts of timesheets) {
        const userId = ts.forUser;
        if (!reportMap[userId]) reportMap[userId] = {};

        const start = new Date(ts.startDate);
        start.setUTCHours(0, 0, 0, 0);

        const processEntries = (entries, type) => {
            for (const entry of entries || []) {
                const pid = entry.projectId;
                if (!projectIds.includes(pid)) continue;

                const dayMap = entry.day || {};
                for (const [dayKey, taskMap] of Object.entries(dayMap)) {
                    const offset = parseInt(dayKey) - 1;
                    const currentDate = new Date(start);
                    currentDate.setUTCDate(start.getUTCDate() + offset);
                    if (currentDate < from || currentDate > to) continue;

                    const dateKey = formatDateKey(currentDate);
                    for (const task of Object.values(taskMap)) {
                        const hours = Number(task.hours || 0);
                        const billable = !!task.billable;

                        const taskType =
                            type === "ot"
                                ? billable
                                    ? "ot-billed"
                                    : "ot-unbilled"
                                : billable
                                    ? "billed"
                                    : "unbilled";

                        if (filterType === "billed" && !billable) continue;
                        if (filterType === "unbilled" && billable) continue;

                        reportMap[userId][pid] = reportMap[userId][pid] || {};
                        reportMap[userId][pid][taskType] =
                            reportMap[userId][pid][taskType] || {};

                        reportMap[userId][pid][taskType][dateKey] =
                            (reportMap[userId][pid][taskType][dateKey] || 0) + hours;
                    }
                }
            }
        };

        processEntries(ts.timeSheet.logs, "log");
        processEntries(ts.timeSheet.ot, "ot");
    }


    const empIds = Object.keys(reportMap);
    const employees = await Employee.find({
        id: { $in: empIds },
        isDeleted: false,
    }).lean();
    const empMap = {};
    for (const e of employees) {
        empMap[e.id] = { genisysId: e.genisysId, name: e.displayName };
    }

    const assignments = await ProjectAssignments.find({
        prjCode: { $in: projectIds },
        genisysId: { $in: employees.map((e) => e.genisysId) },
        isDeleted: false,
    }).lean();

    const assignmentMap = {};
    for (const a of assignments) {
        assignmentMap[a.genisysId + a.prjCode] = {
            name: a.displayName,
            role: prjRoleEnumReverse[a.prjRole] || a.prjRole,
        };
    }


    const projectAssignments = await ProjectAssignments.find({
        prjCode: { $in: projectIds },
        isDeleted: false,
    }).lean();

    const projectMap = {};
    for (const p of projectAssignments) {
        projectMap[p.prjCode] = p.prjName || p.prjCode;
    }


    const rows = [];
    for (const [userId, projects] of Object.entries(reportMap)) {
        const emp = empMap[userId] || {};
        for (const [pid, taskTypes] of Object.entries(projects)) {
            const assn = assignmentMap[emp.genisysId + pid] || {};
            const base = {
                genisysId: emp.genisysId || "",
                name: assn.name || emp.name || "",
                role: assn.role || "",
                projectId: pid,
                projectName: projectMap[pid] || pid,
            };

            for (const [taskType, dates] of Object.entries(taskTypes)) {
                const row = { ...base, taskType };
                let total = 0;
                for (const dateCol of dateColumns) {
                    const val = dates[dateCol] || 0;
                    row[dateCol] = val;
                    total += val;
                }
                row.overall = total;
                rows.push(row);
            }
        }
    }


    rows.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
        if (a.projectName < b.projectName) return -1;
        if (a.projectName > b.projectName) return 1;
        return a.taskType.localeCompare(b.taskType);
    });

    const columns = ["Genisys ID", "Name", "Role", "Project Id", "Project", "Type", ...dateColumns, "Overall"];
    const projectNames = projectIds.map((p) => projectMap[p] || p);

    return { projectNames, columns, data: rows };
};
