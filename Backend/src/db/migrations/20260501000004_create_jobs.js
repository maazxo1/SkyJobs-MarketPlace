exports.up = (knex) =>
  knex.schema.createTable('jobs', (t) => {
    t.increments('id').primary();
    t.integer('client_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    t.integer('category_id').unsigned().notNullable()
      .references('id').inTable('categories').onDelete('RESTRICT');
    t.string('title', 200).notNullable();
    t.text('description').notNullable();
    t.jsonb('skills_required').defaultTo('[]');
    t.decimal('budget_min', 10, 2).notNullable();
    t.decimal('budget_max', 10, 2).notNullable();
    t.date('deadline').notNullable();
    t.string('location', 100).defaultTo('Remote');
    t.enu('status', ['open', 'in_review', 'closed', 'cancelled']).notNullable().defaultTo('open');
    t.timestamps(true, true);

    t.index(['status']);
    t.index(['client_id']);
    t.index(['category_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('jobs');
