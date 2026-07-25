import { sendSuccess } from '../../utils/respond.js';
import * as matrixService from './matrix.service.js';

export async function getSalesLeads(req, res, next) {
  try {
    const leads = await matrixService.getSalesLeads();
    sendSuccess(res, leads);
  } catch (err) {
    next(err);
  }
}

export async function createSalesLead(req, res, next) {
  try {
    const lead = await matrixService.createSalesLead(req.body);
    sendSuccess(res, lead, 201);
  } catch (err) {
    next(err);
  }
}

export async function getQuotations(req, res, next) {
  try {
    const quotes = await matrixService.getQuotations();
    sendSuccess(res, quotes);
  } catch (err) {
    next(err);
  }
}

export async function createQuotation(req, res, next) {
  try {
    const quotation = await matrixService.createQuotation({ ...req.body, created_by: req.user?.id });
    sendSuccess(res, quotation, 201);
  } catch (err) {
    next(err);
  }
}

export async function activateProject(req, res, next) {
  try {
    const project = await matrixService.activateProjectFromQuotation(req.params.quotation_id);
    sendSuccess(res, project, 201);
  } catch (err) {
    next(err);
  }
}

export async function getProjects(req, res, next) {
  try {
    const projects = await matrixService.getProjects();
    sendSuccess(res, projects);
  } catch (err) {
    next(err);
  }
}

export async function assignProjectResource(req, res, next) {
  try {
    const assignment = await matrixService.assignProjectResource(req.body);
    sendSuccess(res, assignment, 201);
  } catch (err) {
    next(err);
  }
}

export async function getPurchaseRequisitions(req, res, next) {
  try {
    const prs = await matrixService.getPurchaseRequisitions();
    sendSuccess(res, prs);
  } catch (err) {
    next(err);
  }
}

export async function createPurchaseRequisition(req, res, next) {
  try {
    const pr = await matrixService.createPurchaseRequisition({ ...req.body, requested_by: req.user?.id });
    sendSuccess(res, pr, 201);
  } catch (err) {
    next(err);
  }
}

export async function stockOutToEmployee(req, res, next) {
  try {
    const asset = await matrixService.stockOutToEmployee(req.body);
    sendSuccess(res, asset, 201);
  } catch (err) {
    next(err);
  }
}

export async function getServiceTickets(req, res, next) {
  try {
    const tickets = await matrixService.getServiceTickets();
    sendSuccess(res, tickets);
  } catch (err) {
    next(err);
  }
}

export async function createServiceTicket(req, res, next) {
  try {
    const ticket = await matrixService.createServiceTicket(req.body);
    sendSuccess(res, ticket, 201);
  } catch (err) {
    next(err);
  }
}

export async function triggerOTP(req, res, next) {
  try {
    const result = await matrixService.triggerTechnicianCompletionOTP(req.params.ticket_id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function verifyOTP(req, res, next) {
  try {
    const verified = await matrixService.verifyCustomerOTPHandshake(req.body);
    sendSuccess(res, verified);
  } catch (err) {
    next(err);
  }
}

export async function recordCashCollection(req, res, next) {
  try {
    const debt = await matrixService.recordTechnicianCashCollection(req.body);
    sendSuccess(res, debt, 201);
  } catch (err) {
    next(err);
  }
}

export async function getVirtualDebts(req, res, next) {
  try {
    const debts = await matrixService.getVirtualDebts();
    sendSuccess(res, debts);
  } catch (err) {
    next(err);
  }
}

export async function reconcileDebt(req, res, next) {
  try {
    const debt = await matrixService.reconcileVirtualDebt(req.params.debt_id, req.user?.id);
    sendSuccess(res, debt);
  } catch (err) {
    next(err);
  }
}

export async function processResignationRecovery(req, res, next) {
  try {
    const recovered = await matrixService.handleEmployeeResignationVehicleChecklist(req.params.employee_id);
    sendSuccess(res, recovered);
  } catch (err) {
    next(err);
  }
}
