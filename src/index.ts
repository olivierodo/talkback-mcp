#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { MessageQueue } from './messageQueue.js';
import { SessionStorage, Session } from './sessionStorage.js';

// Parse command-line arguments for debug mode
const args = process.argv.slice(2);
const debugMode = args.includes('--debug');

// Initialize the message queue with a 500 character limit
const messageQueue = new MessageQueue(500);

// Random names for LLM introduction
const RANDOM_NAMES = [
  'Alex', 'Morgan', 'Jordan', 'Taylor', 'Casey',
  'Riley', 'Quinn', 'Avery', 'Parker', 'Charlie',
  'Sam', 'Jamie', 'Sage', 'Robin', 'Dakota'
];

// Available voices for different sessions
const AVAILABLE_VOICES = [
  'Alex', 'Daniel', 'Fred', 'Karen', 'Moira',
  'Samantha', 'Victoria', 'Fiona', 'Tessa', 'Veena'
];

// Session storage to persist sessions per process
const sessionStorage = new SessionStorage();
let voiceIndex = 0;

/**
 * Get a random name for the LLM to introduce itself
 */
function getRandomName(): string {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

/**
 * Get the next available voice in rotation
 */
function getNextVoice(): string {
  const voice = AVAILABLE_VOICES[voiceIndex % AVAILABLE_VOICES.length];
  voiceIndex++;
  return voice;
}

/**
 * Get or create a session
 */
function getOrCreateSession(sessionId: string): Session {
  if (!sessionStorage.has(sessionId)) {
    const session: Session = {
      id: sessionId,
      name: getRandomName(),
      voice: getNextVoice(),
      enabled: false,
    };
    sessionStorage.set(sessionId, session);
  }
  return sessionStorage.get(sessionId)!;
}

/**
 * Generate a brief introduction for the LLM to speak when enabling
 */
function getIntroduction(session: Session): string {
  return `Hello! I'm ${session.name}, your voice assistant through the Talkback MCP server.`;
}

/**
 * Generate initialization instructions for the LLM
 */
function getInitInstructions(session: Session): string {
  return `The speech feature is now ENABLED. You MUST start speaking NOW for every upcoming instruction and action.

Here are your behavioral guidelines:

1. **Speak about everything**: Use the 'speak' tool to verbally communicate all actions you're taking, so the user can stay informed without reading the screen.

2. **Always speak when prompting**: Whenever you ask a question or wait for a response, always speak it aloud. The user might be busy with other tasks and needs to hear the prompts rather than read them.

3. **Stay concise**: Keep spoken messages brief and to the point. Leave detailed information and technical output in the terminal for later review.

4. **Regular updates**: Keep the user informed of progress and next steps through speech, making it easier to multitask.

5. **Multi-session support**: You're using the voice "${session.voice}" so the user can distinguish you from other sessions. All sessions share the same queue to avoid overlapping speech.

IMPORTANT: Now that speech is enabled, you MUST provide short spoken summaries for every instruction and action you perform. Do not wait for reminders - speak proactively for all your work.`;
}

/**
 * Format response based on debug mode
 * In debug mode: return full details
 * In normal mode: return simple emoji acknowledgement
 */
function formatResponse(data: { success: boolean; [key: string]: any }): string {
  if (debugMode) {
    return JSON.stringify(data, null, 2);
  }
  
  // Simple emoji-based response for non-debug mode
  if (data.success) {
    return '🔊';
  } else {
    return '🔇';
  }
}

// Define the available tools
const TOOLS: Tool[] = [
  {
    name: 'enable',
    description: 'Enable the speech feature for this session. The LLM will receive behavioral instructions and will introduce itself. Once enabled, the LLM should speak brief summaries for every action and instruction. Each session gets a unique voice to distinguish between multiple concurrent sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Unique identifier for this session. Use a consistent ID across calls to maintain the same voice.',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'disable',
    description: 'Disable the speech feature for this session. The LLM will stop speaking and will only communicate through text.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'Unique identifier for the session to disable.',
        },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'speak',
    description: 'Add a message to the speech queue to be spoken aloud using the macOS say command. Messages are queued and spoken sequentially across all sessions. Messages longer than 500 characters will be automatically truncated. The message will be spoken using the voice assigned to the session.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to speak aloud',
        },
        sessionId: {
          type: 'string',
          description: 'Session identifier to use the assigned voice for this session',
        },
      },
      required: ['message', 'sessionId'],
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
      case 'enable': {
        const { sessionId } = args as { sessionId: string };
        
        if (!sessionId || typeof sessionId !== 'string') {
          throw new Error('Session ID must be a non-empty string');
        }
        
        const session = getOrCreateSession(sessionId);
        session.enabled = true;
        sessionStorage.set(sessionId, session); // Persist the enabled state
        const instructions = getInitInstructions(session);
        const introduction = getIntroduction(session);
        
        // Queue the introduction to be spoken
        const queuedMessage = messageQueue.enqueue(introduction, session.voice);
        
        return {
          content: [
            {
              type: 'text',
              text: formatResponse({
                success: true,
                sessionId: session.id,
                name: session.name,
                voice: session.voice,
                enabled: true,
                introduction,
                introductionMessageId: queuedMessage.id,
                instructions,
              }),
            },
          ],
        };
      }

      case 'disable': {
        const { sessionId } = args as { sessionId: string };
        
        if (!sessionId || typeof sessionId !== 'string') {
          throw new Error('Session ID must be a non-empty string');
        }
        
        const session = getOrCreateSession(sessionId);
        session.enabled = false;
        sessionStorage.set(sessionId, session); // Persist the disabled state
        
        return {
          content: [
            {
              type: 'text',
              text: formatResponse({
                success: true,
                sessionId: session.id,
                enabled: false,
                message: 'Speech feature has been disabled for this session',
              }),
            },
          ],
        };
      }

      case 'speak': {
        const { message, sessionId } = args as { message: string; sessionId: string };
        
        if (!message || typeof message !== 'string') {
          throw new Error('Message must be a non-empty string');
        }
        
        if (!sessionId || typeof sessionId !== 'string') {
          throw new Error('Session ID must be a non-empty string');
        }
        
        const session = getOrCreateSession(sessionId);
        
        if (!session.enabled) {
          return {
            content: [
              {
                type: 'text',
                text: formatResponse({
                  success: false,
                  error: 'Speech is not enabled for this session. Call the "enable" tool first.',
                }),
              },
            ],
            isError: true,
          };
        }
        
        const queuedMessage = messageQueue.enqueue(message, session.voice);
        
        return {
          content: [
            {
              type: 'text',
              text: formatResponse({
                success: true,
                messageId: queuedMessage.id,
                message: queuedMessage.message,
                voice: session.voice,
                queuePosition: messageQueue.getStatus().queueLength,
              }),
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
              text: formatResponse({
                success: cancelled,
                messageId,
                message: cancelled 
                  ? 'Message cancelled successfully' 
                  : 'Message not found in queue',
              }),
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
              text: formatResponse({
                success: true,
                message: 'Queue reset successfully',
              }),
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
              text: formatResponse({
                success: true,
                queueLength: status.queueLength,
                isProcessing: status.isProcessing,
                queue: status.queue,
              }),
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
          text: formatResponse({
            success: false,
            error: errorMessage,
          }),
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
  console.error(`Talkback MCP server running on stdio${debugMode ? ' (debug mode enabled)' : ''}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
