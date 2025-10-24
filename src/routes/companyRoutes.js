const express = require('express');
const router = express.Router();

// Temporary minimal routes for testing
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'company' });
});

module.exports = router;