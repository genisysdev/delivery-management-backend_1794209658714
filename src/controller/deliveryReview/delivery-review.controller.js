import DeliveryAssignment from '../../models/delivery-assignment.model.js';
import DeliveryReview from '../../models/delivery-review.model.js';
import DeliveryTemplate from '../../models/delivery-template.model.js';

function formatResponse(reviewDetails, deliveryTemplate) {
  const sections = deliveryTemplate.sections;

  for (const sectionKey in sections) {
    const checklist = sections[sectionKey].checklist;

    sections[sectionKey].ragStatus =
      reviewDetails?.[sectionKey]?.ragStatus ?? 0;

    for (const itemKey in checklist) {
      const isChecked =
        reviewDetails?.[sectionKey]?.checklist?.[itemKey] ?? false;
      checklist[itemKey].isChecked = isChecked;
    }
  }
  return { sections };
}

const validateDeliveryAssignment = async (templateId, payloadSections) => {
  const deliveryTemplate = await DeliveryTemplate.findOne({ id: templateId });
  if (!deliveryTemplate) {
    throw new Error('Delivery template not found');
  }

  const templateSections = deliveryTemplate.sections;
  const templateSectionIds = Object.keys(templateSections);
  const payloadSectionIds = Object.keys(payloadSections);

  const missingSections = templateSectionIds.filter(id => !payloadSectionIds.includes(id));
  const extraSections = payloadSectionIds.filter(id => !templateSectionIds.includes(id));

  if (missingSections.length > 0 || extraSections.length > 0) {
    const missing = missingSections
      .map(id => `'${id}' (${templateSections[id]?.name || 'unknown'})`)
      .join(', ');
    const extra = extraSections.map(id => `'${id}'`).join(', ');

    let errorMsg = 'Section mismatch:';
    if (missingSections.length > 0) errorMsg += ` missing section(s): ${missing}`;
    if (extraSections.length > 0) errorMsg += ` | unexpected section(s): ${extra}`;

    throw new Error(errorMsg);
  }

  
  for (const sectionId of templateSectionIds) {
    const templateChecklist = templateSections[sectionId].checklist || {};
    const payloadChecklist = payloadSections[sectionId]?.checklist || {};

    const templateChecklistIds = Object.keys(templateChecklist);
    const payloadChecklistIds = Object.keys(payloadChecklist);

    const missingChecklist = templateChecklistIds.filter(id => !payloadChecklistIds.includes(id));
    const extraChecklist = payloadChecklistIds.filter(id => !templateChecklistIds.includes(id));

    if (missingChecklist.length > 0 || extraChecklist.length > 0) {
      const sectionName = templateSections[sectionId]?.name || 'unknown';

      const missing = missingChecklist
        .map(id => `'${id}' (${templateChecklist[id]?.description || 'no description'})`)
        .join(', ');
      const extra = extraChecklist.map(id => `'${id}'`).join(', ');

      let errorMsg = `Checklist mismatch in section '${sectionId}' (${sectionName}):`;
      if (missingChecklist.length > 0) errorMsg += ` missing checklist item(s): ${missing}`;
      if (extraChecklist.length > 0) errorMsg += ` | unexpected checklist item(s): ${extra}`;

      throw new Error(errorMsg);
    }
  }

  return true;
};

export const getDeliveryReview = async (req, res) => {
  try {
    const { deliveryAssignmentId } = req.params;

    const deliveryAssignment = await DeliveryAssignment.findOne(
      { id: deliveryAssignmentId, isDeleted: false },
      { deliveryTemplateId: 1, _id: 0 }
    );
    if (!deliveryAssignment) {
      return res.status(404).json({ message: 'Delivery assignment not found' });
    }

    const deliveryTemplate = await DeliveryTemplate.findOne(
      { id: deliveryAssignment.deliveryTemplateId },
      { sections: 1, _id: 0 }
    );

    const deliveryReview = await DeliveryReview.findOne(
      { forDeliveryAssignment: deliveryAssignmentId },
      { reviewDetails: 1, _id: 0 } 
    );

    const response = formatResponse(
      deliveryReview?.reviewDetails,
      deliveryTemplate
    );

    res.status(200).json({
      message: 'Delivery review fetched successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error fetching delivery review:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createDeliveryReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deliveryAssignmentId, sections } = req.body;

    const deliveryAssignment = await DeliveryAssignment.findOne(
      { id: deliveryAssignmentId, isDeleted: false },
      { deliveryTemplateId: 1, _id: 0 }
    );
    if (!deliveryAssignment) {
      return res.status(404).json({ message: 'Delivery assignment not found' });
    }

    await validateDeliveryAssignment(
      deliveryAssignment.deliveryTemplateId,
      sections
    );

    const deliveryReviewExists = await DeliveryReview.findOne({
      forDeliveryAssignment: deliveryAssignmentId,
    });

    if (deliveryReviewExists) {
      return res
        .status(409)
        .json({
          message: 'Delivery review already exists for this assignment',
        });
    }

    const newDeliveryReview = new DeliveryReview({
      forDeliveryAssignment: deliveryAssignmentId,
      reviewDetails: sections,
      reviewedBy: userId,
    });

    const savedDeliveryReview = await newDeliveryReview.save();
    if (!savedDeliveryReview) {
      return res
        .status(500)
        .json({ message: 'Failed to create delivery review' });
    }

    res.status(201).json({
      message: 'Delivery review created successfully',
      data: savedDeliveryReview,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || 'Internal server error' });
  }
};