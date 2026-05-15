const PLATFORM_FEE_RATE = 0.10; // 10% flat fee

/**
 * Record an escrow hold when a bid is accepted.
 * @param {object} trx         - knex transaction
 * @param {object} opts
 * @param {number} opts.orderId
 * @param {number} opts.amount
 * @param {number} [opts.triggeredBy] - user id (null = system)
 */
async function holdFunds(trx, { orderId, amount, triggeredBy = null }) {
  const fee = parseFloat((amount * PLATFORM_FEE_RATE).toFixed(2));
  const net = parseFloat((amount - fee).toFixed(2));

  const [tx] = await trx('escrow_transactions').insert({
    order_id: orderId,
    type: 'hold',
    amount,
    platform_fee: fee,
    net_to_freelancer: net,
    status: 'completed',
    triggered_by: triggeredBy,
  }, ['*']);
  return tx;
}

/**
 * Release escrow to freelancer on order completion.
 * Also creates a payout record (pending_clearance for 7 days).
 * @param {object} trx
 * @param {object} opts
 * @param {object} opts.order       - full order row
 * @param {number} [opts.triggeredBy]
 * @param {string} [opts.note]
 */
async function releaseFunds(trx, { order, triggeredBy = null, note = null }) {
  const fee = parseFloat((order.amount * PLATFORM_FEE_RATE).toFixed(2));
  const net = parseFloat((order.amount - fee).toFixed(2));

  const [tx] = await trx('escrow_transactions').insert({
    order_id: order.id,
    type: 'release',
    amount: order.amount,
    platform_fee: fee,
    net_to_freelancer: net,
    status: 'completed',
    triggered_by: triggeredBy,
    note,
  }, ['*']);

  // 7-day clearance period
  const availableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await trx('payouts').insert({
    freelancer_id: order.freelancer_id,
    escrow_transaction_id: tx.id,
    amount: net,
    status: 'pending_clearance',
    available_at: availableAt,
  });

  await trx('orders').where({ id: order.id }).update({ escrow_status: 'released' });
  return tx;
}

/**
 * Refund escrow to client on cancellation.
 */
async function refundFunds(trx, { order, triggeredBy = null, note = null }) {
  const [tx] = await trx('escrow_transactions').insert({
    order_id: order.id,
    type: 'refund',
    amount: order.amount,
    platform_fee: 0,
    net_to_freelancer: 0,
    status: 'completed',
    triggered_by: triggeredBy,
    note,
  }, ['*']);

  await trx('orders').where({ id: order.id }).update({ escrow_status: 'refunded' });
  return tx;
}

/**
 * Partial split on dispute resolution.
 * @param {number} opts.clientPct  - percentage going back to client (0-100)
 */
async function splitFunds(trx, { order, clientPct, triggeredBy = null, note = null }) {
  const clientShare = parseFloat((order.amount * (clientPct / 100)).toFixed(2));
  const freelancerGross = parseFloat((order.amount - clientShare).toFixed(2));
  const fee = parseFloat((freelancerGross * PLATFORM_FEE_RATE).toFixed(2));
  const net = parseFloat((freelancerGross - fee).toFixed(2));

  const [tx] = await trx('escrow_transactions').insert({
    order_id: order.id,
    type: 'partial_release',
    amount: order.amount,
    platform_fee: fee,
    net_to_freelancer: net,
    status: 'completed',
    triggered_by: triggeredBy,
    note: note || `Dispute split: ${clientPct}% to client`,
  }, ['*']);

  if (net > 0) {
    const availableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await trx('payouts').insert({
      freelancer_id: order.freelancer_id,
      escrow_transaction_id: tx.id,
      amount: net,
      status: 'pending_clearance',
      available_at: availableAt,
    });
  }

  await trx('orders').where({ id: order.id }).update({ escrow_status: 'released' });
  return tx;
}

module.exports = { holdFunds, releaseFunds, refundFunds, splitFunds, PLATFORM_FEE_RATE };
