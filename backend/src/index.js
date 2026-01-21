// src/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// استيراد وحدات التطبيق
const { githubWebhookRouter } = require('./githubWebhook');
const { analysisStore } = require('./store'); // يعتمد على store.js المحدث
const { syncRepoCommits } = require('./pushHandler'); // سنستخدم الدالة من هنا
const { generateUserSecurityReport } = require('./securityAnalysis');

const app = express();
const PORT = process.env.PORT || 4000;

// ==================================================================
// Middlewares - الترتيب هنا مهم جداً

// 1. يجب وضع webhook router أولاً.
//    هذا المسار يحتاج إلى قراءة الطلب كبيانات خام (Buffer) للتحقق من التوقيع،
//    لذلك يجب أن يعمل قبل express.json().
app.use('/webhook', githubWebhookRouter);

// 2. الآن يمكننا استخدام Middlewares عامة لباقي المسارات.
//    express.json() سيقوم بتحليل الطلبات القادمة إلى /api/* وتحويلها إلى كائنات JSON.
app.use(cors());
app.use(express.json());


// مسارات الـ API

app.get('/api/analyses', async (req, res) => {
  try {
    const data = await analysisStore.getAll();
    res.json(data);
  } catch (err) {
    console.error("Error fetching analyses:", err);
    res.status(500).json({ error: "Failed to fetch analyses" });
  }
});

app.post('/api/sync', async (req, res) => {
  const { owner, repo } = req.body;
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Missing owner or repo' });
  }
  try {
    console.log(`Starting sync for ${owner}/${repo}...`);
    await syncRepoCommits(owner, repo);
    res.json({ message: `Sync completed for ${owner}/${repo}` });
  } catch (err) {
    console.error(`Error during sync for ${owner}/${repo}:`, err);
    // أرجع خطأ 503 إذا كانت المزامنة مشغولة بالفعل
    if (err.message.includes('already running')) {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user-report', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  try {
    const analyses = await analysisStore.getByUser(username);
    if (analyses.length === 0) {
      return res.json({
        success: true,
        data: {
          username,
          commitsCount: 0,
          avgScore: 0,
          report: { summary: 'No commits analyzed for this user yet.' }
        }
      });
    }

    // ===>  الحل هنا: حساب الإحصائيات <===
    const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const issueTypes = {};

    // المرور على كل تحليل، ثم على كل مشكلة داخل التحليل
    for (const analysis of analyses) {
      if (analysis.issues && Array.isArray(analysis.issues)) {
        for (const issue of analysis.issues) {
          // حساب توزيع الخطورة
          const severity = (issue.severity || 'info').toLowerCase();
          if (severityBreakdown.hasOwnProperty(severity)) {
            severityBreakdown[severity]++;
          }

          // حساب أنواع المشاكل الأكثر شيوعاً
          const issueTitle = issue.title || 'Uncategorized Issue';
          issueTypes[issueTitle] = (issueTypes[issueTitle] || 0) + 1;
        }
      }
    }

    // استدعاء دالة إنشاء التقرير مع البيانات الكاملة
    const report = await generateUserSecurityReport({
      username,
      commitsCount: analyses.length,
      avgScore: Math.round(analyses.reduce((s, a) => s + a.overallScore, 0) / analyses.length),
      severityBreakdown, // مرر الكائن المحسوب
      issueTypes,        // مرر الكائن المحسوب
    });

    res.json(report);

  } catch (err) {
    console.error(`Error generating report for ${username}:`, err);
    res.status(500).json({ error: "Failed to generate user report" });
  }
});

// ==================================================================
// خدمة الواجهة الأمامية (يجب أن يكون في النهاية)
// ==================================================================
app.use('/', express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // ملاحظة: لقد أزلت initDb() من هنا لأنه يجب أن يتم استدعاؤه
  // بواسطة knex migrate بدلاً من الكود. إذا كنت لا تزال تحتاجه،
  // يمكنك إضافته مرة أخرى.
});
