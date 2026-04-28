const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const groww   = require('../controllers/groww.controller');

// All routes require authentication
router.use(auth);

router.post('/link',       groww.linkAccount);
router.get('/status',      groww.getStatus);
router.post('/sync',       groww.syncPortfolio);
router.get('/portfolio',   groww.getPortfolio);
router.get('/price',       groww.getLivePrice);
router.delete('/unlink',   groww.unlinkAccount);

module.exports = router;
