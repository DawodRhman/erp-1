import { sendSuccess } from '../../utils/respond.js';
import * as invoicingService from './invoicing.service.js';

export async function listClientTemplates(req, res, next) {
  try {
    const templates = await invoicingService.listClientTemplates(req.query.customer_id);
    return sendSuccess(res, templates, 200);
  } catch (err) {
    return next(err);
  }
}

export async function saveClientTemplate(req, res, next) {
  try {
    const template = await invoicingService.saveClientTemplate(req.body);
    return sendSuccess(res, template, 201);
  } catch (err) {
    return next(err);
  }
}

export async function createClientInvoice(req, res, next) {
  try {
    const invoice = await invoicingService.createClientInvoiceFromDispatch({
      ...req.body,
      idempotency_key: req.get('Idempotency-Key') || req.body.idempotency_key,
    });
    return sendSuccess(res, invoice, 201);
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

export async function listSummaries(req, res, next) {
  try {
    const summaries = await invoicingService.listInvoiceSummaries(req.query);
    return sendSuccess(res, summaries, 200);
  } catch (err) {
    return next(err);
  }
}

export async function createSummary(req, res, next) {
  try {
    const summary = await invoicingService.createInvoiceSummary(req.body);
    return sendSuccess(res, summary, 201);
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

export async function updateInvoice(req, res, next) {
  try {
    const invoice = await invoicingService.updateClientInvoice(req.params.id, req.body);
    return sendSuccess(res, invoice, 200);
  } catch (err) {
    return next(err);
  }
}

export async function updateInvoiceStatus(req, res, next) {
  try {
    const invoice = await invoicingService.updateInvoiceStatus(req.params.id, req.body.status);
    return sendSuccess(res, invoice, 200);
  } catch (err) {
    return next(err);
  }
}
