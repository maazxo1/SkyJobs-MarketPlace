exports.up = (knex) =>
  knex.schema.alterTable('reviews', (t) => {
    t.integer('order_id').unsigned().nullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.string('role', 25).nullable(); // client_to_freelancer / freelancer_to_client
    t.boolean('is_visible').notNullable().defaultTo(false);
    t.timestamp('revealed_at').nullable();
    t.timestamp('window_closes_at').nullable(); // completed_at + 14 days
  });

exports.down = (knex) =>
  knex.schema.alterTable('reviews', (t) => {
    t.dropColumn('order_id');
    t.dropColumn('role');
    t.dropColumn('is_visible');
    t.dropColumn('revealed_at');
    t.dropColumn('window_closes_at');
  });
