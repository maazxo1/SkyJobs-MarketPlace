const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const jobRoutes = require('./routes/jobs.routes');
const bidRoutes = require('./routes/bids.routes');
const userRoutes = require('./routes/users.routes');
const adminRoutes = require('./routes/admin.routes');
const categoryRoutes = require('./routes/categories.routes');
const notificationRoutes = require('./routes/notifications.routes');
const reviewRoutes = require('./routes/reviews.routes');
const contractRoutes = require('./routes/contracts.routes');
const statsRoutes = require('./routes/stats.routes');
const orderRoutes = require('./routes/orders.routes');
const disputeRoutes = require('./routes/disputes.routes');
const errorMiddleware = require('./middleware/error');
const { error } = require('./utils/response');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/bids', bidRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/disputes', disputeRoutes);

app.use((req, res) => error(res, 'Route not found', 404, 'NOT_FOUND'));
app.use(errorMiddleware);

module.exports = app;
