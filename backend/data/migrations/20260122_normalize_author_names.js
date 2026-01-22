// backend/data/migrations/20260122_normalize_author_names.js

exports.up = async function (knex) {
  console.log('Normalizing author names in analyses table...');

  await knex('analyses')
    .whereNotNull('authorName')
    .update({
      authorName: knex.raw("REPLACE(authorName, ' ', '')")
    });

  console.log('Author names normalization completed.');
};

exports.down = async function (knex) {
  // لا نرجع التغيير لأن إزالة المسافات غير قابلة للعكس
  console.log('Rollback skipped for author name normalization.');
};