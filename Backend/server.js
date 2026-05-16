require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/socket');
const knex = require('./src/config/database');

const PORT = process.env.PORT || 5000;

async function start() {
  await knex.migrate.latest();
  console.log('Migrations applied');

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`SkyJobs API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    require('./src/jobs/index');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
