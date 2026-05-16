const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { sign } = require('../utils/jwt');
const { success, error } = require('../utils/response');
const { sendTemplateEmail } = require('../services/email.service');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await db('users').where({ email }).first();
    if (existing) return error(res, 'Email already in use', 409, 'EMAIL_EXISTS');

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db('users').insert(
      { name, email, password_hash, role },
      ['id', 'name', 'email', 'role', 'created_at']
    );

    if (role === 'freelancer') {
      await db('freelancer_profiles').insert({ user_id: user.id });
    }

    const token = sign({ id: user.id, role: user.role });

    // Fire-and-forget welcome email
    sendTemplateEmail(email, 'welcome', { name }).catch(() => {});

    return success(res, { user, token }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user) return error(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS');

    if (user.is_banned) return error(res, 'This account has been banned', 403, 'ACCOUNT_BANNED');

    const token = sign({ id: user.id, role: user.role });
    const { password_hash, ...userSafe } = user;
    return success(res, { user: userSafe, token }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await db('users')
      .where({ id: req.user.id })
      .select(
        'id', 'name', 'email', 'role', 'avatar', 'bio',
        'is_banned', 'trust_level', 'trust_score',
        'jobs_completed', 'jobs_posted', 'total_earned', 'total_spent',
        'late_delivery_count', 'dispute_count', 'dispute_loss_count',
        'created_at', 'last_active_at',
      )
      .first();
    if (!user) return error(res, 'User not found', 404, 'NOT_FOUND');
    if (user.is_banned) return error(res, 'Account suspended', 403, 'ACCOUNT_BANNED');
    return success(res, user);
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => success(res, null, 'Logged out successfully');
