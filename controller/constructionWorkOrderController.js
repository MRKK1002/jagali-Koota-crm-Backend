const WorkOrder = require('../model/ConstructionWorkOrder');

exports.getWorkOrders = async (req, res, next) => {
  try {
    const workOrders = await WorkOrder.find().populate('projectId', 'projectName');
    res.status(200).json(workOrders);
  } catch (error) {
    next(error);
  }
};

exports.createWorkOrder = async (req, res, next) => {
  try {
    const {
      taskName,
      taskType,
      projectId,
      assignedTo,
      dueDate,
      estimatedHours,
      quantity,
      unit,
      rate,
      priority,
      description,
      notes,
      materials,
      location,
    } = req.body;

    if (!taskName || !taskType || !projectId || !assignedTo || !dueDate || !estimatedHours || !quantity || !unit || !rate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const workOrder = new WorkOrder({
      taskName,
      taskType,
      projectId,
      assignedTo,
      dueDate,
      estimatedHours,
      quantity,
      unit,
      rate,
      priority,
      description,
      notes,
      materials,
      location,
    });

    await workOrder.save();
    res.status(201).json(workOrder);
  } catch (error) {
    next(error);
  }
};

exports.updateWorkOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'in-progress', 'completed', 'billed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    workOrder.status = status;
    if (status === 'completed') {
      workOrder.completedDate = new Date();
    }
    await workOrder.save();

    res.status(200).json(workOrder);
  } catch (error) {
    next(error);
  }
};

exports.getWorkOrderStats = async (req, res, next) => {
  try {
    const workOrders = await WorkOrder.find();
    const byStatus = {
      pending: { totalHours: 0 },
      'in-progress': { totalHours: 0 },
      completed: { totalHours: 0 },
      billed: { totalHours: 0 },
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let completedThisWeek = 0;

    workOrders.forEach((wo) => {
      byStatus[wo.status].totalHours += wo.estimatedHours || 0;
      if (wo.status === 'completed' && new Date(wo.completedDate) >= oneWeekAgo) {
        completedThisWeek += 1;
      }
    });

    res.status(200).json({
      byStatus,
      completedThisWeek,
    });
  } catch (error) {
    next(error);
  }
};

exports.markWorkOrderAsBilled = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    workOrder.status = 'billed';
    await workOrder.save();

    res.status(200).json(workOrder);
  } catch (error) {
    next(error);
  }
};