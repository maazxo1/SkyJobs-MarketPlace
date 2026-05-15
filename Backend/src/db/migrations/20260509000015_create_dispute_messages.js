exports.up = (knex) =>
  knex.schema.createTable('dispute_messages', (t) => {
    t.increments('id').primary();
    t.integer('dispute_id').unsigned().notNullable()
      .references('id').inTable('disputes').onDelete('CASCADE');
    t.integer('sender_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.text('message').notNullable();
    t.boolean('is_admin').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['dispute_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('dispute_messages');
