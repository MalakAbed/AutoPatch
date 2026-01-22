exports.up = async function (knex) {
  console.log('Normalizing author names in analyses table...');

  // احذف كل المسافات (وحتى أي whitespace) من authorName
  await knex.raw(`
    UPDATE "analyses"
    SET "authorName" = regexp_replace("authorName", '\\s+', '', 'g')
    WHERE "authorName" IS NOT NULL;
  `);

  console.log('Author names normalized successfully ✅');
};

exports.down = async function () {
  // ما بنرجّع القيم القديمة لأنها غير معروفة
};