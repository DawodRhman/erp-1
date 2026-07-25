import { sendSuccess } from '../../utils/respond.js';
import * as logisticsService from './field-logistics.service.js';

export async function createDispatch(req, res, next) {
  try {
    const dispatch = await logisticsService.createDispatch(req.body);
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
    const dispatch = await logisticsService.reconcileDispatch(req.params.id, req.body);
    return sendSuccess(res, dispatch, 200);
  } catch (err) {
    return next(err);
  }
}
