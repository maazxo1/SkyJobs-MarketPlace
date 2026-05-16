const router = require('express').Router();
const db = require('../config/database');
const { success } = require('../utils/response');

const DEFAULT_CATEGORIES = [
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
];

router.get('/', async (req, res, next) => {
  try {
    let categories = await db('categories').select('*').orderBy('name');
    if (categories.length === 0) {
      await db('categories').insert(DEFAULT_CATEGORIES);
      categories = await db('categories').select('*').orderBy('name');
    }
    return success(res, categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
