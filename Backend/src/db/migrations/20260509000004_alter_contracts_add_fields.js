exports.up = (knex) =>
  knex.schema.alterTable('contracts', (t) => {
    // order_id FK added later in 20260509000006_create_orders.js after orders table exists
    t.integer('order_id').unsigned().nullable();
    t.string('title', 200).nullable();
    t.text('scope').nullable();
    t.integer('delivery_days').nullable();
    t.integer('revision_limit').notNullable().defaultTo(2);
    t.string('terms_version', 10).notNullable().defaultTo('1.0');
    t.timestamp('signed_at').nullable();
    t.timestamp('completed_at').nullable();
    t.timestamp('cancelled_at').nullable();
    t.dropColumn('status');
  }).then(() =>
    knex.schema.alterTable('contracts', (t) => {
      t.enu('status', ['active', 'completed', 'cancelled', 'disputed'])
        .notNullable().defaultTo('active');
    })
  );

exports.down = (knex) =>
  knex.schema.alterTable('contracts', (t) => {
    t.dropColumn('order_id');
    t.dropColumn('title');
    t.dropColumn('scope');
    t.dropColumn('delivery_days');
    t.dropColumn('revision_limit');
    t.dropColumn('terms_version');
    t.dropColumn('signed_at');
    t.dropColumn('completed_at');
    t.dropColumn('cancelled_at');
    t.dropColumn('status');
  }).then(() =>
    knex.schema.alterTable('contracts', (t) => {
      t.enu('status', ['active', 'in_progress', 'completed', 'cancelled'])
        .notNullable().defaultTo('active');
    })
  );
