# Talkback MCP - Implementation Summary

## Overview

This MCP server provides text-to-speech functionality using macOS's `say` command, allowing LLMs to communicate their actions audibly to developers. It supports multiple concurrent sessions with unique voice assignments and a shared message queue to prevent overlapping speech.

## Architecture

### Core Components

1. **MessageQueue** (`src/messageQueue.ts`)
   - Manages a FIFO queue of messages to be spoken
   - Enforces a 500-character limit per message
   - Processes messages sequentially
   - Handles `say` command execution via child processes
   - Supports optional voice parameter for multi-session support
   - Provides queue management (cancel, reset)

2. **MCP Server** (`src/index.ts`)
   - Implements the Model Context Protocol server
   - Provides 5 tools for LLM interaction
   - Handles JSON-RPC communication via stdio
   - Integrates with the MessageQueue
   - Provides behavioral guidelines through the init tool
   - Manages session state with unique voice assignments
   - Maintains a shared queue across all sessions

### Tools

#### 1. `init`
Provides initialization and behavioral guidelines for the LLM with session-specific voice assignment.
- **Input**: `{ sessionId: string }`
- **Output**: `{ success: true, sessionId: string, name: string, voice: string, instructions: string }`
- **Features**: 
  - Assigns a unique voice to each session
  - Returns guidelines on how to use speech effectively
  - Includes random name introduction
  - Mentions multi-session support and voice differentiation

#### 2. `speak`
Adds a message to the speech queue with session-specific voice.
- **Input**: `{ message: string, sessionId: string }`
- **Output**: `{ success: true, messageId: string, message: string, voice: string, queuePosition: number }`
- **Features**: 
  - Auto-truncates to 500 chars
  - Uses session's assigned voice
  - Returns voice information in response

#### 3. `cancel_message`
Cancels a queued message by ID.
- **Input**: `{ messageId: string }`
- **Output**: `{ success: boolean, messageId: string, message: string }`

#### 4. `reset_queue`
Clears the queue and stops current playback.
- **Input**: `{}`
- **Output**: `{ success: true, message: string }`

#### 5. `get_queue_status`
Returns current queue status.
- **Input**: `{}`
- **Output**: `{ success: true, queueLength: number, isProcessing: boolean, queue: QueuedMessage[] }`

## Technical Details

### Message Processing Flow

```
LLM calls init(sessionId) 
  ↓
Session created with unique voice assignment
  ↓
LLM calls speak(message, sessionId)
  ↓
Message added to shared queue with voice (truncated if needed)
  ↓
Queue processor starts (if not running)
  ↓
spawn('say', ['-v', voice, message])
  ↓
Wait for completion
  ↓
Process next message in queue (may be from different session)
```

### Multi-Session Management

- **Session Creation**: Each unique `sessionId` creates a new session on first use
- **Voice Assignment**: Sessions are assigned voices in rotation from a predefined list
- **Voice Consistency**: Same `sessionId` always uses the same voice
- **Shared Queue**: All sessions use the same message queue to prevent overlapping speech
- **Sequential Processing**: Messages from different sessions are processed in order

### Error Handling

- Messages longer than 500 chars are truncated with "..."
- Failed `say` commands are logged and skipped
- Queue continues processing even if individual messages fail
- Invalid tool arguments return error responses

### Testing

The project includes comprehensive tests:

- **Unit Tests** (23 tests in `messageQueue.test.ts`)
  - Message queueing and truncation
  - Queue management (cancel, reset)
  - Status reporting
  - Sequential processing
  - Error handling
  - Voice parameter support
  - Multi-voice message processing

- **Integration Tests** (13 tests in `integration.test.ts`)
  - Tool definitions with sessionId parameters
  - Response format validation
  - Message validation
  - Init tool validation
  - Multi-session support validation
  - Voice assignment verification

## Use Cases

1. **Session Initialization**: LLM receives behavioral guidelines and voice assignment on how to communicate effectively through speech
2. **Multi-Window Workflow**: Users working with multiple AI sessions can distinguish which session is speaking by voice
3. **Build Progress**: Notify when builds start/complete from different sessions
4. **Test Results**: Announce test pass/fail status from multiple test runs
5. **Error Alerts**: Alert on critical errors with distinct voices per session
6. **Task Completion**: Notify when long-running tasks finish from different sessions
7. **Context Switching**: Help developers know which session needs attention

## Requirements

- macOS (for `say` command)
- Node.js 18+
- MCP-compatible client (e.g., Claude Desktop)

## Future Enhancements

Potential improvements:
- Support for other TTS engines (espeak, festival)
- Custom voice selection per session
- Speaking rate control
- Priority queue for urgent messages
- Message filtering/deduplication
- Cross-platform support
- Session cleanup for inactive sessions

## Security Considerations

- Messages are truncated to prevent abuse
- No file system access
- No network access
- Runs in user context only
- Limited to `say` command execution
