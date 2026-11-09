import Employee from "../../models/employee.model.js";
import { prjStatusEnum } from "../../constants/enum.js";
import Project from "../../models/project.model.js";
import ProjectAssignment from "../../models/project-assignment.model.js";

const getUserDetailsByEmail = async (email) => {
    try {
        const userDetails = await Employee.findOne({ emailId: email }, { _id: 0, id: 1, managerId: 1, genisysId: 1 }, { isDeleted: false });
        return userDetails;
    } catch (error) {
        console.log(error);
        return null;
    }
}
const getUserDetailsById = async (id) => {
    try {
        const userDetails = await Employee.findOne({ id }, { _id: 0, id: 1, managerId: 1, genisysId: 1 }, { isDeleted: false });
        return userDetails;
    } catch (error) {
        console.log(error);
        return null;
    }
}

const getProjectForUser = async (genisysId, managerId = null) => {

    const assignments = await ProjectAssignment.find({
        genisysId: genisysId,
        isDeleted: false,
    });

    const assignmentProjectCodes = assignments.map(a => a.prjCode);

    const assignmentProjectDetails = await Project.find({
        prjCode: { $in: assignmentProjectCodes },
        isDeleted: false,
    });

    const assignmentProjects = assignmentProjectDetails.map(prj => ({
        id: prj.prjCode,
        name: prj.prjName,
        prjType: prj.prjType,
    }));

    let managerProjects = [];

    if (managerId) {
        const pmProjects = await Project.find({
            prjMgrId: managerId,
            isDeleted: false,
            prjStatus: prjStatusEnum.Started,
        });
        managerProjects = pmProjects.map(prj => ({
            id: prj.prjCode,
            name: prj.prjName,
            prjType: prj.prjType,
        }));
    }

    const allProjectsMap = new Map();

    [...assignmentProjects, ...managerProjects].forEach(project => {
        if (!allProjectsMap.has(project.id)) {
            allProjectsMap.set(project.id, project);
        }
    });

    const finalResult = Array.from(allProjectsMap.values());

    return finalResult;
};


export const getPersonalProjects = async (req, res) => {

    const { forUser = null, filterType = null } = req.query;
    if (forUser) {
        const userDetails = await getUserDetailsById(forUser);
        const projects = await getProjectForUser(userDetails.genisysId);
        return res.status(200).json({ message: "Projects fetched successfully", projects })
    }
    if (filterType && filterType === "all") {
        const assignments = await ProjectAssignment.find({
            isDeleted: false
        }, { prjCode: 1, prjName: 1, _id: 0 });
        const projectMap = new Map();
        assignments.forEach(ass => {
            if (!projectMap.has(ass.prjCode)) {
                projectMap.set(ass.prjCode, ass.prjName);
            }
        });
        const projects = Array.from(projectMap.entries()).map(([id, name]) => ({ id, name }));
        return res.status(200).json({ message: "Projects fetched successfully", projects })
    }

    const email = req.user.email;
    const userType = req.user.role.toLowerCase();
    if (userType !== "pm" && userType !== "default") {
        return res.status(403).json({ message: "Access forbidden" });
    }

    try {
        const userDetails = await getUserDetailsByEmail(email);
        if (!userDetails) {
            return res.status(404).json({ message: "User not found" });
        }

        const projects = userType == "pm" ? await getProjectForUser(userDetails.genisysId, userDetails.id) : await getProjectForUser(userDetails.genisysId);

        return res.status(200).json({ message: "Projects fetched successfully", projects })
    } catch (error) {
        console.error("Something broke : ", error);
        return res.status(500).json({ message: "Internal Server Error" })
    }

};