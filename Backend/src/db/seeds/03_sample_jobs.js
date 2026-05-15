const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  // Skip if jobs already exist
  const existing = await knex('jobs').count('id as n').first();
  if (Number(existing.n) > 0) return;

  // Create a demo client
  let client = await knex('users').where({ email: 'client@skyjobs.dev' }).first();
  if (!client) {
    const hash = await bcrypt.hash('demo123456', 10);
    [client] = await knex('users')
      .insert({
        name: 'Acme Corp',
        email: 'client@skyjobs.dev',
        password_hash: hash,
        role: 'client',
        bio: 'We build SaaS tools for small businesses. Always looking for talented freelancers.',
      })
      .returning('*');
  }

  // Get category IDs by slug
  const cats = await knex('categories').select('id', 'slug');
  const cat = (slug) => cats.find((c) => c.slug === slug)?.id;

  const today = new Date();
  const daysOut = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  await knex('jobs').insert([
    {
      client_id: client.id,
      category_id: cat('web-development'),
      title: 'Build a full-stack SaaS billing dashboard',
      description:
        'We need an experienced full-stack developer to build a billing and subscription management dashboard. The app should integrate with Stripe, display usage metrics, support plan upgrades/downgrades, and include a customer portal. Tech stack: React, Node.js, PostgreSQL. Clean UI is a must.',
      skills_required: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Stripe API']),
      budget_min: 2500,
      budget_max: 5000,
      deadline: daysOut(28),
      location: 'Remote',
      status: 'open',
    },
    {
      client_id: client.id,
      category_id: cat('ui-ux-design'),
      title: 'UI/UX redesign for a B2B project management tool',
      description:
        'Our project management web app has grown organically and the UI is outdated. We want a product designer to audit the current UX, identify pain points, and deliver high-fidelity Figma mockups for a full redesign. The app has ~12 screens. We value clean, functional design over flashy trends.',
      skills_required: JSON.stringify(['Figma', 'UI Design', 'UX Research', 'Prototyping']),
      budget_min: 1200,
      budget_max: 2000,
      deadline: daysOut(18),
      location: 'Remote',
      status: 'open',
    },
    {
      client_id: client.id,
      category_id: cat('mobile-development'),
      title: 'React Native fitness tracking app (iOS + Android)',
      description:
        'We need a React Native developer to build a cross-platform fitness app from scratch. Features include workout logging, progress charts (using Victory Native), push notifications for reminders, and a REST API integration with our existing backend. App Store and Play Store submission required.',
      skills_required: JSON.stringify(['React Native', 'Expo', 'REST APIs', 'TypeScript']),
      budget_min: 3000,
      budget_max: 6000,
      deadline: daysOut(45),
      location: 'Remote',
      status: 'open',
    },
    {
      client_id: client.id,
      category_id: cat('data-science-ai'),
      title: 'Train a product recommendation ML model for e-commerce',
      description:
        'We run a mid-sized e-commerce store and want to implement a personalised product recommendation engine. You will work with our existing purchase and browsing history data (~500k rows) to train a collaborative filtering or similar model, then expose it as a lightweight REST endpoint our frontend can query.',
      skills_required: JSON.stringify(['Python', 'scikit-learn', 'FastAPI', 'Pandas']),
      budget_min: 1800,
      budget_max: 3500,
      deadline: daysOut(35),
      location: 'Remote',
      status: 'open',
    },
    {
      client_id: client.id,
      category_id: cat('devops-cloud'),
      title: 'Set up CI/CD pipeline and Kubernetes deployment on AWS',
      description:
        'We have a Node.js microservices app currently deployed manually. We need a DevOps engineer to containerise the services with Docker, set up a Kubernetes cluster on AWS EKS, configure a GitHub Actions CI/CD pipeline with staging and production environments, and add monitoring via Prometheus + Grafana.',
      skills_required: JSON.stringify(['AWS EKS', 'Kubernetes', 'Docker', 'GitHub Actions', 'Terraform']),
      budget_min: 2000,
      budget_max: 4000,
      deadline: daysOut(22),
      location: 'Remote',
      status: 'open',
    },
  ]);
};
