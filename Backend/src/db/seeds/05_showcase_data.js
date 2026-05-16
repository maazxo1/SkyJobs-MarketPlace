const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  const check = await knex('users').where({ email: 'noah.park@skyjobs.dev' }).first();
  if (check) return;

  const hash = await bcrypt.hash('demo123456', 10);
  const now = new Date();
  const ts  = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString(); };
  const day = (n) => ts(n).split('T')[0];
  const fee = (amt) => parseFloat((amt * 0.10).toFixed(2));

  const cats = await knex('categories').select('id', 'slug');
  const cat  = (slug) => cats.find((c) => c.slug === slug)?.id;

  // ── ADMIN ref ──────────────────────────────────────────────────────────────
  const admin = await knex('users').where({ role: 'admin' }).first();

  // ── NEW FREELANCERS ────────────────────────────────────────────────────────
  const fl = await knex('users').insert([
    {
      name: 'Noah Park',
      email: 'noah.park@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Offensive security engineer with 7 years in penetration testing and red-team operations. OSCP + CEH certified. I have assessed fintech, healthcare, and SaaS applications for FTSE 500 clients. Every engagement ends with a clear remediation roadmap, not just a list of findings.',
    },
    {
      name: 'Isabel Ferreira',
      email: 'isabel.ferreira@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'B2B content strategist and writer. I specialise in long-form content for SaaS, fintech, and operations tech — the kind of content that ranks on page one and gets shared by actual practitioners. 6 years, 300+ published articles, 0 AI-generated filler.',
    },
    {
      name: 'Dmitri Volkov',
      email: 'dmitri.volkov@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Motion designer and video producer specialising in B2B SaaS explainers and product walkthroughs. I have produced content for companies backed by a16z, YC, and Sequoia. Clean, functional motion — no cartoon overload. After Effects, Cinema 4D, and DaVinci Resolve are my daily stack.',
    },
    {
      name: 'Aisha Okonkwo',
      email: 'aisha.ok@skyjobs.dev',
      password_hash: hash,
      role: 'freelancer',
      bio: 'Paid search and performance marketing specialist. Google Ads certified, 5 years managing B2B and D2C campaigns totalling $12M in spend. I focus on lowering CPAs, not inflating impressions. I will tell you honestly if your landing page is the problem before we touch bids.',
    },
  ]).returning('*');

  await knex('freelancer_profiles').insert([
    {
      user_id: fl[0].id,
      skills: JSON.stringify(['Penetration Testing', 'OWASP', 'Burp Suite', 'Python', 'AWS Security', 'OSCP']),
      hourly_rate: 95,
      availability: true,
      portfolio_url: 'https://linkedin.com',
    },
    {
      user_id: fl[1].id,
      skills: JSON.stringify(['B2B Copywriting', 'SEO Writing', 'Content Strategy', 'HubSpot', 'Semrush', 'Long-form Content']),
      hourly_rate: 40,
      availability: true,
      portfolio_url: 'https://linkedin.com',
    },
    {
      user_id: fl[2].id,
      skills: JSON.stringify(['After Effects', 'Motion Graphics', 'Cinema 4D', 'DaVinci Resolve', 'Premiere Pro', 'Lottie']),
      hourly_rate: 55,
      availability: true,
      portfolio_url: 'https://vimeo.com',
    },
    {
      user_id: fl[3].id,
      skills: JSON.stringify(['Google Ads', 'Performance Marketing', 'Facebook Ads', 'Google Analytics 4', 'CRO', 'Klaviyo']),
      hourly_rate: 60,
      availability: true,
      portfolio_url: 'https://linkedin.com',
    },
  ]);

  // ── NEW CLIENTS ────────────────────────────────────────────────────────────
  const cl = await knex('users').insert([
    {
      name: 'Pulse Health',
      email: 'pulse@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'Series A digital health startup building remote patient monitoring tools for cardiac and respiratory conditions. We ship regulated software and hold our contractors to the same standard.',
    },
    {
      name: 'Apex Security',
      email: 'apex@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'Boutique cybersecurity consultancy serving mid-market financial services clients. We hire penetration testers project-by-project and pay on delivery.',
    },
    {
      name: 'Maven Media',
      email: 'maven@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'Performance marketing agency. We run paid search, SEO, and email for B2B SaaS clients at Series A and beyond. We hire specialists, not generalists.',
    },
    {
      name: 'Stellar Commerce',
      email: 'stellar@skyjobs.dev',
      password_hash: hash,
      role: 'client',
      bio: 'B2B e-commerce platform helping mid-market retailers manage supplier catalogues, purchase orders, and inventory from a single dashboard. Growing fast, hiring faster.',
    },
  ]).returning('*');

  // Existing freelancers (for additional bids + orders)
  const sarah = await knex('users').where({ email: 'sarah.chen@skyjobs.dev' }).first();
  const greenleaf = await knex('users').where({ email: 'greenleaf@skyjobs.dev' }).first();
  const technova  = await knex('users').where({ email: 'technova@skyjobs.dev' }).first();

  // ── NEW JOBS (all 10 categories, rich descriptions) ───────────────────────
  const jobs = await knex('jobs').insert([

    // ── Cybersecurity ──────────────────────────────────────────────────────
    {
      client_id: cl[1].id, // Apex Security
      category_id: cat('cybersecurity'),
      title: 'Web application penetration test + full security report',
      description: `We need an independent penetration tester to assess our client-facing web application and REST API. The application handles sensitive financial data for SMEs, so thoroughness is non-negotiable.

Scope includes OWASP Top 10 across all authenticated and unauthenticated endpoints, business logic flaws, authentication bypass attempts, SQL injection and XSS, IDOR checks on the API (OpenAPI spec provided), and session management weaknesses. Out of scope: physical access, social engineering, DDoS simulation.

Deliverables: a detailed written report covering every finding with CVSS v3.1 scores, proof-of-concept reproduction steps, a remediation guide ranked by risk priority, and a one-page executive summary for non-technical stakeholders. A re-test after our development team applies the critical patches is included in the scope and budget.

The successful candidate must hold at least one of: OSCP, GPEN, CEH, or equivalent. A sample redacted report from a previous engagement is required before we share application details. An NDA will be signed prior to any access being granted.`,
      skills_required: JSON.stringify(['Penetration Testing', 'OWASP', 'Burp Suite', 'OSCP', 'API Security']),
      budget_min: 3000, budget_max: 6000, deadline: day(21), status: 'closed',
    },
    {
      client_id: cl[1].id,
      category_id: cat('cybersecurity'),
      title: 'AWS cloud security audit + IAM policy hardening',
      description: `Our AWS environment has grown organically over 3 years and we suspect our IAM policies, S3 bucket permissions, and network ACLs are over-permissive. We need a cloud security specialist to audit the full environment and deliver a hardening plan we can execute with our internal team.

Audit scope: IAM roles and policies (over-privileged entities, unused permissions, cross-account trust), S3 bucket policies and public access settings, security group rules (identify unrestricted ingress), CloudTrail and GuardDuty configuration review, secrets management (check for credentials in environment variables or code), and review of our VPC architecture for unnecessary public exposure.

Deliverables: a prioritised findings report (Critical / High / Medium / Low) with remediation Terraform snippets where possible, an updated IAM policy set for our core application roles, and a 60-minute walkthrough call with our engineering lead after the report is delivered. AWS Config rules to detect future drift are a bonus deliverable.

You should have hands-on experience with AWS security tooling (Prowler, ScoutSuite, or equivalent), be fluent in Terraform, and ideally hold an AWS Security Specialty certification. Share relevant AWS audit experience in your proposal.`,
      skills_required: JSON.stringify(['AWS Security', 'IAM', 'Terraform', 'Cloud Security', 'Penetration Testing']),
      budget_min: 4000, budget_max: 7500, deadline: day(30), status: 'open',
    },

    // ── Writing & Content ──────────────────────────────────────────────────
    {
      client_id: cl[3].id, // Stellar Commerce
      category_id: cat('writing-content'),
      title: '10 long-form SEO articles for B2B operations audience',
      description: `Stellar Commerce is investing in organic content to drive top-of-funnel traffic. We need a writer who understands both supply chain operations and technical SEO to produce 10 long-form articles for our blog. These are not fluff pieces — our readers are operations directors and procurement managers at retail chains who will leave immediately if the content is shallow.

Each article: 2,500–3,000 words, single focus keyword per piece (keyword brief provided), 3–5 internal links to product pages and related content, citations from real industry research (no hallucinated statistics), and a practical takeaway in every section. We will provide an editorial brief per article with keyword, target persona, angle, and reference material.

Topics include: supplier catalogue management best practices, PO automation ROI models, inventory forecasting frameworks for seasonal retail, procurement cycle time reduction, and vendor onboarding automation. We also need meta descriptions and suggested H1/H2 structures for each piece.

Payment is per article upon delivery after one revision round. Please share 2–3 writing samples from B2B SaaS, supply chain, logistics, or retail operations. Generalist portfolio submissions will not be reviewed.`,
      skills_required: JSON.stringify(['B2B Copywriting', 'SEO Writing', 'Content Strategy', 'Long-form Content', 'Semrush']),
      budget_min: 2000, budget_max: 4000, deadline: day(30), status: 'closed',
    },
    {
      client_id: technova?.id,
      category_id: cat('writing-content'),
      title: 'SaaS website copy rewrite — 6 core pages',
      description: `TechNova is rebuilding our marketing site and needs a conversion-focused copywriter to rewrite 6 pages: homepage, product overview, pricing, about, two feature pages. The current copy is too feature-centric and undersells the business outcomes we deliver.

We will provide: the current pages, a positioning document, 5 customer interview transcripts, and our ICP definition. Your job is to transform these inputs into messaging that speaks to the ROI and operational impact of our product, not its features. We use the StoryBrand framework internally — experience with it is a plus but not required.

Each page should include: primary headline options (3 variants for A/B testing), supporting copy, CTA text, and notes on supporting visual direction (we have an in-house designer). No Lorem Ipsum placeholders — deliver complete, submission-ready copy.

Timeline: first draft of all 6 pages in 14 days, final versions after one round of revision in 20 days. Include samples of conversion-focused SaaS copy in your proposal. Bonus: share before/after case studies showing measurable lift from copy changes.`,
      skills_required: JSON.stringify(['B2B Copywriting', 'Conversion Copywriting', 'SaaS Marketing', 'StoryBrand', 'Landing Pages']),
      budget_min: 800, budget_max: 1800, deadline: day(20), status: 'open',
    },

    // ── Video & Animation ──────────────────────────────────────────────────
    {
      client_id: cl[3].id, // Stellar Commerce
      category_id: cat('video-animation'),
      title: '90-second product explainer video (motion graphics, B2B)',
      description: `Stellar Commerce is relaunching and needs a 90-second product explainer for our homepage and sales decks. Our audience is procurement managers and operations directors at mid-size retail chains — people with low patience for over-designed videos.

The video must communicate: three core problems we solve (fragmented supplier catalogue, manual PO approvals, broken inventory sync), our product's approach to each, and a clear CTA. We have an existing brand guide (primary cobalt blue, SF Pro font family) and a complete script that needs minimal editing. Tone: clean, modern, business-forward. No cartoon characters. No aggressive colour flashes. Think Figma or Linear's visual language, not explainer video factories.

Deliverables: final video in 1080p MP4 and 4K ProRes master, a 30-second cut for LinkedIn and Google Ads, SRT captions file, a 10-second looping teaser for social, and all After Effects project files (or equivalent) so we can make updates internally. Two revision rounds included before final delivery.

Please include 2–3 portfolio links showing B2B or SaaS explainer work. We do not need live action. Motion graphics only.`,
      skills_required: JSON.stringify(['After Effects', 'Motion Graphics', 'DaVinci Resolve', 'Video Editing', 'B2B Content']),
      budget_min: 1500, budget_max: 3000, deadline: day(18), status: 'closed',
    },
    {
      client_id: cl[0].id, // Pulse Health
      category_id: cat('video-animation'),
      title: '3-minute explainer + 6 patient onboarding micro-videos',
      description: `Pulse Health needs a suite of video content for two audiences: a 3-minute company overview for investors and sales (polished, motion-graphic, brand-led), and 6 short patient onboarding videos (60–90 seconds each) explaining how to use our wearable device and mobile app.

The investor/sales video needs a strong narrative arc: the problem (preventable cardiac events from poor monitoring), the solution (Pulse's platform), clinical validation, and market opportunity. Data visualisations to be woven throughout. We have an existing brand kit and will supply all data/statistics.

The patient videos must be accessible, clear, and calm. Patient audience is 55–75 years old — assume minimal tech familiarity. Scripts will be provided and reviewed by our clinical team before production starts. Voiceover is to be sourced and approved by us separately; you handle animation and editing only.

All deliverables in both MP4 and WebM (for web). Captions required for every video (WCAG 2.1 AA). Source files must be delivered. Timeline: 3-minute video in 3 weeks, patient videos over the following 3 weeks. Milestone-based payments.`,
      skills_required: JSON.stringify(['Motion Graphics', 'After Effects', 'Premiere Pro', 'Explainer Videos', 'Accessibility']),
      budget_min: 4500, budget_max: 8000, deadline: day(42), status: 'open',
    },

    // ── Digital Marketing ──────────────────────────────────────────────────
    {
      client_id: cl[2].id, // Maven Media
      category_id: cat('digital-marketing'),
      title: 'Google Ads rebuild + 3-month management (B2B SaaS)',
      description: `Maven Media is relaunching the Google Ads account for a B2B SaaS client targeting operations managers at mid-market companies (100–1,000 employees). The existing account is dormant and needs rebuilding from scratch with quality score as the primary focus.

Initial setup (weeks 1–2): full keyword research using Semrush and Google Keyword Planner aligned to funnel stages, campaign and ad group architecture (search, display, remarketing), RSA ad copy for each ad group, conversion tracking via GTM (demo request, free trial, pricing page scroll), negative keyword list (branded, irrelevant intent, competitor terms), and target CPA and ROAS goal settings. Landing page audit with 3–5 CRO recommendations included.

Ongoing management for 3 months post-launch: weekly bid strategy adjustments, ad copy A/B testing (minimum 2 experiments per month), monthly performance report with forecasts, and monthly landing page CRO suggestions based on quality score and conversion data.

Budget under management: $5,000/month. Management fee is separate. Target CPA below $280 for a trial signup. Please include campaign-level metrics (ROAS, CPA, conversion rate) from comparable B2B SaaS Google Ads engagements. Google Ads certification required.`,
      skills_required: JSON.stringify(['Google Ads', 'B2B Marketing', 'Conversion Tracking', 'GTM', 'Google Analytics 4']),
      budget_min: 2000, budget_max: 4000, deadline: day(14), status: 'open',
    },
    {
      client_id: greenleaf?.id, // GreenLeaf Commerce
      category_id: cat('digital-marketing'),
      title: 'Klaviyo email automation — 5 core flows from scratch',
      description: `GreenLeaf sells sustainable home goods to a loyal D2C customer base. Our Klaviyo account sends one newsletter per week and that is it. We are leaving significant revenue on the table. We need a Klaviyo specialist to build 5 core automation flows that should have been live years ago.

The five flows: welcome series (4 emails over 10 days, including brand story and best-seller highlight), abandoned cart (3 emails with a tiered discount: 5% at 1h, 10% at 24h, 15% at 72h), post-purchase (delivery tips email + review request at day 7), win-back sequence for customers inactive for 90+ days (3 emails with a progressive discount), and browse abandonment (2 emails: 1h and 24h delay). All copy and design built inside Klaviyo using our existing template as a base.

Each email must include: A/B subject line variants, UTM parameters matching our GA4 event schema, suppression logic so no customer receives more than 2 automated emails in 7 days, and responsive rendering tested in Litmus across Gmail, Apple Mail, and Outlook. All segments must be documented so our team can maintain them after handover.

Deliverable: all 5 flows live and tested in our Klaviyo account, a Loom recording walking through each flow's logic, and a one-page segment reference doc. Timeline: 25 days. Share Klaviyo-specific case studies with revenue lift data if available.`,
      skills_required: JSON.stringify(['Klaviyo', 'Email Marketing', 'Email Automation', 'D2C Marketing', 'CRO']),
      budget_min: 1800, budget_max: 3500, deadline: day(25), status: 'open',
    },

    // ── Web Development (extra) ────────────────────────────────────────────
    {
      client_id: technova?.id,
      category_id: cat('web-development'),
      title: 'Next.js 14 marketing site (App Router, Tailwind, Framer Motion)',
      description: `TechNova is rebuilding our marketing site on Next.js 14. We have a Figma design ready — four sections: hero, features, pricing table, and testimonials — and need an experienced Next.js developer to produce a pixel-perfect, performant, accessible build.

Technical requirements: Next.js 14 App Router, Tailwind CSS, Framer Motion for scroll-triggered animations (no GSAP), deployed to Vercel. Lighthouse scores of 95+ on Performance, Accessibility, Best Practices, and SEO are a hard requirement. Page weight budget: no third-party scripts at first load — we use a consent manager (OneTrust). All fonts self-hosted via next/font. Zero layout shift (CLS < 0.05).

Integrations: HubSpot form for demo requests loaded lazily post-consent, Segment analytics loaded post-consent, full Open Graph and Twitter card meta tags. The pricing section needs a yearly/monthly toggle implemented in pure CSS (no JS). All images must use next/image with correct sizes and priority attributes.

Timeline: 20 days total. Vercel preview URL shared after day 10 for design review. Deliverable: codebase pushed to our GitHub org, all Lighthouse scores documented, handover notes covering any design decisions made during development. Code must pass our ESLint + Prettier config (shared at project start).`,
      skills_required: JSON.stringify(['Next.js', 'React', 'Tailwind CSS', 'Framer Motion', 'TypeScript']),
      budget_min: 2000, budget_max: 4000, deadline: day(20), status: 'open',
    },
    {
      client_id: cl[0].id, // Pulse Health
      category_id: cat('mobile-development'),
      title: 'React Native patient monitoring app (HIPAA, BLE, real-time vitals)',
      description: `Pulse Health is building a regulated remote patient monitoring product for cardiac patients. We need a senior React Native developer to build the patient-facing mobile app that pairs with our BLE wearable device and communicates with our cloud backend.

Core features: Bluetooth Low Energy device pairing and real-time vitals streaming (heart rate, SpO2, steps — SDK and BLE spec provided), a daily log screen for symptoms and medication adherence, configurable push notifications for abnormal readings (threshold values set by clinicians via a separate admin tool), and a secure message thread with the patient's assigned care team. All data must be encrypted in transit and at rest. We operate under HIPAA and will provide compliance documentation that the app must conform to.

The backend is already built (REST + WebSocket, fully documented). You will consume existing APIs and build the mobile layer only. TypeScript is mandatory — JavaScript-only submissions will not be considered. Jest + React Native Testing Library coverage is required for all data-critical flows (vitals parsing, notification triggering, message threading).

Timeline: 60 days to an MVP suitable for a 50-patient pilot. We expect a working build shared fortnightly with our QA team. Fixed-price engagement with 3 milestone-based payments. This role has strong potential to become an ongoing engagement post-pilot.`,
      skills_required: JSON.stringify(['React Native', 'TypeScript', 'BLE', 'Firebase', 'HIPAA', 'Jest']),
      budget_min: 8000, budget_max: 14000, deadline: day(60), status: 'open',
    },
    {
      client_id: cl[3].id, // Stellar Commerce
      category_id: cat('web-development'),
      title: 'Real-time messaging feature with file attachments (Socket.io)',
      description: `Stellar Commerce needs a real-time messaging feature between buyers and their supplier contacts inside our existing Node.js + React application. Think of it as a persistent project thread with typing indicators, read receipts, and file attachments — not a full chat app.

Backend requirements (Node.js + PostgreSQL): Socket.io integration on the existing Express server, message persistence in PostgreSQL (schema will be provided), REST endpoints for paginated message history (50 per page), file upload handling (up to 20MB per file, stored in our existing S3 bucket), rate limiting at 10 messages per minute per user, and support for "online/offline" presence per conversation thread.

Frontend requirements (React + TypeScript): integrate the chat panel into an existing order detail page as a resizable side-panel. Display: avatar + name + timestamped message bubble, inline image previews, download link for non-image files, an unread badge that clears on scroll-to-bottom, and a typing indicator that fades after 3 seconds of inactivity.

Timeline: 25 days. A working PR for review is expected on day 15 (the backend side). Unit tests for message persistence logic are required. We are a TypeScript-first team end-to-end.`,
      skills_required: JSON.stringify(['Socket.io', 'Node.js', 'React', 'PostgreSQL', 'TypeScript', 'AWS S3']),
      budget_min: 3000, budget_max: 5500, deadline: day(25), status: 'open',
    },

    // ── Design ────────────────────────────────────────────────────────────
    {
      client_id: cl[0].id, // Pulse Health / repurpose for Velocity
      category_id: cat('graphic-design'),
      title: 'Brand identity + logo design for digital health startup (Series A)',
      description: `Pulse Health is finalising our visual brand ahead of a Series A close and a public product launch. We need a brand identity built from the ground up — the current logo was designed by the founder in Canva and it shows.

Deliverables: primary wordmark with icon mark, full color system (primary, secondary, semantic colours for light and dark modes), typography pairing (web and product use), a usage guidelines document (what to do, what not to do, spacing rules), and an icon library of 20 custom UI icons in SVG. Also required: 6 branded social media templates (LinkedIn post, story, and Twitter/X card in both light and dark variants) exported from Figma.

The brand should communicate clinical credibility and modern digital health — accessible to patients aged 50+ while still feeling contemporary enough to attract Series A investors. Reference directions we like: Nana Bianca, Komodo Health, Headspace Health. Please do not pitch us a generic blue-and-green health brand.

We expect 2 initial creative directions, one round of feedback to narrow to one, then two rounds of refinement. All source files (Figma) delivered on completion. Budget includes the full scope above. Share brand identity portfolio work, especially for regulated industries, healthtech, or fintech.`,
      skills_required: JSON.stringify(['Brand Identity', 'Logo Design', 'Figma', 'Design Systems', 'Typography']),
      budget_min: 2500, budget_max: 5000, deadline: day(28), status: 'open',
    },

  ]).returning('*');

  // ── BIDS (accepted bids that will become orders) ───────────────────────────
  const bids = await knex('bids').insert([
    // Noah → Apex pen test (job[0]) — ACCEPTED
    {
      job_id: jobs[0].id,
      freelancer_id: fl[0].id,
      amount: 5200,
      delivery_days: 18,
      cover_letter: `I have conducted 40+ web application penetration tests over the past 7 years, including two engagements for fintech platforms handling payment card data. I am OSCP-certified and can share a redacted sample report from a comparable financial services application on request. My deliverables always include CVSS v3.1 scores, reproduction steps from an attacker's perspective, and a remediation guide with priority tiers your developers can action without a security background. Happy to sign the NDA this week to get started.`,
      status: 'accepted',
    },
    // Isabel → Stellar blog (job[2]) — ACCEPTED
    {
      job_id: jobs[2].id,
      freelancer_id: fl[1].id,
      amount: 3600,
      delivery_days: 28,
      cover_letter: `B2B supply chain and operations content is an area I have written in for three years — my clients have included a WMS provider, a freight visibility platform, and a procurement software company. I understand the difference between a content brief written for SEO bots and one written for a VP of Operations who will immediately close it if it's generic. I work from detailed briefs, cite real data, and deliver clean Markdown ready for your CMS. Two of my articles currently rank in positions 1–3 for competitive B2B keywords — happy to share examples.`,
      status: 'accepted',
    },
    // Dmitri → Stellar video (job[4]) — ACCEPTED (dispute order)
    {
      job_id: jobs[4].id,
      freelancer_id: fl[2].id,
      amount: 2800,
      delivery_days: 16,
      cover_letter: `B2B SaaS explainers are my primary specialisation — I have produced content for companies including a Series B procurement platform, a logistics SaaS, and two VC-backed fintech tools. My visual language is clean and system-forward, not cartoon-y. I use the script as my brief and push back if the messaging is unclear before I touch a single frame. I can share three relevant portfolio pieces (all under NDA for the client name but the content is shareable). Two revision rounds included, and I always deliver the After Effects project files.`,
      status: 'accepted',
    },
    // Sarah → TechNova Next.js site (job[8]) — ACCEPTED
    {
      job_id: jobs[8].id,
      freelancer_id: sarah.id,
      amount: 3400,
      delivery_days: 18,
      cover_letter: `I have built four marketing sites on Next.js 14 App Router in the past year, all scoring 95+ Lighthouse across the board. My workflow: I convert Figma frames to components first, then layer in animations, then performance-optimise — which means the review build on day 10 is already fast, not just pretty. I know the OneTrust pattern well and have implemented the consent-gated Segment + HubSpot setup before. I will include a Lighthouse report screenshot with every preview build I share.`,
      status: 'accepted',
    },
    // Aisha → Maven Google Ads (job[6]) — ACCEPTED
    {
      job_id: jobs[6].id,
      freelancer_id: fl[3].id,
      amount: 3200,
      delivery_days: 12,
      cover_letter: `I have rebuilt Google Ads accounts for four B2B SaaS clients from scratch, including two operations-focused tools with a similar ICP to what you describe. My account structures are always Quality Score-first — I have brought average QS from 4.2 to 7.8 in one rebuild by fixing the keyword-to-ad-to-landing-page alignment. On one comparable account, I reduced CPA from $390 to $220 in 6 weeks. Google Ads certified since 2021. I can share sanitised performance dashboards on a call if helpful.`,
      status: 'accepted',
    },
    // Extra pending bids for open jobs (makes listing look active)
    {
      job_id: jobs[1].id, // AWS cloud audit
      freelancer_id: fl[0].id,
      amount: 6800,
      delivery_days: 25,
      cover_letter: `AWS security audits are a core part of my practice. I use Prowler + manual IAM review as my baseline and have hardened environments for a Series B fintech and two SaaS companies. My deliverables include Terraform-ready IAM policy corrections so your team does not have to translate findings into code. OSCP + AWS Security Specialty certified.`,
      status: 'pending',
    },
    {
      job_id: jobs[9].id, // Pulse Health mobile app
      freelancer_id: await knex('users').where({ email: 'marcus.webb@skyjobs.dev' }).first().then(u => u?.id),
      amount: 12500,
      delivery_days: 55,
      cover_letter: `React Native + BLE is a combination I have shipped twice — once for a fitness wearable and once for an IoT home health device. Both apps are live on App Store and Play Store. I understand the difference between a hobby BLE implementation and one that has to be reliable in a clinical setting. I read the HIPAA requirements carefully and am comfortable with the encryption and audit logging constraints. Fortnightly builds are my default, not a special ask.`,
      status: 'pending',
    },
    {
      job_id: jobs[10].id, // Socket.io messaging
      freelancer_id: sarah.id,
      amount: 4800,
      delivery_days: 22,
      cover_letter: `I have built two production real-time chat features on Socket.io — one for a project management tool and one for a support ticketing system. Both handle file attachments via S3 and have the presence/read-receipt model you describe. I can share the architecture diagrams from those projects. The typing indicator debounce pattern and unread badge logic are things I have implemented and iterated on in production. I can hit the day-15 backend PR target comfortably.`,
      status: 'pending',
    },
  ]).returning('*');

  // Bid index map: 0=Noah/pentest, 1=Isabel/blog, 2=Dmitri/video, 3=Sarah/nextjs, 4=Aisha/gads

  // ── CONTRACTS ──────────────────────────────────────────────────────────────
  const contracts = await knex('contracts').insert([
    // Completed: Noah → Apex pen test
    {
      job_id: jobs[0].id, bid_id: bids[0].id,
      client_id: cl[1].id, freelancer_id: fl[0].id,
      amount: 5200, deadline: day(-4), status: 'completed',
      completed_at: ts(-2),
    },
    // Completed: Isabel → Stellar blog
    {
      job_id: jobs[2].id, bid_id: bids[1].id,
      client_id: cl[3].id, freelancer_id: fl[1].id,
      amount: 3600, deadline: day(-2), status: 'completed',
      completed_at: ts(-1),
    },
    // Completed (post-dispute): Dmitri → Stellar video
    {
      job_id: jobs[4].id, bid_id: bids[2].id,
      client_id: cl[3].id, freelancer_id: fl[2].id,
      amount: 2800, deadline: day(-6), status: 'completed',
      completed_at: ts(-1),
    },
    // In progress: Sarah → TechNova Next.js
    {
      job_id: jobs[8].id, bid_id: bids[3].id,
      client_id: technova.id, freelancer_id: sarah.id,
      amount: 3400, deadline: day(12), status: 'active',
    },
    // Active: Aisha → Maven Google Ads
    {
      job_id: jobs[6].id, bid_id: bids[4].id,
      client_id: cl[2].id, freelancer_id: fl[3].id,
      amount: 3200, deadline: day(10), status: 'active',
    },
  ]).returning('*');

  // ── ORDERS ─────────────────────────────────────────────────────────────────
  const orders = await knex('orders').insert([
    // Completed: Noah pen test
    {
      contract_id: contracts[0].id, job_id: jobs[0].id, bid_id: bids[0].id,
      client_id: cl[1].id, freelancer_id: fl[0].id,
      status: 'completed', amount: 5200,
      platform_fee: fee(5200), freelancer_payout: 5200 - fee(5200),
      escrow_status: 'released', deadline: day(-4),
      started_at: ts(-18), delivered_at: ts(-5), completed_at: ts(-2),
    },
    // Completed: Isabel blog
    {
      contract_id: contracts[1].id, job_id: jobs[2].id, bid_id: bids[1].id,
      client_id: cl[3].id, freelancer_id: fl[1].id,
      status: 'completed', amount: 3600,
      platform_fee: fee(3600), freelancer_payout: 3600 - fee(3600),
      escrow_status: 'released', deadline: day(-2),
      started_at: ts(-28), delivered_at: ts(-3), completed_at: ts(-1),
    },
    // Completed after dispute: Dmitri video
    {
      contract_id: contracts[2].id, job_id: jobs[4].id, bid_id: bids[2].id,
      client_id: cl[3].id, freelancer_id: fl[2].id,
      status: 'completed', amount: 2800,
      platform_fee: fee(2800), freelancer_payout: 2800 - fee(2800),
      escrow_status: 'released', deadline: day(-6),
      started_at: ts(-16), delivered_at: ts(-8), completed_at: ts(-1),
    },
    // In progress: Sarah Next.js
    {
      contract_id: contracts[3].id, job_id: jobs[8].id, bid_id: bids[3].id,
      client_id: technova.id, freelancer_id: sarah.id,
      status: 'in_progress', amount: 3400,
      platform_fee: fee(3400), freelancer_payout: 3400 - fee(3400),
      escrow_status: 'held', deadline: day(12),
      started_at: ts(-6),
    },
    // Delivered: Aisha Google Ads
    {
      contract_id: contracts[4].id, job_id: jobs[6].id, bid_id: bids[4].id,
      client_id: cl[2].id, freelancer_id: fl[3].id,
      status: 'delivered', amount: 3200,
      platform_fee: fee(3200), freelancer_payout: 3200 - fee(3200),
      escrow_status: 'held', deadline: day(10),
      started_at: ts(-12), delivered_at: ts(-1),
    },
  ]).returning('*');

  // Back-fill contract.order_id
  await Promise.all(
    orders.map((o, i) => knex('contracts').where({ id: contracts[i].id }).update({ order_id: o.id }))
  );

  // ── DELIVERIES ─────────────────────────────────────────────────────────────
  const deliveries = await knex('deliveries').insert([
    // Noah pen test delivery (approved)
    {
      order_id: orders[0].id, submitted_by: fl[0].id,
      message: `Penetration test complete. I found 2 Critical, 4 High, 6 Medium, and 9 Low/Informational findings. The full report is attached along with the executive summary and proof-of-concept scripts. The two Critical issues (unauthenticated IDOR on the /api/invoices endpoint and a stored XSS in the supplier notes field) should be addressed before the next production release. Please let me know when your team has applied the patches and I will schedule the re-test.`,
      is_revision: false, revision_number: 0, status: 'approved',
      reviewed_at: ts(-2),
    },
    // Isabel blog delivery (approved)
    {
      order_id: orders[1].id, submitted_by: fl[1].id,
      message: `All 10 articles delivered. Each is in a separate Markdown file, named by the target keyword. I have included the meta description and suggested H1/H2 structure in the front matter of each file. The content calendar showing recommended publish dates and internal link targets is in the spreadsheet. One article (supplier-catalogue-management-best-practices.md) ended up at 3,100 words because the brief had more depth to cover — no extra charge. Let me know if any sections need adjusting after your subject-matter expert reviews them.`,
      is_revision: false, revision_number: 0, status: 'approved',
      reviewed_at: ts(-1),
    },
    // Dmitri video — initial delivery (led to dispute)
    {
      order_id: orders[2].id, submitted_by: fl[2].id,
      message: `First delivery of the 90-second explainer. The 1080p MP4, 30-second cut, and SRT captions are attached. The 4K ProRes master and all After Effects project files are in the Google Drive folder linked below. I followed the script exactly and matched the brand guide on colours and typography. The looping teaser will be ready within 24 hours. Please review and let me know your thoughts — I am available for a call if it is easier to discuss feedback live.`,
      is_revision: false, revision_number: 0, status: 'rejected',
      reviewed_at: ts(-8),
      rejection_feedback: 'The pacing in the middle section feels rushed and the product UI screenshots are blurry in the 30-second cut. We are not satisfied this meets the brief.',
    },
    // Dmitri video — revision delivery (approved, led to dispute resolution)
    {
      order_id: orders[2].id, submitted_by: fl[2].id,
      message: `Revised delivery addressing the feedback. I have re-paced the middle section (added 8 seconds to the problem statement sequence and trimmed the intro to compensate), re-exported all UI screenshots at 2x resolution and composited them frame-accurately in the 30-second cut, and delivered the looping teaser. The 4K ProRes and AE project files are updated in the same Drive folder. I believe this fully addresses the brief — the UI is crisp across all deliverables and the pacing now allows the three value propositions to land properly.`,
      is_revision: true, revision_number: 1, status: 'approved',
      reviewed_at: ts(-1),
    },
    // Aisha Google Ads delivery (pending review)
    {
      order_id: orders[4].id, submitted_by: fl[3].id,
      message: `Account setup is complete and live. The Google Ads account is now running with 3 campaigns (Search — branded exclusion, Search — competitor terms, Display Remarketing), 11 ad groups, and 42 RSAs. Conversion tracking is firing correctly — I have verified demo request, trial signup, and pricing page scroll depth in GTM Preview. Quality scores are averaging 7.2 across active ad groups (target was 7+). The full campaign structure doc, keyword list with intent labels, and month-1 performance forecast are attached. I recommend a brief call in week 2 to review early data before I make bid adjustments.`,
      is_revision: false, revision_number: 0, status: 'pending',
    },
  ]).returning('*');

  // ── DELIVERY ATTACHMENTS ───────────────────────────────────────────────────
  await knex('delivery_attachments').insert([
    // Noah pen test report
    { delivery_id: deliveries[0].id, filename: 'apex-webapp-pentest-report-v2.pdf',           url: 'https://drive.google.com/file/d/apex-report-2026/view',         size_bytes: 2847362,  mime_type: 'application/pdf' },
    { delivery_id: deliveries[0].id, filename: 'executive-summary-apex-2026.pdf',             url: 'https://drive.google.com/file/d/apex-exec-summary/view',        size_bytes: 421890,   mime_type: 'application/pdf' },
    { delivery_id: deliveries[0].id, filename: 'idor-poc-invoice-endpoint.py',                url: 'https://gist.github.com/noahpark/idor-poc-invoice',             size_bytes: 3420,     mime_type: 'text/x-python' },
    { delivery_id: deliveries[0].id, filename: 'xss-poc-supplier-notes.html',                 url: 'https://gist.github.com/noahpark/xss-poc-supplier',             size_bytes: 1840,     mime_type: 'text/html' },
    // Isabel blog articles
    { delivery_id: deliveries[1].id, filename: 'stellar-commerce-10-articles.zip',            url: 'https://drive.google.com/file/d/stellar-articles-2026/view',    size_bytes: 184320,   mime_type: 'application/zip' },
    { delivery_id: deliveries[1].id, filename: 'content-calendar-q2-2026.xlsx',               url: 'https://drive.google.com/file/d/stellar-calendar-2026/view',    size_bytes: 42600,    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    // Dmitri video revision (final)
    { delivery_id: deliveries[3].id, filename: 'stellar-explainer-final-1080p.mp4',           url: 'https://drive.google.com/file/d/stellar-explainer-1080p/view',  size_bytes: 182400000, mime_type: 'video/mp4' },
    { delivery_id: deliveries[3].id, filename: 'stellar-explainer-30s-cut.mp4',               url: 'https://drive.google.com/file/d/stellar-explainer-30s/view',    size_bytes: 61000000,  mime_type: 'video/mp4' },
    { delivery_id: deliveries[3].id, filename: 'stellar-explainer-captions.srt',              url: 'https://drive.google.com/file/d/stellar-captions/view',         size_bytes: 4200,     mime_type: 'text/plain' },
    { delivery_id: deliveries[3].id, filename: 'stellar-explainer-ae-project.zip',            url: 'https://drive.google.com/file/d/stellar-ae-project/view',       size_bytes: 540000000, mime_type: 'application/zip' },
    // Aisha Google Ads
    { delivery_id: deliveries[4].id, filename: 'maven-gads-campaign-structure-doc.pdf',       url: 'https://drive.google.com/file/d/maven-gads-structure/view',     size_bytes: 1240000,  mime_type: 'application/pdf' },
    { delivery_id: deliveries[4].id, filename: 'maven-keyword-list-with-intent.xlsx',         url: 'https://drive.google.com/file/d/maven-keywords/view',           size_bytes: 98200,    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { delivery_id: deliveries[4].id, filename: 'maven-month1-performance-forecast.pdf',       url: 'https://drive.google.com/file/d/maven-forecast/view',           size_bytes: 340000,   mime_type: 'application/pdf' },
  ]);

  // ── DISPUTE (Stellar Commerce vs Dmitri Volkov) ────────────────────────────
  const [disputeRow] = await knex('disputes').insert([
    {
      order_id: orders[2].id,
      contract_id: contracts[2].id,
      opened_by: cl[3].id,        // Stellar Commerce
      respondent_id: fl[2].id,    // Dmitri
      reason: 'quality_issues',
      description: `The delivered explainer video does not meet the brief. The pacing in the middle section (the three-problems sequence) moves too fast for a business audience — our sales team has confirmed this in internal reviews. Additionally, the UI screenshots used in the 30-second cut are visibly blurry when presented on a 1080p screen, which is the primary environment where this ad will be shown. We specified "clean, business-forward" visual language in the brief. The current cut also uses a font weight we did not approve. We are withholding approval and requesting a full revision or a partial refund.`,
      status: 'resolved',
      resolution: 'release_to_freelancer',
      resolved_by: admin?.id,
      resolved_at: ts(-1),
      resolution_note: `After reviewing the original brief, both deliveries, and the freelancer's revision, we find that Dmitri's initial delivery closely followed the provided script and brand guide. The client's objections (pacing, screenshot resolution, font weight) are subjective interpretation differences rather than clear contractual violations. The revision delivery (v2) addressed all specific feedback raised — the UI screenshots were re-exported at 2x resolution and the pacing was extended. The font weight used (Regular 400) is within the brand guide's specified range. We are releasing the full escrow balance to the freelancer. The client may engage Dmitri for additional revisions under a new brief if required.`,
      split_client_pct: null,
      respondent_deadline: ts(-10),
    },
  ]).returning('*');

  // Link dispute to order
  await knex('orders').where({ id: orders[2].id }).update({ dispute_id: disputeRow.id });

  // ── REVIEWS ────────────────────────────────────────────────────────────────
  await knex('reviews').insert([
    // Apex reviews Noah
    {
      contract_id: contracts[0].id,
      reviewer_id: cl[1].id, reviewee_id: fl[0].id,
      rating: 5,
      comment: `Noah delivered the most thorough penetration test report I have seen in this price range. The CVSS scores were accurate, the PoC steps reproducible, and the executive summary was genuinely readable by our non-technical client. He identified a Critical IDOR issue our previous audit missed completely. The re-test turnaround was fast. Already booked him for our next assessment.`,
    },
    // Noah reviews Apex
    {
      contract_id: contracts[0].id,
      reviewer_id: fl[0].id, reviewee_id: cl[1].id,
      rating: 5,
      comment: `Excellent engagement. The application was well-documented, the dev team was responsive to clarification questions, and the NDA process was handled quickly. Apex paid in full within 24 hours of final delivery. Exactly the kind of professional client that makes this work enjoyable. Would take another engagement immediately.`,
    },
    // Stellar reviews Isabel
    {
      contract_id: contracts[1].id,
      reviewer_id: cl[3].id, reviewee_id: fl[1].id,
      rating: 5,
      comment: `Isabel's writing is the real deal for B2B. Every article reads like it was written by someone who has actually worked in procurement operations, not someone who read three blog posts about it. All 10 articles were delivered on time and required minimal edits. Two are already ranking on page 2 after just three weeks live — I expect them to move. We are commissioning another 10 immediately.`,
    },
    // Isabel reviews Stellar
    {
      contract_id: contracts[1].id,
      reviewer_id: fl[1].id, reviewee_id: cl[3].id,
      rating: 4,
      comment: `Good client with a clear content brief and strong subject matter knowledge to draw from. Feedback was specific and fast. One article brief needed significant clarification (the scope had been underspecified in the original brief), but once we aligned on the angle it went smoothly. Payment was prompt. Would work with Stellar again.`,
    },
    // Stellar reviews Dmitri (post-dispute — fair rating given the process)
    {
      contract_id: contracts[2].id,
      reviewer_id: cl[3].id, reviewee_id: fl[2].id,
      rating: 3,
      comment: `Final video is solid and meets the brief after a revision and a dispute resolution process. The quality of the revision was good — the pacing issue was fixed properly and the UI assets are crisp. My frustration was with the initial delivery, which missed the mark on two specific items we had discussed. Dmitri is clearly skilled but should be more careful about delivery quality before submission. The finished product is something we can use, and the AE source files are clean.`,
    },
    // Dmitri reviews Stellar (post-dispute)
    {
      contract_id: contracts[2].id,
      reviewer_id: fl[2].id, reviewee_id: cl[3].id,
      rating: 3,
      comment: `Technically competent client who knew what they wanted, but the feedback process was difficult. The initial rejection was based on subjective preferences that were not clearly defined in the original brief. I provided a full revision and the dispute was resolved in my favour. The final output is strong and I am proud of it. Future clients should be more specific about pacing expectations upfront — vague terms like "business-forward" need concrete examples.`,
    },
    // Retrospective reviews for existing completed contracts (not already reviewed)
    // TechNova reviewing Sarah on new job (she was already reviewed in 04_professional_data)
    // so let's add reviews for the data from 04 that might be missing order records
    // Add platform-level review quality for Noah from a past client (not seeded here, so skip)
  ]);

  // ── TRUST STATS UPDATE ─────────────────────────────────────────────────────
  // Set realistic trust stats on all freelancers so profile pages look real
  const trustUpdates = [
    { email: 'sarah.chen@skyjobs.dev',    jobs_completed: 22, trust_score: 96, trust_level: 'top',      rating_avg: 4.9, rating_count: 19, total_earned: 48200,  is_verified: true,  profile_complete_score: 98 },
    { email: 'marcus.webb@skyjobs.dev',   jobs_completed: 14, trust_score: 88, trust_level: 'trusted',  rating_avg: 4.7, rating_count: 12, total_earned: 29800,  is_verified: true,  profile_complete_score: 92 },
    { email: 'priya.sharma@skyjobs.dev',  jobs_completed: 28, trust_score: 98, trust_level: 'top',      rating_avg: 4.9, rating_count: 26, total_earned: 62400,  is_verified: true,  profile_complete_score: 100 },
    { email: 'alex.rod@skyjobs.dev',      jobs_completed: 11, trust_score: 91, trust_level: 'trusted',  rating_avg: 4.8, rating_count: 10, total_earned: 74600,  is_verified: true,  profile_complete_score: 95 },
    { email: 'jordan.kim@skyjobs.dev',    jobs_completed: 16, trust_score: 87, trust_level: 'trusted',  rating_avg: 4.6, rating_count: 15, total_earned: 31500,  is_verified: false, profile_complete_score: 88 },
    { email: 'lena.horvat@skyjobs.dev',   jobs_completed: 34, trust_score: 93, trust_level: 'top',      rating_avg: 4.8, rating_count: 31, total_earned: 44100,  is_verified: true,  profile_complete_score: 96 },
    { email: 'noah.park@skyjobs.dev',     jobs_completed: 8,  trust_score: 94, trust_level: 'trusted',  rating_avg: 4.9, rating_count: 7,  total_earned: 38400,  is_verified: true,  profile_complete_score: 97 },
    { email: 'isabel.ferreira@skyjobs.dev', jobs_completed: 19, trust_score: 89, trust_level: 'trusted', rating_avg: 4.7, rating_count: 17, total_earned: 24600, is_verified: false, profile_complete_score: 91 },
    { email: 'dmitri.volkov@skyjobs.dev', jobs_completed: 12, trust_score: 72, trust_level: 'verified', rating_avg: 4.1, rating_count: 10, total_earned: 28900,  is_verified: true,  profile_complete_score: 90 },
    { email: 'aisha.ok@skyjobs.dev',      jobs_completed: 9,  trust_score: 85, trust_level: 'trusted',  rating_avg: 4.5, rating_count: 8,  total_earned: 19200,  is_verified: false, profile_complete_score: 86 },
  ];

  await Promise.all(
    trustUpdates.map(({ email, ...vals }) =>
      knex('users').where({ email }).update(vals)
    )
  );
};
