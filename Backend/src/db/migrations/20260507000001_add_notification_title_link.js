exports.up = (knex) =>
  knex.schema.alterTable('notifications', (t) => {
    t.string('title', 120).notNullable().defaultTo('Notification').after('type');
    t.string('link', 255).nullable().after('message');
  });

exports.down = (knex) =>
  knex.schema.alterTable('notifications', (t) => {
    t.dropColumn('title');
    t.dropColumn('link');
  });
