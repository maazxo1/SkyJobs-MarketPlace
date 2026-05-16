exports.up = (knex) =>
  knex.schema.createTable('order_messages', (t) => {
    t.increments('id').primary();
    t.integer('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('message').notNullable();
    t.boolean('is_read').defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('order_id');
  });

exports.down = (knex) => knex.schema.dropTableIfExists('order_messages');
