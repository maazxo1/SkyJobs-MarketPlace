const db = require('../config/database');
const { success, error } = require('../utils/response');
const { notify } = require('../utils/notify');

exports.getMyContracts = async (req, res, next) => {
  try {
    const { id: userId, role } = req.user;

    let query = db('contracts as c')
      .join('jobs as j', 'c.job_id', 'j.id')
      .join('users as cl', 'c.client_id', 'cl.id')
      .join('users as fr', 'c.freelancer_id', 'fr.id')
      .leftJoin('orders as o', 'c.order_id', 'o.id')
      .select(
        'c.id', 'c.amount', 'c.deadline', 'c.status', 'c.revision_limit',
        'c.created_at', 'c.updated_at', 'c.order_id',
        'j.id as job_id', 'j.title as job_title',
        'cl.id as client_id', 'cl.name as client_name',
        'fr.id as freelancer_id', 'fr.name as freelancer_name',
        'o.status as order_status',
      )
      .orderBy('c.created_at', 'desc');

    if (role === 'client') query = query.where('c.client_id', userId);
    else if (role === 'freelancer') query = query.where('c.freelancer_id', userId);

    const contracts = await query;

    const contractIds = contracts.map((c) => c.id);
    const myReviews = contractIds.length
      ? await db('reviews').whereIn('contract_id', contractIds).where('reviewer_id', userId).select('contract_id')
      : [];
    const reviewedSet = new Set(myReviews.map((r) => r.contract_id));

    const result = contracts.map((c) => ({
      ...c,
      can_review: c.status === 'completed' && !reviewedSet.has(c.id),
      has_reviewed: reviewedSet.has(c.id),
    }));

    return success(res, result);
  } catch (err) {
    next(err);
  }
};

exports.getContract = async (req, res, next) => {
  try {
    const contract = await db('contracts as c')
      .join('jobs as j', 'c.job_id', 'j.id')
      .join('users as cl', 'c.client_id', 'cl.id')
      .join('users as fr', 'c.freelancer_id', 'fr.id')
      .leftJoin('orders as o', 'c.order_id', 'o.id')
      .select('c.*', 'j.title as job_title', 'cl.name as client_name', 'fr.name as freelancer_name', 'o.status as order_status')
      .where('c.id', req.params.id)
      .first();

    if (!contract) return error(res, 'Contract not found', 404, 'NOT_FOUND');

    const isParty = contract.client_id === req.user.id || contract.freelancer_id === req.user.id;
    if (!isParty && req.user.role !== 'admin') return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const amendments = await db('contract_amendments')
      .where({ contract_id: contract.id })
      .orderBy('created_at', 'desc');

    return success(res, { ...contract, amendments });
  } catch (err) {
    next(err);
  }
};

exports.proposeAmendment = async (req, res, next) => {
  try {
    const contract = await db('contracts').where({ id: req.params.id }).first();
    if (!contract) return error(res, 'Contract not found', 404, 'NOT_FOUND');

    const isParty = contract.client_id === req.user.id || contract.freelancer_id === req.user.id;
    if (!isParty) return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    if (contract.status !== 'active') return error(res, 'Contract is not active', 400, 'INVALID_STATUS');

    const { field, new_value, reason } = req.body;
    const validFields = ['amount', 'deadline', 'scope', 'revisions'];
    if (!validFields.includes(field)) return error(res, 'Invalid field', 400, 'VALIDATION_ERROR');
    if (!new_value || !reason) return error(res, 'new_value and reason are required', 400, 'VALIDATION_ERROR');

    const pendingForField = await db('contract_amendments')
      .where({ contract_id: contract.id, field, status: 'pending' })
      .first();
    if (pendingForField) return error(res, `A pending amendment for "${field}" already exists`, 409, 'ALREADY_PENDING');

    const oldValue = String(contract[field === 'revisions' ? 'revision_limit' : field] || '');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [amendment] = await db('contract_amendments').insert({
      contract_id: contract.id,
      proposed_by: req.user.id,
      field,
      old_value: oldValue,
      new_value: String(new_value),
      reason,
      status: 'pending',
      expires_at: expiresAt,
    }, ['*']);

    const otherPartyId = req.user.id === contract.client_id ? contract.freelancer_id : contract.client_id;
    await notify({
      userId: otherPartyId,
      eventType: 'contract.amendment_proposed',
      title: 'Contract amendment proposed',
      message: `A change to "${field}" has been proposed. Reason: ${reason.slice(0, 100)}`,
      link: `/contracts/${contract.id}`,
      entityType: 'contract',
      entityId: contract.id,
    });

    return success(res, amendment, 'Amendment proposed', 201);
  } catch (err) {
    next(err);
  }
};

exports.respondAmendment = async (req, res, next) => {
  try {
    const contract = await db('contracts').where({ id: req.params.id }).first();
    if (!contract) return error(res, 'Contract not found', 404, 'NOT_FOUND');

    const isParty = contract.client_id === req.user.id || contract.freelancer_id === req.user.id;
    if (!isParty) return error(res, 'Unauthorized', 403, 'FORBIDDEN');

    const amendment = await db('contract_amendments')
      .where({ id: req.params.amendment_id, contract_id: contract.id, status: 'pending' })
      .first();
    if (!amendment) return error(res, 'Pending amendment not found', 404, 'NOT_FOUND');
    if (amendment.proposed_by === req.user.id) {
      return error(res, 'Cannot respond to your own amendment', 400, 'INVALID_ACTION');
    }

    const { accept } = req.body;
    const now = new Date();

    const [updated] = await db('contract_amendments').where({ id: amendment.id }).update({
      status: accept ? 'accepted' : 'rejected',
      responded_by: req.user.id,
      responded_at: now,
    }, ['*']);

    if (accept) {
      const fieldMap = { revisions: 'revision_limit', amount: 'amount', deadline: 'deadline', scope: 'scope' };
      const col = fieldMap[amendment.field];
      if (col) {
        await db('contracts').where({ id: contract.id }).update({ [col]: amendment.new_value });
      }
    }

    await notify({
      userId: amendment.proposed_by,
      eventType: accept ? 'contract.amendment_accepted' : 'contract.amendment_rejected',
      title: accept ? 'Amendment accepted' : 'Amendment declined',
      message: accept
        ? `Your proposed change to "${amendment.field}" was accepted.`
        : `Your proposed change to "${amendment.field}" was declined.`,
      link: `/contracts/${contract.id}`,
      entityType: 'contract',
      entityId: contract.id,
    });

    return success(res, updated, accept ? 'Amendment accepted' : 'Amendment rejected');
  } catch (err) {
    next(err);
  }
};

exports.updateContractStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['completed', 'cancelled'];
    if (!allowed.includes(status)) return error(res, 'Invalid status', 400);

    const contract = await db('contracts').where({ id: req.params.id }).first();
    if (!contract) return error(res, 'Contract not found', 404, 'NOT_FOUND');

    const { id: userId } = req.user;
    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return error(res, 'Unauthorized', 403, 'FORBIDDEN');
    }

    const [updated] = await db('contracts').where({ id: req.params.id }).update({ status }, ['*']);
    return success(res, updated, 'Contract updated');
  } catch (err) {
    next(err);
  }
};
