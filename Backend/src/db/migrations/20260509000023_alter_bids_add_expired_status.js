exports.up = (knex) =>
  knex.raw(`
    ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
    ALTER TABLE bids ADD CONSTRAINT bids_status_check
      CHECK (status = ANY (ARRAY['pending','accepted','rejected','withdrawn','expired']));
  `);

exports.down = (knex) =>
  knex.raw(`
    ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
    ALTER TABLE bids ADD CONSTRAINT bids_status_check
      CHECK (status = ANY (ARRAY['pending','accepted','rejected','withdrawn']));
  `);
