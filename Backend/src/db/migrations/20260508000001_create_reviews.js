exports.up = (knex) =>
  knex.schema.createTable('reviews', (t) => {
    t.increments('id').primary();
    t.integer('contract_id').unsigned().notNullable()
      .references('id').inTable('contracts').onDelete('CASCADE');
    t.integer('reviewer_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.integer('reviewee_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.integer('rating').notNullable().checkBetween([1, 5]);
    t.text('comment').nullable();
    t.timestamps(true, true);

    t.unique(['contract_id', 'reviewer_id']);
    t.index(['reviewee_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('reviews');
