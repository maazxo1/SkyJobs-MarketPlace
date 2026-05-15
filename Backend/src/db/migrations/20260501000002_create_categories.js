exports.up = (knex) =>
  knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.string('slug', 100).notNullable().unique();
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('categories');
