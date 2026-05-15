exports.up = (knex) =>
  knex.schema.alterTable('bids', (t) => {
    t.timestamp('expires_at').nullable();
    t.boolean('is_counter_offer').notNullable().defaultTo(false);
    t.integer('parent_bid_id').unsigned().nullable()
      .references('id').inTable('bids').onDelete('SET NULL');
    t.decimal('counter_amount', 10, 2).nullable();
    t.integer('counter_days').nullable();
    t.text('counter_message').nullable();
    t.varchar('counter_status', 20).nullable(); // pending / accepted / rejected
    t.text('withdrawn_reason').nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('bids', (t) => {
    t.dropColumn('expires_at');
    t.dropColumn('is_counter_offer');
    t.dropColumn('parent_bid_id');
    t.dropColumn('counter_amount');
    t.dropColumn('counter_days');
    t.dropColumn('counter_message');
    t.dropColumn('counter_status');
    t.dropColumn('withdrawn_reason');
  });
