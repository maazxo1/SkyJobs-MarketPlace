exports.seed = async (knex) => {
  // Skip if categories already exist (avoids FK conflict if jobs are present)
  const count = await knex('categories').count('id as n').first();
  if (Number(count.n) > 0) return;

  await knex('categories').insert([
    { name: 'Web Development', slug: 'web-development' },
    { name: 'Mobile Development', slug: 'mobile-development' },
    { name: 'Graphic Design', slug: 'graphic-design' },
    { name: 'Writing & Content', slug: 'writing-content' },
    { name: 'Data Science & AI', slug: 'data-science-ai' },
    { name: 'Digital Marketing', slug: 'digital-marketing' },
    { name: 'Video & Animation', slug: 'video-animation' },
    { name: 'UI/UX Design', slug: 'ui-ux-design' },
    { name: 'Cybersecurity', slug: 'cybersecurity' },
    { name: 'DevOps & Cloud', slug: 'devops-cloud' },
  ]);
};
