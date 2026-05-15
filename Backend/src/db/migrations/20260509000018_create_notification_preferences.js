exports.up = (knex) =>
  knex.schema.createTable('notification_preferences', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    t.boolean('email_new_bid').notNullable().defaultTo(true);
    t.boolean('email_bid_accepted').notNullable().defaultTo(true);
    t.boolean('email_bid_rejected').notNullable().defaultTo(true);
    t.boolean('email_order_updates').notNullable().defaultTo(true);
    t.boolean('email_deadline_reminders').notNullable().defaultTo(true);
    t.boolean('email_payment').notNullable().defaultTo(true);
    t.boolean('email_dispute').notNullable().defaultTo(true);
    t.boolean('email_messages').notNullable().defaultTo(false);
    t.boolean('push_enabled').notNullable().defaultTo(true);
    t.string('digest_frequency', 20).notNullable().defaultTo('immediate');
    // immediate / hourly / daily
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('notification_preferences');
