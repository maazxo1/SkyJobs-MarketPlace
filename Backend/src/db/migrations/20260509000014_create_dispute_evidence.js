exports.up = (knex) =>
  knex.schema.createTable('dispute_evidence', (t) => {
    t.increments('id').primary();
    t.integer('dispute_id').unsigned().notNullable()
      .references('id').inTable('disputes').onDelete('CASCADE');
    t.integer('submitted_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    t.string('type', 20).notNullable(); // message_history/file/screenshot/text
    t.text('content').notNullable(); // text or URL
    t.string('filename', 255).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['dispute_id']);
  });

exports.down = (knex) => knex.schema.dropTableIfExists('dispute_evidence');
