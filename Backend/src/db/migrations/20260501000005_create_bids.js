exports.up = (knex) =>
  knex.schema.createTable('bids', (t) => {
    t.increments('id').primary();
    t.integer('job_id').unsigned().notNullable()
      .references('id').inTable('jobs').onDelete('CASCADE');
    t.integer('freelancer_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
    t.integer('delivery_days').notNullable();
    t.text('cover_letter').notNullable();
    t.enu('status', ['pending', 'accepted', 'rejected', 'withdrawn']).notNullable().defaultTo('pending');
    t.text('rejection_reason').nullable();
    t.timestamps(true, true);

    t.unique(['job_id', 'freelancer_id']);
    t.index(['freelancer_id']);
    t.index(['status']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('bids');
