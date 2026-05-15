exports.up = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.integer('jobs_posted').notNullable().defaultTo(0);
    t.integer('late_delivery_count').notNullable().defaultTo(0);
    t.integer('dispute_count').notNullable().defaultTo(0);
    t.integer('dispute_loss_count').notNullable().defaultTo(0);
    t.boolean('identity_verified').notNullable().defaultTo(false);
    t.integer('profile_complete_score').notNullable().defaultTo(0);
    t.timestamp('last_active_at').nullable();
    t.text('suspension_reason').nullable();
    t.timestamp('suspended_at').nullable();
    t.timestamp('suspended_until').nullable(); // NULL = permanent if suspended
  });

exports.down = (knex) =>
  knex.schema.alterTable('users', (t) => {
    t.dropColumn('jobs_posted');
    t.dropColumn('late_delivery_count');
    t.dropColumn('dispute_count');
    t.dropColumn('dispute_loss_count');
    t.dropColumn('identity_verified');
    t.dropColumn('profile_complete_score');
    t.dropColumn('last_active_at');
    t.dropColumn('suspension_reason');
    t.dropColumn('suspended_at');
    t.dropColumn('suspended_until');
  });
