const express = require('express');
const crypto = require('crypto');
const { handlePushEvent } = require('./pushHandler');

const router = express.Router();

// Raw body parser ONLY for this router so we can verify GitHub signatures
router.use('/github', express.raw({ type: 'application/json' }));

router.post('/github', async (req, res) => {
  const signature = req.get('X-Hub-Signature-256');
  const event = req.get('X-GitHub-Event');
  const delivery = req.get('X-GitHub-Delivery');

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not set');
    return res.status(500).send('Server misconfiguration');
  }

  const payload = req.body; // Buffer
  const isValid = verifySignature(secret, payload, signature);

  if (!isValid) {
    console.warn('Invalid GitHub webhook signature, delivery:', delivery);
    return res.status(401).send('Invalid signature');
  }

  let json;
  try {
    json = JSON.parse(payload.toString('utf8'));
  } catch (err) {
    console.error('Failed to parse webhook JSON:', err);
    return res.status(400).send('Invalid JSON');
  }

  if (event === 'push') {
    // Process the push event (may take some seconds)
    handlePushEvent(json)
      .then(() => console.log('Push event processed'))
      .catch(err => console.error('Error handling push event:', err));
  }

  res.status(200).send('OK');
});

function verifySignature(secret, payloadBuffer, signatureHeader) {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadBuffer);
  const digest = 'sha256=' + hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false;
  }
}

module.exports = {
  githubWebhookRouter: router,
};
