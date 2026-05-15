exports.up = (knex) =>
  knex.schema.createTable('payouts', (t) => {
    t.increments('id').primary();
    t.integer('freelancer_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.integer('escrow_transaction_id').unsigned().notNullable()
      .references('id').inTable('escrow_transactions').onDelete('RESTRICT');
    t.decimal('amount', 10, 2).notNullable();
    t.string('status', 30).notNullable().defaultTo('pending_clearance');
    // pending_clearance / available / processing / paid / failed
    t.timestamp('available_at').notNullable(); // completion_at + 7 days
    t.timestamp('paid_at').nullable();
    t.string('method', 50).nullable(); // bank/paypal/stripe
    t.string('reference', 100).nullable();
    t.integer('retry_count').notNullable().defaultTo(0);
    t.text('failure_reason').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['freelancer_id']);
    t.index(['status']);
    t.index(['available_at']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('payouts');
