
import dayjs from 'dayjs';
import { urlDB } from '../models/urlStore.js';
import generateShortCode from '../utils/shortCodeGen.js';
import geoip from 'geoip-lite';  

import { createLogger } from 'logging-middleware';
const logger = createLogger({ app: 'url-shortener' });
const { logSafe } = logger;

const DEFAULT_VALIDITY_MINUTES = 30;

function createShortUrl(req, res) {
  try {
    const { url, validity, shortcode } = req.body;

    if (!url || typeof url !== 'string' || !/^https?:\/\/.+/.test(url)) {
      logSafe('backend', 'warn', 'controller', 'Invalid URL', { body: req.body });
      return res.status(400).json({ error: 'Invalid or missing URL' });
    }

    const validityMinutes = typeof validity === 'number' ? validity : DEFAULT_VALIDITY_MINUTES;
    const expiresAt = dayjs().add(validityMinutes, 'minute');
    let code = shortcode;

    if (code) {
      if (urlDB.has(code)) {
        return res.status(409).json({ error: 'Shortcode already in use' });
      }
    } else {
      do {
        code = generateShortCode();
      } while (urlDB.has(code));
    }

    urlDB.set(code, {
      originalUrl: url,
      createdAt: new Date(),
      expiryAt: expiresAt.toDate(),
      clicks: 0,
      clickStats: []
    });

    logSafe('backend', 'info', 'controller', 'Short URL created', { code, url });

    return res.status(201).json({
      shortLink: `http://localhost:3000/${code}`,
      expiry: expiresAt.toISOString()
    });
  } catch (err) {
    logSafe('backend', 'error', 'handler', 'Failed to create short URL', { error: err.message });
    return res.status(500).json({ error: 'Server error' });
  }
}

function redirectUrl(req, res) {
  const { shortcode } = req.params;
  const entry = urlDB.get(shortcode);

  if (!entry) {
    return res.status(404).json({ error: 'Shortcode not found' });
  }

  if (new Date() > entry.expiryAt) {
    return res.status(410).json({ error: 'Link expired' });
  }

  entry.clicks++;
  const geo = geoip.lookup(req.ip);

  entry.clickStats.push({
    timestamp: new Date(),
    referrer: req.get('Referrer') || '',
    ip: req.ip,
    location: geo?.country || 'unknown'
  });

  res.redirect(entry.originalUrl);
}

function getStats(req, res) {
  const { shortcode } = req.params;
  const entry = urlDB.get(shortcode);

  if (!entry) {
    return res.status(404).json({ error: 'Shortcode not found' });
  }

  return res.json({
    totalClicks: entry.clicks,
    originalUrl: entry.originalUrl,
    createdAt: entry.createdAt,
    expiryAt: entry.expiryAt,
    clickStats: entry.clickStats
  });
}

export { createShortUrl, redirectUrl, getStats };
