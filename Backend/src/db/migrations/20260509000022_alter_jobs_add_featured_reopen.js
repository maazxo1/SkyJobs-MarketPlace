exports.up = (knex) =>
  knex.schema.alterTable('jobs', (t) => {
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.timestamp('featured_until').nullable();
    t.integer('reopen_count').notNullable().defaultTo(0);
    t.timestamp('auto_closed_at').nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('jobs', (t) => {
    t.dropColumn('is_featured');
    t.dropColumn('featured_until');
    t.dropColumn('reopen_count');
    t.dropColumn('auto_closed_at');
  });
