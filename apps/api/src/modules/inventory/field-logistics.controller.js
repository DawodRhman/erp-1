import { sendSuccess } from '../../utils/respond.js';
import * as logisticsService from './field-logistics.service.js';

export async function createDispatch(req, res, next) {
  try {
    const dispatch = await logisticsService.createDispatch(req.body, req.user?.user_id);
    return sendSuccess(res, dispatch, 201);
  } catch (err) {
    return next(err);
  }
}

export async function listDispatches(req, res, next) {
  try {
    const list = await logisticsService.listDispatches(req.query);
    return sendSuccess(res, list, 200);
  } catch (err) {
    return next(err);
  }
}

export async function getDispatch(req, res, next) {
  try {
    const dispatch = await logisticsService.getDispatchById(req.params.id);
    return sendSuccess(res, dispatch, 200);
  } catch (err) {
    return next(err);
  }
}

export async function reconcileDispatch(req, res, next) {
  try {
    const dispatch = await logisticsService.reconcileDispatch(req.params.id, req.body, req.user?.user_id);
    return sendSuccess(res, dispatch, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listMaterialRequests(req, res, next) {
  try {
    const requests = await logisticsService.listMaterialRequests(req.query);
    return sendSuccess(res, requests, 200);
  } catch (err) {
    return next(err);
  }
}

export async function createMaterialRequest(req, res, next) {
  try {
    const request = await logisticsService.createMaterialRequest(req.params.id, req.body, req.user?.user_id);
    return sendSuccess(res, request, 201);
  } catch (err) {
    return next(err);
  }
}

export async function reviewMaterialRequest(req, res, next) {
  try {
    const request = await logisticsService.reviewMaterialRequest(req.params.id, req.body, req.user?.user_id);
    return sendSuccess(res, request, 200);
  } catch (err) {
    return next(err);
  }
}

export async function issueMaterialRequest(req, res, next) {
  try {
    const request = await logisticsService.issueMaterialRequest(req.params.id, req.user?.user_id);
    return sendSuccess(res, request, 200);
  } catch (err) {
    return next(err);
  }
}

export async function listReturnRequests(req, res, next) {
  try {
    const list = await logisticsService.listReturnRequests(req.query);
    return sendSuccess(res, list, 200);
  } catch (err) {
    return next(err);
  }
}

export async function getReturnRequest(req, res, next) {
  try {
    const request = await logisticsService.getReturnRequestById(req.params.id);
    return sendSuccess(res, request, 200);
  } catch (err) {
    return next(err);
  }
}

export async function confirmReturnRequest(req, res, next) {
  try {
    const request = await logisticsService.confirmReturnRequest(req.params.id, req.body, req.user?.user_id);
    return sendSuccess(res, request, 200);
  } catch (err) {
    return next(err);
  }
}

export async function sendAdjustedBillToFinance(req, res, next) {
  try {
    const request = await logisticsService.sendAdjustedBillToFinance(req.params.id, req.user?.user_id);
    return sendSuccess(res, request, 200);
  } catch (err) {
    return next(err);
  }
}
