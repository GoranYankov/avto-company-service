/**
 * Tests for Request Logger Middleware
 * @jest-environment node
 */

const requestLogger = require('../src/middlewares/requestLogger');
const logger = require('../src/utils/logger');

jest.mock('../src/utils/logger');

describe('Request Logger Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };
    res = {
      statusCode: 200,
      on: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('should log incoming request', () => {
    requestLogger(req, res, next);

    expect(logger.info).toHaveBeenCalledWith(
      'Incoming request',
      expect.objectContaining({
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1'
      })
    );
    expect(next).toHaveBeenCalled();
  });

  test('should log response on finish with warn for 4xx status', () => {
    requestLogger(req, res, next);

    // Get the finish callback
    const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
    
    res.statusCode = 404;
    finishCallback();

    expect(logger.warn).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        method: 'GET',
        url: '/api/test',
        statusCode: 404
      })
    );
  });

  test('should measure response time', () => {
    jest.useFakeTimers();
    
    requestLogger(req, res, next);
    
    jest.advanceTimersByTime(150);
    
    const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
    finishCallback();

    expect(logger.info).toHaveBeenCalledWith(
      'Request completed',
      expect.objectContaining({
        duration: expect.any(String),
        statusCode: 200
      })
    );

    jest.useRealTimers();
  });
});
