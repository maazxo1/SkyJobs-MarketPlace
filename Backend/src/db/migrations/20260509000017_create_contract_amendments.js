exports.up = (knex) =>
  knex.schema.createTable('contract_amendments', (t) => {
    t.increments('id').primary();
    t.integer('contract_id').unsigned().notNullable()
      .references('id').inTable('contracts').onDelete('CASCADE');
    t.integer('proposed_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.string('field', 50).notNullable(); // amount/deadline/scope/revisions
    t.text('old_value').notNullable();
    t.text('new_value').notNullable();
    t.text('reason').notNullable();
    t.string('status', 20).notNullable().defaultTo('pending'); // pending/accepted/rejected
    t.integer('responded_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('responded_at').nullable();
    t.timestamp('expires_at').notNullable(); // +48h
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['contract_id']);
    t.index(['status']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('contract_amendments');
