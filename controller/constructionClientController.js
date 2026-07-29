const Client = require('../model/ConstructionClient');

exports.getClients = async (req, res, next) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    next(error);
  }
};

exports.createClient = async (req, res, next) => {
  try {
    const { clientName, contactEmail, contactPhone, address } = req.body;
    if (!clientName || !contactEmail) {
      return res.status(400).json({ message: 'Client name and email are required' });
    }
    const client = new Client({ clientName, contactEmail, contactPhone, address });
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};