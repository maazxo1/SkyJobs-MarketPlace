require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SkyJobs API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);

  // Start background job scheduler
  require('./src/jobs/index');
});
