exports.up = (knex) =>
  knex.schema.alterTable('notifications', (t) => {
    t.string('event_type', 60).nullable(); // machine-readable key, e.g. 'bid.accepted'
    t.string('entity_type', 30).nullable(); // order / bid / dispute / contract
    t.integer('entity_id').nullable();
    t.string('priority', 10).notNullable().defaultTo('normal'); // low/normal/high/urgent
    t.timestamp('expires_at').nullable();
  });

exports.down = (knex) =>
  knex.schema.alterTable('notifications', (t) => {
    t.dropColumn('event_type');
    t.dropColumn('entity_type');
    t.dropColumn('entity_id');
    t.dropColumn('priority');
    t.dropColumn('expires_at');
  });
