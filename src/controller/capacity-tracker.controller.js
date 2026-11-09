import CapacityModel from '../models/capacity.model.js';
import ProjectAssignmentModel from '../models/project-assignment.model.js';

export const getAllCapacity = async (req, res) => {
    try {
        const capacity = await CapacityModel.find({ isDeleted: false });
        res.status(200).json(capacity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCombinedCapacity = async (req, res) => {
    try {
        const { project, year, month } = req.query;

        const capacityFilter = { isDeleted: false };
        if (project) capacityFilter.project = project;
        if (month) capacityFilter.month = parseInt(month);
        if (year) capacityFilter.year = parseInt(year);

        const allocationFilter = { isDeleted: false };

        if (project) {
            allocationFilter.PrjName = project;
        }

        if (year) {
            allocationFilter.StartDate = {
                ...allocationFilter.StartDate,
                $gte: new Date(`${year}-01-01`),
                $lt: new Date(`${parseInt(year) + 1}-01-01`),
            };
        }

        if (month) {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);

            allocationFilter.StartDate = {
                ...allocationFilter.StartDate,
                $gte: startOfMonth,
                $lte: endOfMonth,
            };
        }

        const capacityData = await CapacityModel.find(capacityFilter);
        const allocationData = await ProjectAssignmentModel.find(allocationFilter);

        if ((!allocationData || allocationData.length === 0) && (!capacityData || capacityData.length === 0)) {
            return res.status(404).json({ message: 'No capacity records found for the given filters.' });
        }

        const mergedData = capacityData.map(capacityItem => {
            const matchingAllocationItem = allocationData.find(allocationItem => allocationItem.genisysId === capacityItem.genisysId);

            if (matchingAllocationItem) {
                return {
                    ...capacityItem,
                    project: matchingAllocationItem.prjName,
                };
            }
            return capacityItem;
        });

        allocationData.forEach(allocationItem => {
            if (!mergedData.some(item => item.genisysId === allocationItem.genisysId)) {
                if (allocationItem.genisysId) {
                    mergedData.push({
                        genisysId: allocationItem.genisysId,
                        employeeName: allocationItem.employeeName,
                        project: allocationItem.prjName,
                    });
                }
            }
        });

        res.status(200).json(mergedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const createCapacity = async (req, res) => {
    try {
        const genisysIdExists = await CapacityModel.findOne({ genisysId: req.body.genisysId, isDeleted: false });
        if (genisysIdExists) {
            return res.status(400).json({ message: `Capacity with genisysId ${req.body.genisysId} already exists.` });
        }
        const capacity = await CapacityModel.create(req.body);
        res.status(200).json(capacity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const updateCapacity = async (req, res) => {

    const { genisysId } = req.params;

    try {

        const capacity = await CapacityModel.findOneAndUpdate(
            { genisysId: genisysId, isDeleted: false }, // Query
            req.body, // Update data
            { new: true, runValidators: true } // Options
        );

        if (!capacity) {
            return res.status(404).json({ message: `capacity not found or deleted` });
        }

        res.status(200).json({
            message: 'capacity updated successfully',
            capacity,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deleteCapacity = async (req, res) => {
    try {
        const { genisysId } = req.params;
        if (!genisysId) {
            return res.status(400).json({ message: 'genisysId is required' });
        }

        const capacity = await CapacityModel.findOneAndDelete(
            { genisysId: genisysId, isDeleted: false },
            { isDeleted: true }
        );

        if (!capacity) {
            return res.status(404).json({ message: `capacity not found or already deleted` });
        }

        res.status(200).json({
            message: 'capacity deleted successfully',
            capacity,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}