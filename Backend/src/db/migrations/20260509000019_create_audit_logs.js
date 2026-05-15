exports.up = (knex) =>
  knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('actor_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.string('actor_role', 20).nullable(); // admin/system
    t.string('action', 100).notNullable(); // e.g. 'order.force_cancel', 'dispute.resolve'
    t.string('entity_type', 30).nullable(); // order/dispute/user/contract
    t.integer('entity_id').nullable();
    t.jsonb('before').nullable(); // snapshot before
    t.jsonb('after').nullable();  // snapshot after
    t.text('note').nullable();
    t.string('ip_address', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['entity_type', 'entity_id']);
    t.index(['actor_id']);
    t.index(['action']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('audit_logs');
