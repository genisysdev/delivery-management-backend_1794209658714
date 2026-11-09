import DeliveryTemplate from "../../models/delivery-template.model.js"
import DeliveryAssignment from "../../models/delivery-assignment.model.js";

const validateSections = (sections) => {
  for (const [sectionKey, sectionValue] of Object.entries(sections)) {
    if (!sectionValue.hasOwnProperty('checklist')) {
      return `Section '${sectionKey}' must contain a 'checklist' key.`;
    }

    const checklist = sectionValue.checklist;

    for (const [itemId, item] of Object.entries(checklist)) {
      const keys = Object.keys(item);
      if (
        !keys.includes('description') ||
        !keys.includes('matrix') ||
        keys.length !== 2
      ) {
        return `Checklist item '${itemId}' in section '${sectionKey}' must have exactly 'description' and 'matrix' keys.`;
      }
    }
  }

  return null;
};

export const createDeliveryTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, sections } = req.body;
    if (!name || !sections) {
      return res.status(400).json({ message: "Delivery Template Name and Sections are required" });
    }

    const validationError = validateSections(sections);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const newDeliveryTemplate = new DeliveryTemplate({
      name: name,
      createdBy: userId,
      sections
    });

    await newDeliveryTemplate.save();
    res.status(201).json(newDeliveryTemplate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDeliveryTemplates = async (req, res) => {
    try {
        const deliveryTemplates = await DeliveryTemplate.find({isDeleted:false}, { id: 1, name: 1, _id: 0 });
        res.status(200).json(deliveryTemplates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getDeliveryTemplateById = async (req, res) => {
    try {
        const { deliveryTemplateId } = req.params;
        const deliveryTemplate = await DeliveryTemplate.findOne({ id: deliveryTemplateId });
        if (!deliveryTemplate) {
            return res.status(404).json({ message: "Delivery Template not found" });
        }
        res.status(200).json(deliveryTemplate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const updateDeliveryTemplate = async (req, res) => {
    try {
        const { deliveryTemplateId } = req.params;
        const { deliveryTemplateName, sections } = req.body;

        if (!deliveryTemplateName || !sections) {
            return res.status(400).json({ message: "Delivery Template Name and Sections are required" });
        }
        const validationError = validateSections(sections);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
         const updatedDeliveryTemplate = await DeliveryTemplate.findOneAndUpdate(
            { id: deliveryTemplateId }, 
            { name: deliveryTemplateName, sections }, 
            { new: true } 
        );

        if (!updatedDeliveryTemplate) {
            return res.status(404).json({ message: "Delivery Template not found" });
        }

        res.status(200).json(updatedDeliveryTemplate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deleteDeliveryTemplate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { deliveryTemplateId } = req.body;
        const deliveryTemplate = await DeliveryTemplate.findOne({ id: deliveryTemplateId });
        if (!deliveryTemplate) {
            return res.status(404).json({ message: "Delivery Template not found" });
        }

        if(userId !== deliveryTemplate.createdBy) {
            return res.status(403).json({ message: "You are not authorized to delete this Delivery Template" });
        }

        const deliveryTemplateUsed = await DeliveryAssignment.find({deliveryTemplateId: deliveryTemplateId, isDeleted: false});
        if (deliveryTemplateUsed.length > 0) {
            return res.status(400).json({ message: "Delivery Template is in use and cannot be deleted" });
        }
        const deletedDeliveryTemplate = await DeliveryTemplate.findOneAndUpdate({ id: deliveryTemplateId }, { isDeleted: true }, { new: true });

        if (!deletedDeliveryTemplate) {
            return res.status(404).json({ message: "Delivery Template not found" });
        }

        res.status(200).json({ message: "Delivery Template deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}