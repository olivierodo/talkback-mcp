#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MessageQueue } from './messageQueue.js';

// Initialize the message queue with a 500 character limit
const messageQueue = new MessageQueue(500);

// Random names for LLM introduction
const RANDOM_NAMES = [
  'Alex', 'Morgan', 'Jordan', 'Taylor', 'Casey',
  'Riley', 'Quinn', 'Avery', 'Parker', 'Charlie',
  'Sam', 'Jamie', 'Sage', 'Robin', 'Dakota'
];

/**
 * Get a random name for the LLM to introduce itself
 */
function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

/**
 * Generate initialization instructions for the LLM
 */
function getInitInstructions(): string {
  const name = getRandomName();
  return `Hello! I'm ${name}, your voice assistant through the Talkback MCP server.

Here are my behavioral guidelines:

1. **Speak about everything**: I will use the 'speak' tool to verbally communicate all actions I'm taking, so you can stay informed without reading the screen.

2. **Always speak when prompting**: Whenever I ask you a question or wait for your response, I will always speak it aloud. I understand you might be busy with other tasks and need to hear the prompts rather than read them.

3. **Stay concise**: My spoken messages will be brief and to the point. I'll leave detailed information and technical output in the terminal for you to review later if needed.

4. **Regular updates**: I'll keep you informed of progress and next steps through speech, making it easier for you to multitask.

Ready to assist you!`;
}

// Define the available tools
const TOOLS: Tool[] = [
  {
    name: 'init',
    description: 'Initialize the MCP server and get behavioral instructions for the LLM. This should be called at the start of a session to receive guidelines on how to interact with the user through speech.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'speak',
    description: 'Add a message to the speech queue to be spoken aloud using the macOS say command. Messages are queued and spoken sequentially. Messages longer than 500 characters will be automatically truncated.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to speak aloud',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'cancel_message',
    description: 'Cancel a specific queued message by its ID before it is spoken',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'The ID of the message to cancel',
        },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'reset_queue',
    description: 'Reset the entire speech queue and stop any currently playing message. Use this when the current action has been cancelled.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_queue_status',
    description: 'Get the current status of the speech queue, including the number of queued messages and whether a message is currently being spoken',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Create the MCP server
const server = new Server(
  {
    name: 'talkback-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'init': {
        const instructions = getInitInstructions();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                instructions,
              }, null, 2),
            },
          ],
        };
      }

      case 'speak': {
        const { message } = args as { message: string };
        
        if (!message || typeof message !== 'string') {
          throw new Error('Message must be a non-empty string');
        }

        const queuedMessage = messageQueue.enqueue(message);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                messageId: queuedMessage.id,
                message: queuedMessage.message,
                queuePosition: messageQueue.getStatus().queueLength,
              }, null, 2),
            },
          ],
        };
      }

      case 'cancel_message': {
        const { messageId } = args as { messageId: string };
        
        if (!messageId || typeof messageId !== 'string') {
          throw new Error('Message ID must be a non-empty string');
        }

        const cancelled = messageQueue.cancel(messageId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: cancelled,
                messageId,
                message: cancelled 
                  ? 'Message cancelled successfully' 
                  : 'Message not found in queue',
              }, null, 2),
            },
          ],
        };
      }

      case 'reset_queue': {
        messageQueue.reset();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Queue reset successfully',
              }, null, 2),
            },
          ],
        };
      }

      case 'get_queue_status': {
        const status = messageQueue.getStatus();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                queueLength: status.queueLength,
                isProcessing: status.isProcessing,
                queue: status.queue,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with the MCP protocol
  console.error('Talkback MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
