exports.up = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.decimal('trust_score', 6, 2).notNullable().defaultTo(100);
    t.varchar('trust_level', 20).notNullable().defaultTo('new'); // new/verified/trusted/top/suspended
    t.decimal('rating_avg', 3, 2).nullable();
    t.integer('rating_count').notNullable().defaultTo(0);
    t.decimal('total_earned', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_spent', 12, 2).notNullable().defaultTo(0);
    t.integer('jobs_completed').notNullable().defaultTo(0);
    t.integer('jobs_cancelled').notNullable().defaultTo(0);
    t.boolean('is_verified').notNullable().defaultTo(false);
    t.timestamp('last_seen_at').nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.dropColumn('trust_score');
    t.dropColumn('trust_level');
    t.dropColumn('rating_avg');
    t.dropColumn('rating_count');
    t.dropColumn('total_earned');
    t.dropColumn('total_spent');
    t.dropColumn('jobs_completed');
    t.dropColumn('jobs_cancelled');
    t.dropColumn('is_verified');
    t.dropColumn('last_seen_at');
  });
