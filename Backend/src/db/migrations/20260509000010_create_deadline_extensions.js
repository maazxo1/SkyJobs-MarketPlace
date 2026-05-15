exports.up = (knex) =>
  knex.schema.createTable('deadline_extensions', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.integer('requested_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.date('original_deadline').notNullable();
    t.date('requested_deadline').notNullable();
    t.text('reason').notNullable();
    t.string('status', 20).notNullable().defaultTo('pending'); // pending/accepted/rejected
    t.integer('responded_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('responded_at').nullable();
    t.timestamp('expires_at').notNullable(); // +24h from creation
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id']);
    t.index(['status']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('deadline_extensions');
