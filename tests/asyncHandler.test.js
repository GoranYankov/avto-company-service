/**
 * Tests for Async Handler
 * @jest-environment node
 */

const asyncHandler = require('../src/utils/asyncHandler');

describe('Async Handler', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should call next with error when async function throws', async () => {
    const error = new Error('Test error');
    const asyncFn = async () => {
      throw error;
    };

    const wrappedFn = asyncHandler(asyncFn);
    await wrappedFn(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('should not call next when async function succeeds', async () => {
    const asyncFn = async (req, res) => {
      res.status(200).json({ success: true });
    };

    const wrappedFn = asyncHandler(asyncFn);
    await wrappedFn(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('should handle rejected promises', async () => {
    const error = new Error('Promise rejected');
    const asyncFn = jest.fn().mockRejectedValue(error);

    const wrappedFn = asyncHandler(asyncFn);
    await wrappedFn(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
