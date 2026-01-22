exports.up = async function (knex) {
  // تنظيف بيانات التحليلات فقط (Demo reset)
  await knex('analyses').del();
};

exports.down = async function () {
  // لا حاجة لإرجاع البيانات
};