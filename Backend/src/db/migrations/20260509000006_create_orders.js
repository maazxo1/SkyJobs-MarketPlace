exports.up = async (knex) => {
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('contract_id').unsigned().notNullable()
      .references('id').inTable('contracts').onDelete('RESTRICT');
    t.integer('job_id').unsigned().notNullable()
      .references('id').inTable('jobs').onDelete('RESTRICT');
    t.integer('bid_id').unsigned().notNullable()
      .references('id').inTable('bids').onDelete('RESTRICT');
    t.integer('client_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.integer('freelancer_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.string('status', 30).notNullable().defaultTo('awaiting_start');
    t.decimal('amount', 10, 2).notNullable();
    t.decimal('platform_fee', 10, 2).notNullable().defaultTo(0);
    t.decimal('freelancer_payout', 10, 2).notNullable();
    t.string('escrow_status', 20).notNullable().defaultTo('held'); // held/released/refunded
    t.date('deadline').notNullable();
    t.timestamp('started_at').nullable();
    t.timestamp('delivered_at').nullable();
    t.timestamp('completed_at').nullable();
    t.timestamp('cancelled_at').nullable();
    t.text('cancellation_reason').nullable();
    t.integer('cancelled_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.integer('revision_count').notNullable().defaultTo(0);
    t.integer('max_revisions').notNullable().defaultTo(2);
    t.timestamp('auto_complete_at').nullable();
    t.boolean('is_late').notNullable().defaultTo(false);
    t.timestamp('late_flagged_at').nullable();
    // dispute_id FK added after disputes table is created (migration 20260509000013)
    t.integer('dispute_id').nullable();
    t.integer('extension_count').notNullable().defaultTo(0);
    t.timestamps(true, true);

    t.index(['status']);
    t.index(['client_id']);
    t.index(['freelancer_id']);
    t.index(['deadline']);
  });

  // Now that orders exists, wire up the FK from contracts.order_id
  await knex.schema.alterTable('contracts', (t) => {
    t.foreign('order_id').references('id').inTable('orders').onDelete('RESTRICT');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('contracts', (t) => {
    t.dropForeign(['order_id']);
  });
  await knex.schema.dropTableIfExists('orders');
};
