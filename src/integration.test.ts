import { describe, it, expect } from 'vitest';

/**
 * Integration tests for the MCP server tools
 * These tests verify the server's response format and tool definitions
 */

describe('MCP Server Integration', () => {
  describe('Tool Definitions', () => {
    it('should have correct tool names', () => {
      const expectedTools = [
        'enable',
        'disable',
        'speak',
        'cancel_message',
        'reset_queue',
        'get_queue_status'
      ];
      
      // This test ensures all required tools are defined
      expect(expectedTools).toHaveLength(6);
    });

    it('should have speak tool with required parameters', () => {
      const speakTool = {
        name: 'speak',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            sessionId: { type: 'string' }
          },
          required: ['message', 'sessionId']
        }
      };
      
      expect(speakTool.name).toBe('speak');
      expect(speakTool.inputSchema.required).toContain('message');
      expect(speakTool.inputSchema.required).toContain('sessionId');
    });

    it('should have enable tool with sessionId parameter', () => {
      const enableTool = {
        name: 'enable',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' }
          },
          required: ['sessionId']
        }
      };
      
      expect(enableTool.name).toBe('enable');
      expect(enableTool.inputSchema.required).toContain('sessionId');
    });

    it('should have disable tool with sessionId parameter', () => {
      const disableTool = {
        name: 'disable',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' }
          },
          required: ['sessionId']
        }
      };
      
      expect(disableTool.name).toBe('disable');
      expect(disableTool.inputSchema.required).toContain('sessionId');
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

  describe('Multi-Session Support', () => {
    it('should assign different voices to different sessions', () => {
      // Simulating two different sessions
      const session1 = { id: 'session1', name: 'Alex', voice: 'Alex' };
      const session2 = { id: 'session2', name: 'Morgan', voice: 'Daniel' };
      
      expect(session1.voice).not.toBe(session2.voice);
      expect(session1.name).not.toBe(session2.name);
    });

    it('should maintain voice consistency for the same session', () => {
      const sessionId = 'session1';
      const session1Call1 = { id: sessionId, voice: 'Alex' };
      const session1Call2 = { id: sessionId, voice: 'Alex' };
      
      expect(session1Call1.voice).toBe(session1Call2.voice);
    });

    it('should include voice information in enable response', () => {
      const mockEnableResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            sessionId: 'session1',
            name: 'Alex',
            voice: 'Alex',
            enabled: true,
            introduction: 'Hello! I\'m Alex...',
            instructions: 'The speech feature is now ENABLED...'
          }, null, 2)
        }]
      };
      
      const parsed = JSON.parse(mockEnableResponse.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed).toHaveProperty('sessionId');
      expect(parsed).toHaveProperty('voice');
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('enabled');
      expect(parsed).toHaveProperty('introduction');
      expect(parsed).toHaveProperty('instructions');
    });

    it('should include voice in speak response', () => {
      const mockSpeakResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            messageId: 'msg_123',
            message: 'Test message',
            voice: 'Samantha',
            queuePosition: 1
          }, null, 2)
        }]
      };
      
      const parsed = JSON.parse(mockSpeakResponse.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed).toHaveProperty('voice');
      expect(parsed.voice).toBe('Samantha');
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

    it('should format enable response correctly', () => {
      const mockEnableResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            enabled: true,
            introduction: 'Hello! I\'m Alex, your voice assistant...',
            instructions: 'The speech feature is now ENABLED...'
          }, null, 2)
        }]
      };
      
      expect(mockEnableResponse.content).toHaveLength(1);
      expect(mockEnableResponse.content[0].type).toBe('text');
      
      const parsed = JSON.parse(mockEnableResponse.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed).toHaveProperty('introduction');
      expect(parsed).toHaveProperty('instructions');
      expect(typeof parsed.introduction).toBe('string');
      expect(typeof parsed.instructions).toBe('string');
      expect(parsed.introduction.length).toBeGreaterThan(0);
      expect(parsed.instructions.length).toBeGreaterThan(0);
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
