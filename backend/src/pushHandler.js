// src/pushHandler.js

const { Octokit } = require('@octokit/rest');
const { analyzeCommitWithAI, generatePatchesWithAI } = require('./securityAnalysis');
const { analysisStore } = require('./store');

// إعدادات أساسية
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
  request: { timeout: 60000 },
  userAgent: 'auto-patch-bot',
});

const SECURITY_THRESHOLD = Number(process.env.SECURITY_THRESHOLD || 80);
const BOT_BRANCH = 'auto-patch'; // تعريف اسم فرع البوت في مكان واحد
let isSyncing = false;

// ==================================================================
// ✅ Helper: توحيد اسم المؤلف لتفادي ظهور نفس الشخص باسمين (MalakAbed / Malak Abed)
// ==================================================================
function normalizeAuthorName(name) {
  if (!name) return 'Unknown';
  // يشيل المسافات ويوحد الشكل
  return String(name).trim().replace(/\s+/g, '');
}

// ==================================================================
// 1. الدوال الرئيسية التي يتم تصديرها (واجهة الملف)
// ==================================================================

/**
 * الدالة التي يستدعيها Webhook عند حدوث push.
 */
async function handlePushEvent(payload) {
  // الحل الحاسم: تجاهل أي دفعات (pushes) يقوم بها البوت بنفسه
  if (payload.ref && payload.ref.includes(BOT_BRANCH)) {
    console.log(`[Webhook] Ignoring push event on bot branch '${BOT_BRANCH}'.`);
    return;
  }

  if (isSyncing) {
    console.log('[Webhook] Sync is in progress, skipping push event to avoid conflict.');
    return;
  }

  const repoFullName = payload.repository.full_name;
  const [owner, repo] = repoFullName.split('/');
  const commits = payload.commits || [];

  // عالج الكوميتات القادمة من الـ webhook بالتتابع
  for (const commit of commits) {
    // تجاهل الكوميتات التي هي جزء من merge وليست تغييرات مباشرة
    if (commit.distinct === false) continue;
    await processCommitAndApplyFixes(owner, repo, commit.id, payload.repository.default_branch);
  }
}

/**
 * الدالة التي تستدعيها واجهة المزامنة (Sync).
 */
async function syncRepoCommits(owner, repo) {
  if (isSyncing) {
    throw new Error('A sync process is already running.');
  }

  try {
    isSyncing = true;
    console.log(`[Sync] Started for ${owner}/${repo}...`);

    const { data: remoteCommits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: 20,
    });

    const newCommits = [];
    for (const c of remoteCommits) {
      const exists = await analysisStore.hasCommit(c.sha);
      if (!exists) {
        newCommits.push(c);
      }
    }

    if (newCommits.length === 0) {
      console.log('[Sync] No new commits to process.');
      return;
    }

    console.log(`[Sync] Found ${newCommits.length} new commits. Processing sequentially...`);

    const repoData = await octokit.repos.get({ owner, repo });
    const baseBranch = repoData.data.default_branch;

    // عالج الكوميتات بالتتابع لتجنب أي حالة سباق
    for (const c of newCommits) {
      await processCommitAndApplyFixes(owner, repo, c.sha, baseBranch);
    }

    console.log(`[Sync] Finished processing all commits for ${owner}/${repo}.`);

  } catch (error) {
    console.error('[Sync] An error occurred during the sync process:', error);
    throw error;
  } finally {
    isSyncing = false;
    console.log('[Sync] Lock released.');
  }
}

// ==================================================================
// 2. دالة المعالجة الموحدة (قلب المنطق)
// ==================================================================

/**
 * هذه هي الدالة الموحدة التي تعالج أي كوميت.
 * تقوم بالتحليل، ثم تقرر ما إذا كانت ستنشئ PR.
 */
async function processCommitAndApplyFixes(owner, repo, commitId, defaultBranch) {
  const analysis = await analyzeSingleCommit(owner, repo, commitId);

  console.log(`[Decision] score=${analysis?.overallScore}, threshold=${SECURITY_THRESHOLD}, patches=${analysis?.patches?.length || 0}`);

  if (analysis && analysis.overallScore < SECURITY_THRESHOLD && analysis.patches.length > 0) {
    console.log(`[Action] Score for ${commitId.slice(0, 7)} is ${analysis.overallScore}. Triggering PR process.`);
    await resetBranch(owner, repo, BOT_BRANCH, defaultBranch);
    await applyFixesAndCreatePR(owner, repo, defaultBranch, analysis);
  }
}

// ==================================================================
// 3. الدوال المساعدة (الأدوات)
// ==================================================================

/**
 * يحلل كوميت واحد ويخزن النتيجة في قاعدة البيانات.
 * هو المصدر الوحيد لمعلومات المؤلف.
 */
async function analyzeSingleCommit(owner, repo, commitId) {
  try {
    const exists = await analysisStore.hasCommit(commitId);
    if (exists) {
      console.log(`[Analysis] Commit ${commitId.slice(0, 7)} already analyzed. Skipping.`);
      return null;
    }

    const { data: commitData } = await octokit.repos.getCommit({ owner, repo, ref: commitId });

    // ✅ المصدر الوحيد للمؤلف: من بيانات الكوميت الرسمية + توحيد الاسم
    const authorRaw =
      commitData.author?.login ||
      commitData.commit?.author?.name ||
      'Unknown';

    const realAuthor = {
      name: normalizeAuthorName(authorRaw),
      avatar_url: commitData.author ? commitData.author.avatar_url : null
    };

    console.log(`[Analysis] Processing new commit: ${commitId.slice(0, 7)} by ${realAuthor.name}`);

    if (!commitData || !commitData.files || !Array.isArray(commitData.files)) {
      console.log(`[Analysis] Commit ${commitId.slice(0, 7)} is likely a merge commit or has no file changes. Skipping.`);
      return null;
    }

    const filesMeta = commitData.files.filter(f => f.status !== 'removed');
    if (filesMeta.length === 0) return null;

    const filePromises = filesMeta.map(f =>
      octokit.repos.getContent({ owner, repo, path: f.filename, ref: commitId })
    );
    const fileResponses = await Promise.all(filePromises);

    const files = fileResponses.map((res, i) => ({
      path: filesMeta[i].filename,
      content: Buffer.from(res.data.content, 'base64').toString('utf8'),
    }));

    if (files.length === 0) return null;

    const analysis = await analyzeCommitWithAI({ owner, repo, commitId, files, author: realAuthor });

    // لو في مشاكل والسكور منخفض بس ما طلع patches من التحليل الأول… جرّبي توليد patches بشكل منفصل
    if (analysis.overallScore < SECURITY_THRESHOLD && (!analysis.patches || analysis.patches.length === 0)) {
      const jsFiles = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.ts'));
      if (jsFiles.length > 0 && analysis.issues && analysis.issues.length > 0) {
        analysis.patches = await generatePatchesWithAI({
          owner, repo, commitId,
          files: jsFiles,
          issues: analysis.issues,
        });
      }
    }

    // ✅ تأكيد تخزين الاسم الموحد
    analysis.authorName = realAuthor.name;
    analysis.authorAvatar = realAuthor.avatar_url;

    analysis.hasJavaScript = files.some(f => f.path.endsWith('.js'));

    await analysisStore.add(analysis);
    console.log(`[Analysis] Commit ${commitId.slice(0, 7)} analyzed. Score: ${analysis.overallScore}`);
    return analysis;

  } catch (err) {
    console.error(`[Analysis-CRITICAL] Failed to analyze commit ${commitId.slice(0, 7)}:`, err.message);
    return null;
  }
}

/**
 * يعيد تعيين فرع البوت ليكون مطابقاً للفرع الأساسي.
 */
async function resetBranch(owner, repo, branchName, baseBranch) {
  console.log(`[Git] Resetting branch '${branchName}' to match '${baseBranch}'...`);
  const { data: baseRef } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
  try {
    await octokit.git.updateRef({ owner, repo, ref: `heads/${branchName}`, sha: baseRef.object.sha, force: true });
    console.log(`[Git] Branch reset complete.`);
  } catch (error) {
    if (error.status === 404 || error.status === 422) {
      await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: baseRef.object.sha });
      console.log(`[Git] Branch did not exist. Created now.`);
    } else {
      throw error;
    }
  }
}

/**
 * يطبق التعديلات وينشئ أو يحدّث طلب السحب (PR).
 */
async function applyFixesAndCreatePR(owner, repo, baseBranch, analysis) {
  try {
    console.log(`[PR] Applying patches for commit ${analysis.commitId.slice(0, 7)}...`);
    for (const patch of analysis.patches) {
      let currentSha;
      try {
        const { data: content } = await octokit.repos.getContent({ owner, repo, path: patch.filePath, ref: BOT_BRANCH });
        currentSha = content.sha;
      } catch (e) {
        if (e.status !== 404) throw e;
      }

      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: patch.filePath,
        message: `[AutoPatch] Fix: ${patch.filePath} (from commit ${analysis.commitId.slice(0, 7)})`,
        content: Buffer.from(patch.patchedContent, "utf8").toString("base64"),
        branch: BOT_BRANCH,
        sha: currentSha,
      });
    }

    const { data: existingPRs } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
      head: `${owner}:${BOT_BRANCH}`
    });

    if (existingPRs.length > 0) {
      console.log(`[PR] Existing PR #${existingPRs[0].number} updated.`);
      await analysisStore.attachPr(analysis.commitId, existingPRs[0].html_url);
      return existingPRs[0].html_url;
    }

    const { data: newPR } = await octokit.pulls.create({
      owner,
      repo,
      title: `[Auto-Patch] Automated Security Fixes`,
      head: BOT_BRANCH,
      base: baseBranch,
      body: `
    This pull request was automatically generated by **Auto-Patch**.

    - **Repository:** ${owner}/${repo}
    - **Original commit:** ${analysis.commitId}
    - **Overall security score:** ${analysis.overallScore} / 100

    ### Detected issues
    ${analysis.issues.map(issue =>
      `- **[${issue.severity}]** ${issue.message} in \`${issue.file}\` (line ${issue.line})`
    ).join('\n')}

    ---

    Please review the proposed changes carefully before merging this pull request.
      `.trim(),
    });

    console.log(`[PR] New PR #${newPR.number} created.`);
    await analysisStore.attachPr(analysis.commitId, newPR.html_url);
    return newPR.html_url;
  } catch (err) {
    console.error(`[PR-CRITICAL] Failed during PR process for commit ${analysis.commitId.slice(0, 7)}:`, err.message);
    return null;
  }
}

// ==================================================================
// 4. تصدير الدوال العامة
// ==================================================================
module.exports = {
  handlePushEvent,
  syncRepoCommits,
};