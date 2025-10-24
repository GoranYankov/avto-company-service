/**
 * Tests for Event Subscriber
 * @jest-environment node
 */

const eventSubscriber = require('../src/utils/eventSubscriber');
const companyService = require('../src/services/companyService');
const logger = require('../src/utils/logger');

jest.mock('amqplib');
jest.mock('../src/services/companyService');
jest.mock('../src/utils/logger');

describe('EventSubscriber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleEvent', () => {
    test('should handle auth.user.created event', async () => {
      const event = {
        type: 'auth.user.created',
        payload: {
          userId: 'user123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      companyService.createFromAuthEvent.mockResolvedValue({
        _id: 'company123',
        name: 'Test User Company'
      });

      await eventSubscriber.handleEvent(event);

      expect(companyService.createFromAuthEvent).toHaveBeenCalledWith(event.payload);
    });

    test('should handle auth.user.email_verified event', async () => {
      const event = {
        type: 'auth.user.email_verified',
        payload: {
          userId: 'user123',
          email: 'test@example.com'
        }
      };

      companyService.updateEmailVerified.mockResolvedValue({
        _id: 'company123',
        isVerified: true
      });

      await eventSubscriber.handleEvent(event);

      expect(companyService.updateEmailVerified).toHaveBeenCalledWith(event.payload.userId);
    });

    test('should log debug for unknown event type', async () => {
      const event = {
        type: 'unknown.event',
        payload: {}
      };

      await eventSubscriber.handleEvent(event);

      expect(logger.debug).toHaveBeenCalledWith('Unhandled event type:', 'unknown.event');
    });

    test('should throw error when event handling fails', async () => {
      const event = {
        type: 'auth.user.created',
        payload: { userId: 'user123' }
      };

      companyService.createFromAuthEvent.mockRejectedValue(new Error('Service error'));

      await expect(eventSubscriber.handleEvent(event)).rejects.toThrow('Service error');
    });
  });

  describe('isReady', () => {
    test('should return false when not connected', () => {
      const ready = eventSubscriber.isReady();
      expect(typeof ready).toBe('boolean');
      expect(ready).toBe(false);
    });
  });
});
