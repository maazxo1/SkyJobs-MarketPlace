exports.up = (knex) =>
  knex.schema.createTable('escrow_transactions', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('RESTRICT');
    t.string('type', 20).notNullable(); // hold/release/refund/partial_release
    t.decimal('amount', 10, 2).notNullable();
    t.decimal('platform_fee', 10, 2).notNullable().defaultTo(0);
    t.decimal('net_to_freelancer', 10, 2).notNullable();
    t.string('status', 20).notNullable().defaultTo('pending'); // pending/completed/failed
    t.string('reference', 100).nullable();
    t.integer('triggered_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.text('note').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id']);
    t.index(['status']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('escrow_transactions');
