const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  // Skip if professional freelancers already seeded
  const check = await knex('users').where({ email: 'sarah.chen@skyjobs.dev' }).first();
  if (check) return;

  const hash = await bcrypt.hash('demo123456', 10);
  const today = new Date();
  const daysOut = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const cats = await knex('categories').select('id', 'slug');
  const cat = (slug) => cats.find((c) => c.slug === slug)?.id;

  // ── Freelancers ──────────────────────────────────────────────────────────
  const freelancers = await knex('users').insert([
    {
      name: 'Sarah Chen',
      email: 'sarah.chen@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Full-stack engineer with 6 years building production SaaS apps. I specialise in React + Node.js + PostgreSQL and have shipped products used by 50k+ users. I care about clean code, performance, and honest communication.',
    },
    {
      name: 'Marcus Webb',
      email: 'marcus.webb@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Mobile developer focused on React Native and Flutter. I have published 12 apps to the App Store and Play Store. Prefer long-term partnerships — I treat your app like my own.',
    },
    {
      name: 'Priya Sharma',
      email: 'priya.sharma@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Product designer with a UX-first mindset. 5 years designing B2B SaaS dashboards, design systems, and mobile apps. I deliver Figma files you can hand straight to developers.',
    },
    {
      name: 'Alex Rodriguez',
      email: 'alex.rod@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Cloud & DevOps engineer. AWS Certified Solutions Architect. I have built CI/CD pipelines and Kubernetes platforms for startups scaling from 0 to 1M requests/day. Zero-downtime deployments are my baseline.',
    },
    {
      name: 'Jordan Kim',
      email: 'jordan.kim@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Data scientist and ML engineer. I turn messy business data into working models and clear dashboards. Python, scikit-learn, PyTorch, and FastAPI are my daily tools.',
    },
    {
      name: 'Lena Horvat',
      email: 'lena.horvat@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'WordPress and Webflow specialist with strong SEO fundamentals. I build fast, accessible, well-structured sites that rank and convert. 8+ years, 80+ client sites delivered.',
    },
  ]).returning('*');

  // Freelancer profiles
  await knex('freelancer_profiles').insert([
    { user_id: freelancers[0].id, skills: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Tailwind CSS', 'Stripe API']), hourly_rate: 85, availability: true, portfolio_url: 'https://github.com' },
    { user_id: freelancers[1].id, skills: JSON.stringify(['React Native', 'Flutter', 'TypeScript', 'Firebase', 'Expo', 'Swift']), hourly_rate: 70, availability: true, portfolio_url: 'https://github.com' },
    { user_id: freelancers[2].id, skills: JSON.stringify(['Figma', 'UI Design', 'UX Research', 'Design Systems', 'Prototyping', 'Adobe XD']), hourly_rate: 65, availability: true, portfolio_url: 'https://dribbble.com' },
    { user_id: freelancers[3].id, skills: JSON.stringify(['AWS', 'Kubernetes', 'Terraform', 'Docker', 'GitHub Actions', 'Prometheus']), hourly_rate: 90, availability: false, portfolio_url: 'https://github.com' },
    { user_id: freelancers[4].id, skills: JSON.stringify(['Python', 'scikit-learn', 'PyTorch', 'FastAPI', 'Pandas', 'SQL']), hourly_rate: 80, availability: true, portfolio_url: 'https://github.com' },
    { user_id: freelancers[5].id, skills: JSON.stringify(['WordPress', 'Webflow', 'SEO', 'CSS', 'Elementor', 'WooCommerce']), hourly_rate: 45, availability: true, portfolio_url: 'https://github.com' },
  ]);

  // ── Clients ──────────────────────────────────────────────────────────────
  const clients = await knex('users').insert([
    {
      name: 'TechNova Solutions',
      email: 'technova@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'B2B SaaS company building automation tools for operations teams. We move fast and expect the same from our contractors.',
    },
    {
      name: 'GreenLeaf Commerce',
      email: 'greenleaf@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'Sustainable e-commerce brand growing from $2M to $10M ARR. We need tech talent to scale our platform without scaling our headcount.',
    },
    {
      name: 'Velocity Studios',
      email: 'velocity@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'Digital product agency building MVPs and growth tools for funded startups. We hire specialists and give them real autonomy.',
    },
  ]).returning('*');

  // ── Jobs (from new clients) ───────────────────────────────────────────────
  const newJobs = await knex('jobs').insert([
    {
      client_id: clients[0].id,
      category_id: cat('web-development'),
      title: 'Build an internal analytics dashboard for ops team',
      description: 'Our ops team tracks 20+ KPIs manually in spreadsheets. We need a web dashboard (React + a Node API) connected to our Postgres DB. Charts, date range filters, CSV exports, and a simple auth layer. We have a design brief ready.',
      skills_required: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Chart.js', 'TypeScript']),
      budget_min: 1500, budget_max: 3000, deadline: daysOut(21), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[0].id,
      category_id: cat('devops-cloud'),
      title: 'Migrate our monolith to microservices on AWS ECS',
      description: 'We have a Node.js monolith that is hitting scaling limits. We need an experienced DevOps/backend engineer to extract 3 core services, containerise them, and deploy to AWS ECS with proper service discovery and a load balancer. Full docs required.',
      skills_required: JSON.stringify(['AWS ECS', 'Docker', 'Node.js', 'Terraform', 'GitHub Actions']),
      budget_min: 4000, budget_max: 8000, deadline: daysOut(40), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[1].id,
      category_id: cat('web-development'),
      title: 'Custom WooCommerce theme + checkout optimisation',
      description: 'Our WooCommerce store has a 70% cart abandonment rate. We need a developer to rebuild the product and checkout pages for speed and conversion. Custom theme, GTM integration, and Hotjar-friendly markup. Page speed score of 90+ is required.',
      skills_required: JSON.stringify(['WordPress', 'WooCommerce', 'PHP', 'CSS', 'GTM']),
      budget_min: 800, budget_max: 1800, deadline: daysOut(14), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[1].id,
      category_id: cat('data-science-ai'),
      title: 'Customer churn prediction model + Slack alert integration',
      description: 'We want to predict which customers are likely to churn in the next 30 days based on purchase history, email engagement, and support ticket data. Deliverable: a trained model, a FastAPI endpoint we can call nightly, and a Slack webhook that posts at-risk customers each morning.',
      skills_required: JSON.stringify(['Python', 'scikit-learn', 'FastAPI', 'Pandas', 'Slack API']),
      budget_min: 1200, budget_max: 2500, deadline: daysOut(28), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[2].id,
      category_id: cat('mobile-development'),
      title: 'MVP Flutter app for on-demand laundry service',
      description: 'We are launching an on-demand laundry pickup/delivery app in 3 cities. We need a Flutter developer to build the customer-facing app: order placement, live order tracking (Firebase Realtime DB), push notifications, and Stripe payment. Android first, iOS phase 2.',
      skills_required: JSON.stringify(['Flutter', 'Dart', 'Firebase', 'Stripe', 'Google Maps API']),
      budget_min: 5000, budget_max: 9000, deadline: daysOut(55), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[2].id,
      category_id: cat('ui-ux-design'),
      title: 'End-to-end design for a fintech mobile app (Figma)',
      description: 'We are building a personal finance app for Gen Z. We need a designer to create a full Figma prototype covering onboarding, dashboard, spending breakdown, goals, and settings. Existing branding will be provided. We expect 40+ screens with an interactive prototype.',
      skills_required: JSON.stringify(['Figma', 'Mobile Design', 'Design Systems', 'UX Research', 'Prototyping']),
      budget_min: 2000, budget_max: 3500, deadline: daysOut(18), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[0].id,
      category_id: cat('writing-content'),
      title: 'Technical writer for API docs + developer portal content',
      description: 'We are launching a public API and need a technical writer to document 30 endpoints (OpenAPI spec provided), write 8 getting-started guides, and produce 4 integration tutorials (Node, Python, Ruby, PHP). Output: Markdown files suitable for Docusaurus.',
      skills_required: JSON.stringify(['Technical Writing', 'API Documentation', 'Markdown', 'OpenAPI', 'REST APIs']),
      budget_min: 600, budget_max: 1200, deadline: daysOut(16), location: 'Remote', status: 'open',
    },
    {
      client_id: clients[1].id,
      category_id: cat('ui-ux-design'),
      title: 'Email template system design (8 transactional templates)',
      description: 'We need a designer to create a cohesive email template system for 8 transactional emails (order confirmation, shipping, review request, winback, etc). Deliverables: Figma design + exported HTML/CSS compatible with SendGrid.',
      skills_required: JSON.stringify(['Email Design', 'Figma', 'HTML Email', 'CSS', 'SendGrid']),
      budget_min: 400, budget_max: 900, deadline: daysOut(10), location: 'Remote', status: 'open',
    },
  ]).returning('*');

  // ── Bids ─────────────────────────────────────────────────────────────────
  // Multiple freelancers bid on different jobs to show real activity

  const bids = await knex('bids').insert([
    // Sarah bids on the analytics dashboard (job 0 - newJobs[0])
    {
      job_id: newJobs[0].id, freelancer_id: freelancers[0].id,
      amount: 2600, delivery_days: 18,
      cover_letter: "I have built similar internal dashboards for two SaaS clients — one for a logistics company tracking fleet KPIs and another for a fintech ops team. Both used the React + Node + Postgres stack you describe. I can share code samples on request. Happy to jump on a quick call to review the brief.",
      status: 'accepted',
    },
    // Marcus also bids on analytics (rejected)
    {
      job_id: newJobs[0].id, freelancer_id: freelancers[1].id,
      amount: 2900, delivery_days: 22,
      cover_letter: "Though my primary focus is mobile, I have solid React and Node experience from building the API layers for my apps. This scope looks manageable in the timeframe given.",
      status: 'rejected',
    },
    // Alex bids on the microservices migration job (newJobs[1])
    {
      job_id: newJobs[1].id, freelancer_id: freelancers[3].id,
      amount: 6500, delivery_days: 35,
      cover_letter: "I have migrated three Node.js monoliths to containerised microservices in the last 18 months. Two were on ECS, one on EKS. I can walk you through my standard approach: service boundary identification, strangler fig pattern, parallel running, then cutover. Terraform modules and GitHub Actions pipelines are part of my standard delivery.",
      status: 'accepted',
    },
    // Jordan bids on churn prediction (newJobs[3])
    {
      job_id: newJobs[3].id, freelancer_id: freelancers[4].id,
      amount: 2200, delivery_days: 24,
      cover_letter: "Churn prediction is one of my core use cases — I have built two production models for subscription businesses. I would start with a gradient boosting model (XGBoost or LightGBM) on your tabular data, evaluate against a logistic regression baseline, and expose the winner via FastAPI. The Slack integration is straightforward. What does your current data pipeline look like?",
      status: 'accepted',
    },
    // Priya bids on fintech design (newJobs[5])
    {
      job_id: newJobs[5].id, freelancer_id: freelancers[2].id,
      amount: 3200, delivery_days: 16,
      cover_letter: "Fintech and personal finance are areas I have designed in for three years — most recently a crypto portfolio tracker and a budgeting app for millennials. I always start with a short discovery sprint (user flows + IA) before touching Figma. 40+ screens in 16 days is achievable if we align on the flows early. Can share my portfolio on request.",
      status: 'accepted',
    },
    // Marcus bids on the Flutter laundry app (newJobs[4])
    {
      job_id: newJobs[4].id, freelancer_id: freelancers[1].id,
      amount: 7500, delivery_days: 48,
      cover_letter: "Flutter is my primary mobile stack for the last two years. I have shipped apps with Firebase Realtime DB for live tracking, Google Maps for route display, and Stripe for payments — all features on your list. I would structure this as 3 sprints with a working demo at the end of each. Happy to discuss architecture in detail.",
      status: 'pending',
    },
    // Sarah also bids on WooCommerce job (newJobs[2])
    {
      job_id: newJobs[2].id, freelancer_id: freelancers[0].id,
      amount: 1600, delivery_days: 12,
      cover_letter: "I have optimised WooCommerce checkout flows for three e-commerce clients, reducing cart abandonment by 15-25% in each case. My standard approach: lazy load non-critical scripts, minimise third-party JS at checkout, and implement a single-page checkout flow with inline validation.",
      status: 'pending',
    },
    // Lena bids on the WooCommerce job (newJobs[2])
    {
      job_id: newJobs[2].id, freelancer_id: freelancers[5].id,
      amount: 1450, delivery_days: 10,
      cover_letter: "WooCommerce is my bread and butter. I have rebuilt checkout flows for 12 stores and consistently hit 90+ PageSpeed scores. Custom theme built on Storefront or from scratch, GTM dataLayer pushes for all ecommerce events, and Hotjar-compatible markup. I can start this week.",
      status: 'pending',
    },
    // Jordan bids on the analytics dashboard too (newJobs[0] — rejected for variety)
    {
      job_id: newJobs[3].id, freelancer_id: freelancers[0].id,
      amount: 1900, delivery_days: 20,
      cover_letter: "I have worked closely with data scientists on API delivery, so I understand both sides. My FastAPI skills are production-grade and I can own the full pipeline from model training to deployment.",
      status: 'rejected',
    },
  ]).returning('*');

  // The accepted bids: bids[0] (Sarah→analytics), bids[2] (Alex→microservices), bids[3] (Jordan→churn), bids[4] (Priya→fintech design)

  // ── Contracts ────────────────────────────────────────────────────────────
  const contracts = await knex('contracts').insert([
    // Completed: Sarah built the analytics dashboard for TechNova
    {
      job_id: newJobs[0].id,
      bid_id: bids[0].id,
      client_id: clients[0].id,
      freelancer_id: freelancers[0].id,
      amount: 2600,
      deadline: daysAgo(3),
      status: 'completed',
    },
    // Completed: Jordan built the churn model for GreenLeaf
    {
      job_id: newJobs[3].id,
      bid_id: bids[3].id,
      client_id: clients[1].id,
      freelancer_id: freelancers[4].id,
      amount: 2200,
      deadline: daysAgo(5),
      status: 'completed',
    },
    // In progress: Alex is doing the microservices migration
    {
      job_id: newJobs[1].id,
      bid_id: bids[2].id,
      client_id: clients[0].id,
      freelancer_id: freelancers[3].id,
      amount: 6500,
      deadline: daysOut(25),
      status: 'in_progress',
    },
    // Active: Priya is doing the fintech design
    {
      job_id: newJobs[5].id,
      bid_id: bids[4].id,
      client_id: clients[2].id,
      freelancer_id: freelancers[2].id,
      amount: 3200,
      deadline: daysOut(14),
      status: 'active',
    },
  ]).returning('*');

  // Mark the jobs for completed contracts as closed
  await knex('jobs').whereIn('id', [newJobs[0].id, newJobs[3].id]).update({ status: 'closed' });

  // ── Reviews ──────────────────────────────────────────────────────────────
  // Client reviews freelancer (and freelancer reviews client) for both completed contracts

  await knex('reviews').insert([
    // TechNova reviews Sarah
    {
      contract_id: contracts[0].id,
      reviewer_id: clients[0].id,
      reviewee_id: freelancers[0].id,
      rating: 5,
      comment: 'Sarah delivered exactly what we asked for, a week ahead of schedule. The code is clean and well-documented. Communication throughout was excellent — daily updates, no surprises. We will definitely hire her again.',
    },
    // Sarah reviews TechNova
    {
      contract_id: contracts[0].id,
      reviewer_id: freelancers[0].id,
      reviewee_id: clients[0].id,
      rating: 5,
      comment: 'Great client. Brief was clear, feedback was fast, and payment was processed the same day I submitted the final build. The project was well-scoped with no scope creep. Would work with TechNova again without hesitation.',
    },
    // GreenLeaf reviews Jordan
    {
      contract_id: contracts[1].id,
      reviewer_id: clients[1].id,
      reviewee_id: freelancers[4].id,
      rating: 4,
      comment: 'Jordan delivered a solid churn model with clear documentation. The FastAPI endpoint works well in production and the Slack integration saves our team hours each week. Lost one star only because the first model iteration needed refinement — but Jordan resolved it quickly.',
    },
    // Jordan reviews GreenLeaf
    {
      contract_id: contracts[1].id,
      reviewer_id: freelancers[4].id,
      reviewee_id: clients[1].id,
      rating: 4,
      comment: 'Responsive client with good data infrastructure. The data was reasonably clean which made modelling much easier. Clear requirements and fair payment terms. The scope expanded slightly mid-project but we agreed on it upfront.',
    },
  ]);
};
