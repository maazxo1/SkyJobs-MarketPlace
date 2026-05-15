exports.seed = async (knex) => {
  const existing = await knex('users').where({ email: 'admin@skyjobs.dev' }).first();
  if (existing) return;

  await knex('users').insert({
    name: 'Platform Admin',
    email: 'admin@skyjobs.dev',
    password_hash: '$2b$12$jwu72OLhwiHKkHfghXA9eeK9QnufShAqTKT.A9ulR.nZEGDtTXKFG', // admin123456
    role: 'admin',
  });
};
