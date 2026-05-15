exports.up = (knex) =>
  knex.schema.createTable('notifications', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 50).notNullable();
    t.text('message').notNullable();
    t.boolean('read').notNullable().defaultTo(false);
    t.timestamps(true, true);

    t.index(['user_id', 'read']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('notifications');
