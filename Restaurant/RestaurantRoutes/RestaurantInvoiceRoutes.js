const express = require('express');
const router = express.Router();

const {
  createInvoiceFromGRN,
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicesByPO,
  updateInvoice,
  deleteInvoice
} = require('../RestaurantController/RestaurantInvoiceController');

// Invoice routes
router.post('/create-from-grn', createInvoiceFromGRN);
router.post('/create', createInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.get('/po/:poId', getInvoicesByPO);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
