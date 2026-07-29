// const Project = require('../model/construction/Project');
// const Client = require('../model/construction/Client');

// exports.getAllProjects = async (req, res) => {
//   try {
//     const projects = await Project.find().populate('clientId').sort({ createdAt: -1 });
//     res.json(projects);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.getProjectById = async (req, res) => {
//   try {
//     const project = await Project.findById(req.params.id).populate('clientId');
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }
//     res.json(project);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// exports.createProject = async (req, res) => {
//   try {
//     const project = new Project(req.body);
//     const savedProject = await project.save();
//     await savedProject.populate('clientId');
//     res.status(201).json(savedProject);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// exports.updateProject = async (req, res) => {
//   try {
//     const project = await Project.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     ).populate('clientId');
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }
//     res.json(project);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// exports.deleteProject = async (req, res) => {
//   try {
//     const project = await Project.findByIdAndDelete(req.params.id);
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }
//     res.json({ message: 'Project deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const Project = require("../model/construction/Project");

exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("clientId")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate("clientId");
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const project = new Project(req.body);
    const savedProject = await project.save();
    res.status(201).json({ success: true, data: savedProject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
