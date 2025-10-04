import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MessageQueue } from './messageQueue';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('MessageQueue', () => {
  let queue: MessageQueue;
  let mockProcesses: Array<EventEmitter & { kill: ReturnType<typeof vi.fn> }>;

  beforeEach(() => {
    queue = new MessageQueue(500);
    mockProcesses = [];

    // Mock spawn to return a new mock process each time
    vi.mocked(spawn).mockImplementation(() => {
      const mockProcess = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
      });
      mockProcesses.push(mockProcess);
      return mockProcess as any;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should add a message to the queue', () => {
      const message = 'Test message';
      const queuedMessage = queue.enqueue(message);

      expect(queuedMessage).toHaveProperty('id');
      expect(queuedMessage).toHaveProperty('message', message);
      expect(queuedMessage).toHaveProperty('timestamp');
      expect(queuedMessage.id).toMatch(/^msg_/);
    });

    it('should truncate messages longer than max length', () => {
      const longMessage = 'a'.repeat(600);
      const queuedMessage = queue.enqueue(longMessage);

      expect(queuedMessage.message.length).toBe(500);
      expect(queuedMessage.message).toMatch(/\.\.\.$/);
    });

    it('should not truncate messages within max length', () => {
      const message = 'a'.repeat(400);
      const queuedMessage = queue.enqueue(message);

      expect(queuedMessage.message).toBe(message);
      expect(queuedMessage.message.length).toBe(400);
    });

    it('should generate unique IDs for different messages', () => {
      const msg1 = queue.enqueue('Message 1');
      const msg2 = queue.enqueue('Message 2');

      expect(msg1.id).not.toBe(msg2.id);
    });

    it('should trigger processing when queue is not empty', async () => {
      const message = 'Test message';
      queue.enqueue(message);

      // Wait a bit for async processing to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledWith('say', [message]);
    });
  });

  describe('cancel', () => {
    it('should cancel a queued message by ID', () => {
      const msg1 = queue.enqueue('Message 1');
      const msg2 = queue.enqueue('Message 2');

      const cancelled = queue.cancel(msg1.id);
      const status = queue.getStatus();

      expect(cancelled).toBe(true);
      expect(status.queueLength).toBe(1);
      expect(status.queue[0].id).toBe(msg2.id);
    });

    it('should return false when cancelling non-existent message', () => {
      queue.enqueue('Message 1');
      const cancelled = queue.cancel('non-existent-id');

      expect(cancelled).toBe(false);
    });

    it('should handle cancelling from empty queue', () => {
      const cancelled = queue.cancel('some-id');

      expect(cancelled).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear the entire queue', () => {
      queue.enqueue('Message 1');
      queue.enqueue('Message 2');
      queue.enqueue('Message 3');

      queue.reset();
      const status = queue.getStatus();

      expect(status.queueLength).toBe(0);
      expect(status.queue).toEqual([]);
    });

    it('should stop current playback', async () => {
      queue.enqueue('Message 1');
      
      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      queue.reset();
      expect(mockProcesses[0].kill).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return correct queue status', () => {
      const msg1 = queue.enqueue('Message 1');
      const msg2 = queue.enqueue('Message 2');
      const status = queue.getStatus();

      expect(status.queueLength).toBe(2);
      expect(status.queue).toHaveLength(2);
      expect(status.queue[0].id).toBe(msg1.id);
      expect(status.queue[1].id).toBe(msg2.id);
    });

    it('should return empty status for empty queue', () => {
      const status = queue.getStatus();

      expect(status.queueLength).toBe(0);
      expect(status.queue).toEqual([]);
      expect(status.isProcessing).toBe(false);
    });

    it('should not allow external modification of queue', () => {
      queue.enqueue('Message 1');
      const status = queue.getStatus();
      
      // Try to modify the returned queue
      status.queue.pop();

      // Original queue should be unchanged
      const newStatus = queue.getStatus();
      expect(newStatus.queueLength).toBe(1);
    });
  });

  describe('processing', () => {
    it('should process messages sequentially', async () => {
      queue.enqueue('Message 1');
      queue.enqueue('Message 2');

      // Wait for first message to start
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate first message completion
      mockProcesses[0].emit('close', 0);

      // Wait for second message to start
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenNthCalledWith(1, 'say', ['Message 1']);
      expect(spawn).toHaveBeenNthCalledWith(2, 'say', ['Message 2']);
    });

    it('should handle errors gracefully and continue processing', async () => {
      queue.enqueue('Message 1');
      queue.enqueue('Message 2');

      // Wait for first message to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate first message error
      mockProcesses[0].emit('close', 1);

      // Wait for second message to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledTimes(2);
    });

    it('should handle spawn errors', async () => {
      queue.enqueue('Message 1');
      queue.enqueue('Message 2');

      // Wait for first message to start
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate spawn error
      mockProcesses[0].emit('error', new Error('spawn error'));

      // Wait for second message to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledTimes(2);
    });
  });

  describe('custom max length', () => {
    it('should respect custom max message length', () => {
      const customQueue = new MessageQueue(100);
      const longMessage = 'a'.repeat(200);
      const queuedMessage = customQueue.enqueue(longMessage);

      expect(queuedMessage.message.length).toBe(100);
      expect(queuedMessage.message).toMatch(/\.\.\.$/);
    });

    it('should default to 500 when no max length specified', () => {
      const defaultQueue = new MessageQueue();
      const longMessage = 'a'.repeat(600);
      const queuedMessage = defaultQueue.enqueue(longMessage);

      expect(queuedMessage.message.length).toBe(500);
    });
  });

  describe('voice support', () => {
    it('should support optional voice parameter', () => {
      const message = 'Test message';
      const voice = 'Alex';
      const queuedMessage = queue.enqueue(message, voice);

      expect(queuedMessage.voice).toBe(voice);
      expect(queuedMessage.message).toBe(message);
    });

    it('should work without voice parameter', () => {
      const message = 'Test message';
      const queuedMessage = queue.enqueue(message);

      expect(queuedMessage.voice).toBeUndefined();
      expect(queuedMessage.message).toBe(message);
    });

    it('should pass voice to say command', async () => {
      const message = 'Test message';
      const voice = 'Samantha';
      queue.enqueue(message, voice);

      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledWith('say', ['-v', voice, message]);
    });

    it('should call say without voice flag when no voice specified', async () => {
      const message = 'Test message';
      queue.enqueue(message);

      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledWith('say', [message]);
    });

    it('should handle multiple messages with different voices', async () => {
      queue.enqueue('Message 1', 'Alex');
      queue.enqueue('Message 2', 'Samantha');

      // Wait for first message to start
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate first message completion
      mockProcesses[0].emit('close', 0);

      // Wait for second message to start
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenNthCalledWith(1, 'say', ['-v', 'Alex', 'Message 1']);
      expect(spawn).toHaveBeenNthCalledWith(2, 'say', ['-v', 'Samantha', 'Message 2']);
    });
  });
});
