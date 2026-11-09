import ProjectAssignmentModel from '../models/project-assignment.model.js';

export const canCreateAssignment = async ({ prjCode, genisysId, startDate }) => {
    const latestAssignment = await ProjectAssignmentModel.findOne({
        prjCode,
        genisysId,
        isDeleted: false,
    }).sort({ endDate: -1 });

    if (!latestAssignment) {
        return true;
    }

    const latestEndDate = new Date(latestAssignment.endDate);
    const newStartDate = new Date(startDate);

    // New assignment's start date should be strictly after latest end date
    return newStartDate > latestEndDate;
};
