exports.up = (knex) =>
  knex.schema.createTable('order_status_history', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.string('from_status', 30).nullable();
    t.string('to_status', 30).notNullable();
    t.integer('triggered_by').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.string('trigger_type', 30).notNullable(); // user_action / system / admin
    t.text('note').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('order_status_history');
