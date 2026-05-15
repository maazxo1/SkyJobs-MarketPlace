/**
 * reset-db.js
 * Wipes all data and inserts one clean entry of every entity type.
 * Run with: node reset-db.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const knex = require('knex');
const config = require('./knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);

async function main() {
  console.log('Connecting to database...');

  // ── 1. Truncate all tables in reverse FK order ──────────────────────────
  console.log('Clearing all tables...');
  await db.raw('TRUNCATE reviews, notifications, contracts, bids, jobs, freelancer_profiles, categories, users RESTART IDENTITY CASCADE');
  console.log('All tables cleared.');

  // ── 2. Hash passwords ───────────────────────────────────────────────────
  const hash = await bcrypt.hash('Password1!', 12);

  // ── 3. Users ────────────────────────────────────────────────────────────
  console.log('Inserting users...');
  const [admin, client, freelancer] = await db('users').insert([
    {
      name: 'Platform Admin',
      email: 'admin@skyjobs.dev',
      password_hash: hash,
      role: 'admin',
    },
    {
      name: 'Alex Chen',
      email: 'client@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'Founder of a SaaS startup building tools for remote teams.',
    },
    {
      name: 'Sara Malik',
      email: 'freelancer@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Full-stack developer with 6 years of experience in React and Node.js. I build fast, clean web applications.',
    },
  ], ['*']);

  // ── 4. Freelancer profile ────────────────────────────────────────────────
  console.log('Inserting freelancer profile...');
  await db('freelancer_profiles').insert({
    user_id: freelancer.id,
    skills: JSON.stringify(['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Tailwind CSS']),
    hourly_rate: 85,
    portfolio_url: 'https://saramalik.dev',
    availability: true,
  });

  // ── 5. Categories ────────────────────────────────────────────────────────
  console.log('Inserting categories...');
  const [cat] = await db('categories').insert([
    { name: 'Web Development',    slug: 'web-development' },
    { name: 'Mobile Development', slug: 'mobile-development' },
    { name: 'Graphic Design',     slug: 'graphic-design' },
    { name: 'Writing & Content',  slug: 'writing-content' },
    { name: 'Data Science & AI',  slug: 'data-science-ai' },
    { name: 'Digital Marketing',  slug: 'digital-marketing' },
    { name: 'Video & Animation',  slug: 'video-animation' },
    { name: 'UI/UX Design',       slug: 'ui-ux-design' },
    { name: 'Cybersecurity',      slug: 'cybersecurity' },
    { name: 'DevOps & Cloud',     slug: 'devops-cloud' },
  ], ['*']);

  // ── 6. Job ───────────────────────────────────────────────────────────────
  console.log('Inserting job...');
  const [job] = await db('jobs').insert({
    client_id: client.id,
    category_id: cat.id,
    title: 'Build a React dashboard for our SaaS analytics platform',
    description: 'We need a senior React developer to build a data dashboard for our analytics SaaS. The dashboard will display real-time metrics, charts, and user management. Must integrate with our existing REST API. We use TypeScript throughout. Clean, maintainable code is expected. Design mockups will be provided.',
    skills_required: JSON.stringify(['React', 'TypeScript', 'Node.js', 'PostgreSQL']),
    budget_min: 3000,
    budget_max: 6000,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    location: 'Remote',
    status: 'open',
  }, ['*']);

  // ── 7. Bid ───────────────────────────────────────────────────────────────
  console.log('Inserting bid...');
  const [bid] = await db('bids').insert({
    job_id: job.id,
    freelancer_id: freelancer.id,
    amount: 4500,
    delivery_days: 21,
    cover_letter: 'I have built over 15 production dashboards with React and TypeScript, including real-time data visualisation using Recharts and D3. My latest project was a multi-tenant analytics platform handling 200k monthly active users. I can start immediately and deliver clean, well-documented code within your timeline. Happy to share relevant portfolio samples.',
    status: 'pending',
  }, ['*']);

  // ── 8. Notifications ─────────────────────────────────────────────────────
  console.log('Inserting notifications...');
  await db('notifications').insert([
    {
      user_id: client.id,
      type: 'new_bid',
      title: 'New proposal received',
      message: `Sara Malik submitted a $4,500 proposal on "${job.title}"`,
      link: `/jobs/${job.id}`,
      read: false,
    },
    {
      user_id: freelancer.id,
      type: 'new_bid',
      title: 'Proposal submitted',
      message: `Your $4,500 proposal on "${job.title}" is under review.`,
      link: `/jobs/${job.id}`,
      read: false,
    },
  ]);

  // ── 9. Print credentials ─────────────────────────────────────────────────
  console.log('\n✓ Database reset complete.\n');
  console.log('Login credentials (all use password: Password1!)\n');
  console.log('  Admin      → admin@skyjobs.dev');
  console.log('  Client     → client@skyjobs.dev');
  console.log('  Freelancer → freelancer@skyjobs.dev');
  console.log('\nDatabase state:');
  console.log(`  Categories : 10`);
  console.log(`  Users      : 3  (admin, client, freelancer)`);
  console.log(`  Jobs       : 1  (open, posted by client)`);
  console.log(`  Bids       : 1  (pending, from freelancer)`);
  console.log(`  Contracts  : 0  (accept the bid to create one)`);
  console.log(`  Reviews    : 0  (complete a contract to leave one)`);
  console.log(`  Notifs     : 2`);
}

main()
  .then(() => db.destroy())
  .catch((err) => {
    console.error('\nERROR:', err.message);
    db.destroy();
    process.exit(1);
  });
