const crypto = require('crypto');

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function analyzeCommitWithAI({ owner, repo, commitId, files, author }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const payload = {
    repository: `${owner}/${repo}`,
    commitId,
    files: files.map(f => ({
      path: f.path,
      content: f.content.slice(0, 4000)
    }))
  };

  let parsed = {};
  try {
    const aiResponse = await callOpenAI(buildPrompt(payload));
    parsed = safeParseJson(aiResponse);
  } catch (err) {
    console.error(err.message);
  }

  return {
    id,
    createdAt,
    repoFullName: `${owner}/${repo}`,
    commitId,
    authorName: author?.name || 'Unknown',
    authorAvatar: author?.avatar_url || null,
    overallScore: clampNumber(parsed.overall_score, 0, 100, 60),
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    patches: Array.isArray(parsed.patches) ? parsed.patches : [],
    rawModelOutput: parsed
  };
}


// ✅ دالة جديدة لتوليد تقرير أمني للمستخدم
async function generateUserSecurityReport(data) {
  const { username, commitsCount, avgScore, severityBreakdown, issueTypes } = data;

  const prompt = `
You are a security report generator. Generate a professional security report summary based on the following data:

- Username: ${username}
- Total Commits Analyzed: ${commitsCount}
- Average Security Score: ${avgScore}/100
- Issue Severity Breakdown: ${JSON.stringify(severityBreakdown)}
- Most Common Issue Types: ${JSON.stringify(issueTypes)}

Generate a JSON response with this structure:
{
  "title": "Security Report for [username]",
  "summary": "A brief 2-3 sentence summary of the security posture",
  "riskLevel": "low|medium|high|critical",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "topIssues": ["issue 1", "issue 2", "issue 3"],
  "generatedAt": "${new Date().toISOString()}"
}

Respond with JSON only, no markdown.
`.trim();

  try {
    const aiResponse = await callOpenAI(prompt);
    const parsed = safeParseJson(aiResponse);

    return {
      success: true,
      data: {
        username,
        commitsCount,
        avgScore,
        report: parsed,
      },
    };
  } catch (err) {
    console.error('Failed to generate security report:', err.message);

    // ✅ إرجاع تقرير افتراضي في حالة الفشل
    return {
      success: true,
      data: {
        username,
        commitsCount,
        avgScore,
        report: {
          title: `Security Report for ${username}`,
          summary: `Analyzed ${commitsCount} commits with an average security score of ${avgScore}/100.`,
          riskLevel: avgScore >= 80 ? 'low' : avgScore >= 60 ? 'medium' : 'high',
          recommendations: [
            'Review and fix high-severity issues immediately',
            'Implement security best practices in code reviews',
            'Keep dependencies updated and monitor for vulnerabilities',
          ],
          topIssues: Object.keys(issueTypes).slice(0, 3),
          generatedAt: new Date().toISOString(),
        },
      },
    };
  }
}

function buildPrompt(payload) {
  return `
You are an expert Node.js application security reviewer.

You will receive a JSON object with metadata about a commit and a list of changed files.
Each file has a "path" and "content" string (up to ~4000 characters).

Your job is to:
1. Analyze the code for security vulnerabilities and risky patterns.
2. Produce a numeric overall security score from 0 to 100 (higher is more secure).
3. List concrete issues found.
4. For each issue that can be automatically fixed, produce a fully patched file.

RETURN ONLY A SINGLE JSON OBJECT, with this exact shape:

{
  "overall_score": 0-100 number,
  "issues": [
    {
      "title": "short issue summary",
      "severity": "low|medium|high|critical",
      "description": "one or two sentences describing the vulnerability",
      "filePath": "path/to/file.js",
      "line": 123
    }
  ],
  "patches": [
    {
      "filePath": "path/to/file.js",
      "patchedContent": "FULL new content of the file after applying all security fixes"
    }
  ]
}

Important rules:
- The patches array may be empty if no automatic fix is safe.
- patchedContent must be the full file, not a diff.
- Make sure patchedContent is valid JavaScript/TypeScript where applicable.
- Respond with JSON only, no markdown, no comments.

Here is the commit to analyze:

${JSON.stringify(payload, null, 2)}
`.trim();
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a strict JSON-only responder.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  return content;
}

function safeParseJson(text) {
  if (!text) return {};
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return {};
  }
  const jsonSubstring = text.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonSubstring);
  } catch (err) {
    console.error('Failed to parse JSON from model:', err.message);
    return {};
  }
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return Math.min(max, Math.max(min, num));
  }
  return fallback;
}

module.exports = {
  analyzeCommitWithAI,
  generateUserSecurityReport,
};