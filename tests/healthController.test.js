/**
 * Tests for Health Controller
 * @jest-environment node
 */

const healthController = require('../src/controllers/healthController');
const mongoose = require('mongoose');

jest.mock('mongoose');
jest.mock('../src/utils/logger');
jest.mock('../src/utils/eventSubscriber', () => ({
  isReady: jest.fn()
}));

describe('HealthController', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    test('should return basic health status', () => {
      healthController.healthCheck(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          service: 'company-service',
          timestamp: expect.any(String),
          uptime: expect.any(Number)
        })
      );
    });
  });

  describe('liveness', () => {
    test('should return 200 status', () => {
      healthController.liveness(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'alive' });
    });
  });

  describe('readiness', () => {
    test('should return ready status when all services are up', async () => {
      mongoose.connection = {
        readyState: 1,
        db: {
          admin: () => ({
            ping: jest.fn().mockResolvedValue({})
          })
        }
      };

      const eventSubscriber = require('../src/utils/eventSubscriber');
      eventSubscriber.isReady.mockReturnValue(true);

      await healthController.readiness(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          checks: expect.objectContaining({
            mongodb: expect.objectContaining({
              status: 'up',
              state: 'connected'
            }),
            rabbitmq: expect.objectContaining({
              status: 'up'
            })
          })
        })
      );
    });

    test('should return not ready when MongoDB is down', async () => {
      mongoose.connection = {
        readyState: 0
      };

      const eventSubscriber = require('../src/utils/eventSubscriber');
      eventSubscriber.isReady.mockReturnValue(true);

      await healthController.readiness(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: expect.objectContaining({
            mongodb: expect.objectContaining({
              status: 'down'
            })
          })
        })
      );
    });

    test('should return not ready when RabbitMQ is down', async () => {
      mongoose.connection = {
        readyState: 1,
        db: {
          admin: () => ({
            ping: jest.fn().mockResolvedValue({})
          })
        }
      };

      const eventSubscriber = require('../src/utils/eventSubscriber');
      eventSubscriber.isReady.mockReturnValue(false);

      await healthController.readiness(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: expect.objectContaining({
            rabbitmq: expect.objectContaining({
              status: 'down'
            })
          })
        })
      );
    });

    test('should handle MongoDB ping error', async () => {
      mongoose.connection = {
        readyState: 1,
        db: {
          admin: () => ({
            ping: jest.fn().mockRejectedValue(new Error('Connection lost'))
          })
        }
      };

      const eventSubscriber = require('../src/utils/eventSubscriber');
      eventSubscriber.isReady.mockReturnValue(true);

      await healthController.readiness(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: expect.objectContaining({
            mongodb: expect.objectContaining({
              status: 'down',
              error: 'Connection lost'
            })
          })
        })
      );
    });
  });
});
