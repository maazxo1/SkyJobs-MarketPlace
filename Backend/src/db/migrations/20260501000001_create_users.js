exports.up = (knex) =>
  knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash').notNullable();
    t.enu('role', ['freelancer', 'client', 'admin']).notNullable().defaultTo('freelancer');
    t.string('avatar').nullable();
    t.text('bio').nullable();
    t.boolean('is_banned').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('users');
