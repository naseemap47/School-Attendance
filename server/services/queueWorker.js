const { getDb } = require('../db/index.js');
const { getWhatsAppStatus, sendWhatsAppMessage } = require('./whatsappClient.js');

let isWorkerRunning = false;
let workerTimer = null;
let currentJitterConfig = {
  minJitterMs: 3000,
  maxJitterMs: 7000,
  pollIntervalMs: 1000
};

function getRandomJitter(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processNextQueueItem(config = currentJitterConfig) {
  const db = getDb();

  // Pick the oldest pending item
  const item = db.prepare(`
    SELECT * FROM whatsapp_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
  `).get();

  if (!item) return false;

  const whatsappStatus = getWhatsAppStatus();
  if (whatsappStatus.status !== 'CONNECTED') {
    // WhatsApp client is not ready/connected, leave in pending and wait
    return false;
  }

  // Mark as processing
  db.prepare("UPDATE whatsapp_queue SET status = 'processing' WHERE id = ?").run(item.id);

  // Apply human-like randomized anti-ban jitter delay
  const jitterMs = getRandomJitter(config.minJitterMs, config.maxJitterMs);
  if (jitterMs > 0) {
    await sleep(jitterMs);
  }

  try {
    await sendWhatsAppMessage(item.recipient_phone, item.message_body);

    db.prepare(`
      UPDATE whatsapp_queue
      SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error_message = NULL
      WHERE id = ?
    `).run(item.id);

    return true;
  } catch (err) {
    const newRetryCount = (item.retry_count || 0) + 1;
    const newStatus = newRetryCount < 2 ? 'pending' : 'failed';

    db.prepare(`
      UPDATE whatsapp_queue
      SET status = ?, retry_count = ?, error_message = ?
      WHERE id = ?
    `).run(newStatus, newRetryCount, err.message || 'Send error', item.id);

    return false;
  }
}

async function runWorkerLoop() {
  if (!isWorkerRunning) return;

  try {
    const hasMore = await processNextQueueItem(currentJitterConfig);
    const delay = hasMore ? 100 : currentJitterConfig.pollIntervalMs;
    workerTimer = setTimeout(runWorkerLoop, delay);
  } catch (err) {
    console.error('Queue worker loop error:', err);
    workerTimer = setTimeout(runWorkerLoop, currentJitterConfig.pollIntervalMs);
  }
}

function startQueueWorker(customConfig = {}) {
  currentJitterConfig = { ...currentJitterConfig, ...customConfig };
  if (isWorkerRunning) return;

  try {
    const db = getDb();
    db.prepare("UPDATE whatsapp_queue SET status = 'pending' WHERE status = 'processing'").run();
  } catch (_) {}

  isWorkerRunning = true;
  runWorkerLoop();
}

function stopQueueWorker() {
  isWorkerRunning = false;
  if (workerTimer) {
    clearTimeout(workerTimer);
    workerTimer = null;
  }
}

module.exports = {
  startQueueWorker,
  stopQueueWorker,
  processNextQueueItem,
  getRandomJitter
};
