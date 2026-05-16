exports.up = async (knex) => {
  // Populate search_vector for all existing rows
  await knex.raw(`
    UPDATE jobs
    SET search_vector = to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
    WHERE search_vector IS NULL
  `);

  // GIN index for fast full-text queries
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS jobs_search_vector_idx ON jobs USING GIN (search_vector)
  `);

  // Trigger function: keep search_vector in sync on INSERT / UPDATE
  await knex.raw(`
    CREATE OR REPLACE FUNCTION jobs_fts_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
      );
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    DROP TRIGGER IF EXISTS jobs_fts_update ON jobs
  `);

  await knex.raw(`
    CREATE TRIGGER jobs_fts_update
    BEFORE INSERT OR UPDATE OF title, description ON jobs
    FOR EACH ROW EXECUTE FUNCTION jobs_fts_trigger()
  `);
};

exports.down = async (knex) => {
  await knex.raw('DROP TRIGGER IF EXISTS jobs_fts_update ON jobs');
  await knex.raw('DROP FUNCTION IF EXISTS jobs_fts_trigger()');
  await knex.raw('DROP INDEX IF EXISTS jobs_search_vector_idx');
};
