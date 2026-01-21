// backend/data/migrations/...._create_tables.js
exports.up = function (knex) {
    return knex.schema
        .createTable('analyses', (table) => {
            table.increments('id').primary();
            table.string('commitId', 40).notNullable().unique();
            table.string('repoFullName').notNullable();
            table.integer('overallScore').notNullable();
            table.string('authorName');
            table.string('authorAvatar');
            table.string('prUrl');
            table.timestamp('createdAt').defaultTo(knex.fn.now());
        })
        .createTable('issues', (table) => {
            table.increments('id').primary();
            table.string('title').notNullable();
            table.string('severity').notNullable();
            table.text('description');
            table.string('filePath');
            table.integer('line');
            table.integer('analysis_id').unsigned().notNullable().references('id').inTable('analyses').onDelete('CASCADE').onUpdate('CASCADE');
        });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('issues').dropTableIfExists('analyses');
};
