const Role = require('../model/resRoleModel');
const asyncHandler = require('express-async-handler');

const getAllRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find();
  res.status(200).json(roles);
});

const createRole = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Role name is required');
  }

  const role = await Role.create({
    name: name.trim()
  });

  res.status(201).json(role);
});

const updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    res.status(404);
    throw new Error('Role not found');
  }

  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Role name is required');
  }

  const updatedRole = await Role.findByIdAndUpdate(
    req.params.id,
    { name: name.trim() },
    { new: true }
  );

  res.status(200).json(updatedRole);
});

const deleteRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    res.status(404);
    throw new Error('Role not found');
  }

  await Role.findByIdAndDelete(req.params.id);
  res.status(200).json({ id: req.params.id });
});

module.exports = {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole
};
