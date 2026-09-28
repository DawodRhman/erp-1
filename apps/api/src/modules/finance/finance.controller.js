import { sendSuccess } from '../../utils/respond.js';
import * as financeService from './finance.service.js';

export async function getDashboard(req, res, next) {
  try {
    return sendSuccess(res, await financeService.getFinanceDashboard(req.query.period), 200);
  } catch (error) {
    return next(error);
  }
}

export async function listBillingApprovals(req, res, next) {
  try {
    return sendSuccess(res, await financeService.listBillingApprovals(req.query), 200);
  } catch (error) {
    return next(error);
  }
}

export async function getBillingApproval(req, res, next) {
  try {
    return sendSuccess(res, await financeService.getBillingApproval(req.params.id), 200);
  } catch (error) {
    return next(error);
  }
}

export async function approveBillingApproval(req, res, next) {
  try {
    return sendSuccess(res, await financeService.approveBillingApproval(req.params.id, req.body, req.user), 200);
  } catch (error) {
    return next(error);
  }
}

export async function rejectBillingApproval(req, res, next) {
  try {
    return sendSuccess(res, await financeService.rejectBillingApproval(req.params.id, req.body, req.user), 200);
  } catch (error) {
    return next(error);
  }
}

export async function listInvoices(req, res, next) {
  try {
    return sendSuccess(res, await financeService.listFinanceInvoices(req.query), 200);
  } catch (error) {
    return next(error);
  }
}

export async function listCustomers(req, res, next) {
  try {
    return sendSuccess(res, await financeService.listFinanceCustomers(req.query), 200);
  } catch (error) {
    return next(error);
  }
}

export async function createInvoice(req, res, next) {
  try {
    return sendSuccess(res, await financeService.createDirectInvoice(req.body, req.user), 201);
  } catch (error) {
    return next(error);
  }
}

export async function getInvoice(req, res, next) {
  try {
    return sendSuccess(res, await financeService.getFinanceInvoice(req.params.id), 200);
  } catch (error) {
    return next(error);
  }
}

export async function updateInvoice(req, res, next) {
  try {
    return sendSuccess(res, await financeService.updateFinanceInvoice(req.params.id, req.body, req.user), 200);
  } catch (error) {
    return next(error);
  }
}

export async function deleteInvoice(req, res, next) {
  try {
    return sendSuccess(res, await financeService.deleteFinanceInvoice(req.params.id), 200);
  } catch (error) {
    return next(error);
  }
}

export async function getSummaries(req, res, next) {
  try {
    return sendSuccess(res, await financeService.getFinanceSummaries(req.query), 200);
  } catch (error) {
    return next(error);
  }
}

export async function getAccounts(req, res, next) {
  try {
    return sendSuccess(res, await financeService.getAccountsOverview(), 200);
  } catch (error) {
    return next(error);
  }
}

export function getCompanyDetails(req, res) {
  return sendSuccess(
    res,
    {
      company: financeService.COMPANY_DETAILS,
      buyer: financeService.HBL_BUYER_DETAILS,
      expense_types: financeService.EXPENSE_TYPES,
    },
    200,
  );
}
