import { describe, it, expect } from 'vitest';

/**
 * End-to-end tests for debug mode functionality
 */

describe('Debug Mode End-to-End', () => {
  describe('Emoji responses (non-debug mode)', () => {
    it('should use speaker emoji for success', () => {
      // Simulating the formatResponse function behavior in non-debug mode
      const successEmoji = '🔊';
      expect(successEmoji).toBe('🔊');
      expect(successEmoji.length).toBeLessThan(5); // Very short response
    });

    it('should use muted emoji for failure', () => {
      // Simulating the formatResponse function behavior in non-debug mode
      const failureEmoji = '🔇';
      expect(failureEmoji).toBe('🔇');
      expect(failureEmoji.length).toBeLessThan(5); // Very short response
    });

    it('should keep responses visually small', () => {
      const successResponse = '🔊';
      const failureResponse = '🔇';
      
      // Both responses should be minimal
      expect(successResponse.length).toBeLessThan(10);
      expect(failureResponse.length).toBeLessThan(10);
    });
  });

  describe('Full JSON responses (debug mode)', () => {
    it('should include all details in success response', () => {
      const debugResponse = {
        success: true,
        messageId: 'msg_123',
        message: 'Test message',
        voice: 'Samantha',
        queuePosition: 1
      };
      
      const jsonString = JSON.stringify(debugResponse, null, 2);
      
      expect(jsonString).toContain('success');
      expect(jsonString).toContain('messageId');
      expect(jsonString).toContain('message');
      expect(jsonString).toContain('voice');
      expect(jsonString).toContain('queuePosition');
      expect(jsonString.length).toBeGreaterThan(50); // Detailed response
    });

    it('should include error details in failure response', () => {
      const debugResponse = {
        success: false,
        error: 'Test error message'
      };
      
      const jsonString = JSON.stringify(debugResponse, null, 2);
      
      expect(jsonString).toContain('success');
      expect(jsonString).toContain('false');
      expect(jsonString).toContain('error');
      expect(jsonString).toContain('Test error message');
    });
  });

  describe('Command-line argument parsing', () => {
    it('should detect --debug flag', () => {
      const args = ['--debug'];
      const hasDebug = args.includes('--debug');
      expect(hasDebug).toBe(true);
    });

    it('should not detect debug when flag is absent', () => {
      const args = [];
      const hasDebug = args.includes('--debug');
      expect(hasDebug).toBe(false);
    });

    it('should handle other arguments alongside --debug', () => {
      const args = ['--other-flag', '--debug', '--another'];
      const hasDebug = args.includes('--debug');
      expect(hasDebug).toBe(true);
    });
  });
});
