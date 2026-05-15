exports.up = async (knex) => {
  await knex.schema.createTable('disputes', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('RESTRICT');
    t.integer('contract_id').unsigned().notNullable()
      .references('id').inTable('contracts').onDelete('RESTRICT');
    t.integer('opened_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.integer('respondent_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.string('reason', 50).notNullable();
    // non_delivery/quality_issues/scope_creep/payment_withheld/communication_breakdown/other
    t.text('description').notNullable();
    t.string('status', 20).notNullable().defaultTo('open');
    // open/under_review/resolved/withdrawn
    t.string('resolution', 30).nullable();
    // release_to_freelancer/refund_to_client/partial_split/cancelled
    t.decimal('split_client_pct', 5, 2).nullable();
    t.integer('resolved_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('resolved_at').nullable();
    t.text('resolution_note').nullable();
    t.timestamp('respondent_deadline').notNullable(); // opened_at + 72h
    t.timestamps(true, true);

    t.unique(['order_id']); // one active dispute per order
    t.index(['status']);
  });

  // Now wire up the FK from orders.dispute_id → disputes.id
  await knex.schema.alterTable('orders', (t) => {
    t.foreign('dispute_id').references('id').inTable('disputes').onDelete('SET NULL');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('orders', (t) => {
    t.dropForeign(['dispute_id']);
  });
  await knex.schema.dropTableIfExists('disputes');
};
