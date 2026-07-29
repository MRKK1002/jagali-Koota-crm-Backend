const Project = require('../model/ConstructionProject');

exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().populate('clientId', 'clientName');
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('clientId', 'clientName');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const { projectName, clientId, location, budget } = req.body;
    if (!projectName || !clientId) {
      return res.status(400).json({ message: 'Project name and client ID are required' });
    }
    const project = new Project({ projectName, clientId, location, budget });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};