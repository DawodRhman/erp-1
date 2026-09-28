import { sendSuccess } from '../../utils/respond.js';
import * as crmService from './crm.service.js';
import * as inventoryService from '../inventory/inventory.service.js';
import * as invoicingService from '../invoicing/invoicing.service.js';

export async function listCustomers(req, res, next) {
  try {
    const customers = await inventoryService.getCustomers();
    return sendSuccess(res, customers, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listProducts(req, res, next) {
  try {
    const products = await inventoryService.getProducts({
      search: req.query.search,
      limit: req.query.limit || 100,
    });
    return sendSuccess(res, products, 200);
  } catch (err) {
    return next(err);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = await inventoryService.createCustomer(req.body);
    return sendSuccess(res, customer, 201);
  } catch (err) {
    return next(err);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const customer = await inventoryService.updateCustomer(req.params.id, req.body);
    return sendSuccess(res, customer, 200);
  } catch (err) {
    return next(err);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const result = await inventoryService.deleteCustomer(req.params.id);
    return sendSuccess(res, result, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listLeads(req, res, next) {
  try {
    const leads = await crmService.listLeads(req.query);
    return sendSuccess(res, leads, 200);
  } catch (err) {
    return next(err);
  }
}

export async function createLead(req, res, next) {
  try {
    const lead = await crmService.createLead(req.body);
    return sendSuccess(res, lead, 201);
  } catch (err) {
    return next(err);
  }
}

export async function updateLead(req, res, next) {
  try {
    const lead = await crmService.updateLead(req.params.id, req.body);
    return sendSuccess(res, lead, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listQuotations(req, res, next) {
  try {
    const quotes = await crmService.listQuotations(req.query);
    return sendSuccess(res, quotes, 200);
  } catch (err) {
    return next(err);
  }
}

export async function getQuotation(req, res, next) {
  try {
    const quote = await crmService.getQuotationById(req.params.id);
    return sendSuccess(res, quote, 200);
  } catch (err) {
    return next(err);
  }
}

export async function getPublicQuotation(req, res, next) {
  try {
    const quote = await crmService.getPublicQuotationByToken(req.params.token);
    return sendSuccess(res, quote, 200);
  } catch (err) {
    return next(err);
  }
}

export async function approvePublicQuotation(req, res, next) {
  try {
    const quote = await crmService.approvePublicQuotationByToken(req.params.token, req.body);
    return sendSuccess(res, quote, 200);
  } catch (err) {
    return next(err);
  }
}

export async function rejectPublicQuotation(req, res, next) {
  try {
    const quote = await crmService.rejectPublicQuotationByToken(req.params.token, req.body);
    return sendSuccess(res, quote, 200);
  } catch (err) {
    return next(err);
  }
}

export async function createQuotation(req, res, next) {
  try {
    const quote = await crmService.createQuotation({
      ...req.body,
      idempotency_key: req.get('Idempotency-Key') || req.body.idempotency_key,
      created_by: req.user?.user_id,
    });
    return sendSuccess(res, quote, 201);
  } catch (err) {
    return next(err);
  }
}

export async function updateQuotation(req, res, next) {
  try {
    const quote = await crmService.updateQuotation(req.params.id, req.body);
    return sendSuccess(res, quote, 200);
  } catch (err) {
    return next(err);
  }
}

export async function updateQuotationStatus(req, res, next) {
  try {
    const quote = await crmService.updateQuotationStatus(req.params.id, req.body.status, req.user?.user_id, req.body);
    return sendSuccess(res, quote, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listOrders(req, res, next) {
  try {
    const orders = await crmService.listOrders(req.query);
    return sendSuccess(res, orders, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listComplaints(req, res, next) {
  try {
    const complaints = await inventoryService.getComplaints();
    return sendSuccess(res, complaints, 200);
  } catch (err) {
    return next(err);
  }
}

export async function createComplaint(req, res, next) {
  try {
    const complaint = await inventoryService.createComplaint(req.body);
    return sendSuccess(res, complaint, 201);
  } catch (err) {
    return next(err);
  }
}

export async function listInvoices(req, res, next) {
  try {
    const invoices = await invoicingService.listInvoices(req.query);
    return sendSuccess(res, invoices, 200);
  } catch (err) {
    return next(err);
  }
}

export async function getInvoice(req, res, next) {
  try {
    const invoice = await invoicingService.getInvoiceById(req.params.id);
    return sendSuccess(res, invoice, 200);
  } catch (err) {
    return next(err);
  }
}

export async function convertQuotationToOrder(req, res, next) {
  try {
    const order = await crmService.convertQuotationToOrder(req.params.id, req.user?.user_id);
    return sendSuccess(res, order, 201);
  } catch (err) {
    return next(err);
  }
}

export async function setProductPriceTiers(req, res, next) {
  try {
    await crmService.setProductPriceTiers(req.params.productId, req.body.tiers);
    return sendSuccess(res, { message: 'Price tiers updated.' }, 200);
  } catch (err) {
    return next(err);
  }
}

export async function getProductPriceTiers(req, res, next) {
  try {
    const tiers = await crmService.getProductPriceTiers(req.params.productId);
    return sendSuccess(res, tiers, 200);
  } catch (err) {
    return next(err);
  }
}
