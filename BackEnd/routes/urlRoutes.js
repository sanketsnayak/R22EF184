
import express from 'express';
const router = express.Router();
import { createShortUrl, redirectUrl, getStats } from '../controllers/urlController.js';

router.post('/shorturls', createShortUrl);
router.get('/shorturls/:shortcode', getStats);
router.get('/:shortcode', redirectUrl);

export default router;
