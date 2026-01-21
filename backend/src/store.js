// src/store.js
const knex = require('knex');
const knexConfig = require('../knexfile'); // يفترض أن knexfile.js في المجلد الرئيسي

// إنشاء اتصال بقاعدة البيانات
const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const db = knex(knexConfig[env]);

class AnalysisStore {
  async hasCommit(commitId) {
    const row = await db('analyses').where({ commitId }).first();
    return !!row;
  }

  async add(analysisData) {
    const { issues, ...analysis } = analysisData;

    return db.transaction(async (trx) => {
    const insertedIds = await trx('analyses').insert({
      commitId: analysis.commitId,
      repoFullName: analysis.repoFullName,
      overallScore: analysis.overallScore,
      authorName: analysis.authorName || 'Unknown',
      authorAvatar: analysis.authorAvatar || null,
      prUrl: analysis.prUrl || null,
      // createdAt: new Date().toISOString(),
    });

    // SQLite بيرجع رقم id مباشرة، Postgres بيرجع array ids حسب الإعداد
    const insertedId = Array.isArray(insertedIds) ? insertedIds[0] : insertedIds;

    // هات السجل المُدرج (مضمون يشتغل على SQLite وPostgres)
    const newAnalysis = await trx('analyses').where({ id: insertedId }).first();

      if (issues && issues.length > 0) {
        const issuesToInsert = issues.map(issue => ({
          title: issue.title,
          severity: issue.severity,
          description: issue.description,
          filePath: issue.filePath,
          line: issue.line,
          analysis_id: newAnalysis.id,
        }));
        await trx('issues').insert(issuesToInsert);
      }

      return { ...newAnalysis, issues };
    });
  }

  async attachPr(commitId, prUrl) {
    return db('analyses').where({ commitId }).update({ prUrl });
  }

  async getAll() {
    const analyses = await db('analyses').orderBy('createdAt', 'desc');
    if (analyses.length === 0) return [];

    const analysesIds = analyses.map(a => a.id);
    const issues = await db('issues').whereIn('analysis_id', analysesIds);

    return analyses.map(analysis => ({
      ...analysis,
      issues: issues.filter(issue => issue.analysis_id === analysis.id),
    }));
  }

  async getByUser(username) {
    const analyses = await db('analyses').where({ authorName: username }).orderBy('createdAt', 'desc');
    if (analyses.length === 0) return [];

    const analysesIds = analyses.map(a => a.id);
    const issues = await db('issues').whereIn('analysis_id', analysesIds);

    return analyses.map(analysis => ({
      ...analysis,
      issues: issues.filter(issue => issue.analysis_id === analysis.id),
    }));
  }
}

const analysisStore = new AnalysisStore();
module.exports = { analysisStore };
