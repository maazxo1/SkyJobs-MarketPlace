exports.up = (knex) =>
  knex.schema.createTable('freelancer_profiles', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE').unique();
    t.jsonb('skills').defaultTo('[]');
    t.decimal('hourly_rate', 10, 2).nullable();
    t.string('portfolio_url').nullable();
    t.boolean('availability').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('freelancer_profiles');
