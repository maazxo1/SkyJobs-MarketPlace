exports.up = (knex) =>
  knex.schema.createTable('deliveries', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.integer('submitted_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.text('message').nullable();
    t.boolean('is_revision').notNullable().defaultTo(false);
    t.integer('revision_number').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('pending'); // pending/approved/rejected
    t.timestamp('reviewed_at').nullable();
    t.integer('reviewed_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.text('rejection_feedback').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('deliveries');
