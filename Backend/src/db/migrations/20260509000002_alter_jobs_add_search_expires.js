exports.up = async (knex) => {
  await knex.schema.alterTable('jobs', (t) => {
    t.timestamp('expires_at').nullable();
    t.integer('view_count').notNullable().defaultTo(0);
    t.date('deadline').nullable().alter(); // make deadline optional
  });

  // Full-text search vector
  await knex.raw(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
      ) STORED
  `);
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_search_vector ON jobs USING GIN(search_vector)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at) WHERE expires_at IS NOT NULL');
};

exports.down = async (knex) => {
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_search_vector');
  await knex.raw('DROP INDEX IF EXISTS idx_jobs_expires_at');
  await knex.schema.alterTable('jobs', (t) => {
    t.dropColumn('search_vector');
    t.dropColumn('expires_at');
    t.dropColumn('view_count');
  });
};
