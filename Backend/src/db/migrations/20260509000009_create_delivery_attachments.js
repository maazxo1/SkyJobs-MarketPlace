exports.up = (knex) =>
  knex.schema.createTable('delivery_attachments', (t) => {
    t.increments('id').primary();
    t.integer('delivery_id').unsigned().notNullable()
      .references('id').inTable('deliveries').onDelete('CASCADE');
    t.string('filename', 255).notNullable();
    t.text('url').notNullable();
    t.integer('size_bytes').nullable();
    t.string('mime_type', 100).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

exports.down = (knex) => knex.schema.dropTableIfExists('delivery_attachments');
