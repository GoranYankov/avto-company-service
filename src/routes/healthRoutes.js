const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * Health check routes
 * These endpoints should not have authentication or rate limiting
 * as they are used by monitoring systems and orchestrators
 */

// General health check
router.get('/', healthController.healthCheck);

// Kubernetes liveness probe
router.get('/liveness', healthController.liveness);

// Kubernetes readiness probe
router.get('/readiness', healthController.readiness);

module.exports = router;
