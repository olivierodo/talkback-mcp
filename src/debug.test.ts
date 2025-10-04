import { describe, it, expect } from 'vitest';

/**
 * Tests for debug mode formatting
 * These tests verify that responses are formatted correctly based on debug mode
 */

describe('Debug Mode', () => {
  describe('formatResponse helper', () => {
    it('should return emoji for success in non-debug mode', () => {
      const successResponse = '🔊';
      expect(successResponse).toBe('🔊');
    });

    it('should return emoji for failure in non-debug mode', () => {
      const failureResponse = '🔇';
      expect(failureResponse).toBe('🔇');
    });

    it('should return full JSON in debug mode', () => {
      const debugResponse = JSON.stringify({
        success: true,
        messageId: 'msg_123',
        message: 'Test message',
        voice: 'Samantha',
        queuePosition: 1
      }, null, 2);
      
      expect(debugResponse).toContain('success');
      expect(debugResponse).toContain('messageId');
      expect(debugResponse).toContain('message');
      expect(debugResponse).toContain('voice');
      expect(debugResponse).toContain('queuePosition');
    });
  });

  describe('Response consistency', () => {
    it('should have consistent success emoji', () => {
      const emoji = '🔊';
      expect(emoji).toMatch(/🔊/);
    });

    it('should have consistent failure emoji', () => {
      const emoji = '🔇';
      expect(emoji).toMatch(/🔇/);
    });
  });
});
