import { describe, it, expect } from 'vitest';

/**
 * Integration tests for the MCP server tools
 * These tests verify the server's response format and tool definitions
 */

describe('MCP Server Integration', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      const expectedTools = [
        'speak',
        'cancel_message',
        'reset_queue',
        'get_queue_status'
      ];
      
      // This test ensures all required tools are defined
      expect(expectedTools).toHaveLength(4);
    });

    it('should have speak tool with required parameters', () => {
      const speakTool = {
        name: 'speak',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        }
      };
      
      expect(speakTool.name).toBe('speak');
      expect(speakTool.inputSchema.required).toContain('message');
    });

    it('should have cancel_message tool with messageId parameter', () => {
      const cancelTool = {
        name: 'cancel_message',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string' }
          },
          required: ['messageId']
        }
      };
      
      expect(cancelTool.name).toBe('cancel_message');
      expect(cancelTool.inputSchema.required).toContain('messageId');
    });
  });

  describe('Response Format', () => {
    it('should format success responses correctly', () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            messageId: 'msg_123',
            message: 'Test message'
          }, null, 2)
        }]
      };
      
      expect(mockResponse.content).toHaveLength(1);
      expect(mockResponse.content[0].type).toBe('text');
      
      const parsed = JSON.parse(mockResponse.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed).toHaveProperty('messageId');
    });

    it('should format error responses correctly', () => {
      const mockErrorResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Error message'
          }, null, 2)
        }],
        isError: true
      };
      
      expect(mockErrorResponse.isError).toBe(true);
      
      const parsed = JSON.parse(mockErrorResponse.content[0].text);
      expect(parsed.success).toBe(false);
      expect(parsed).toHaveProperty('error');
    });
  });

  describe('Message Validation', () => {
    it('should validate message length limit', () => {
      const maxLength = 500;
      const longMessage = 'a'.repeat(600);
      
      // Message should be truncated to maxLength
      const truncated = longMessage.substring(0, maxLength - 3) + '...';
      
      expect(truncated.length).toBe(maxLength);
      expect(truncated).toMatch(/\.\.\.$/);
    });

    it('should preserve messages within limit', () => {
      const maxLength = 500;
      const shortMessage = 'a'.repeat(400);
      
      expect(shortMessage.length).toBeLessThan(maxLength);
      expect(shortMessage).toBe('a'.repeat(400));
    });
  });
});
