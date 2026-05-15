exports.up = (knex) =>
  knex.schema.createTable('contracts', (t) => {
    t.increments('id').primary();
    t.integer('job_id').unsigned().notNullable()
      .references('id').inTable('jobs').onDelete('RESTRICT');
    t.integer('bid_id').unsigned().notNullable()
      .references('id').inTable('bids').onDelete('RESTRICT');
    t.integer('client_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.integer('freelancer_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.decimal('amount', 10, 2).notNullable();
    t.date('deadline').notNullable();
    t.enu('status', ['active', 'in_progress', 'completed', 'cancelled']).notNullable().defaultTo('active');
    t.timestamps(true, true);

    t.index(['client_id']);
    t.index(['freelancer_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('contracts');
