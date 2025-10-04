# talkback-mcp

Let your MCP talk, so you can listen, not read.

A Model Context Protocol (MCP) server that provides text-to-speech functionality using macOS's `say` command. This allows LLMs to communicate their actions audibly, making it easier for developers to stay informed without constantly reading the screen.

## Features

- ✅ **Enable/Disable Speech**: Control when the LLM should speak with enable/disable commands
- ✅ **Multi-Session Support**: Handle multiple concurrent sessions with unique voices per session
- ✅ **Voice Differentiation**: Each session uses a different voice for easy identification
- ✅ **Session Persistence**: Sessions are persisted to filesystem using process PID for voice consistency
- ✅ **Message Queuing**: Messages are queued and spoken sequentially across all sessions
- ✅ **Shared Queue**: Prevents overlapping speech from multiple sessions
- ✅ **Character Limiting**: Automatically truncates messages longer than 500 characters
- ✅ **Queue Management**: Cancel specific messages or reset the entire queue
- ✅ **Action Awareness**: LLMs can notify developers of their current actions through speech

## Installation

```bash
npm install
npm run build
```

## Usage

### Running the Server

**Normal mode (default):**
```bash
npm run dev
```

Or use the built version:

```bash
node dist/index.js
```

**Debug mode:**
```bash
node dist/index.js --debug
```

In normal mode, the server responds with simple emoji acknowledgements:
- 🔊 for successful operations
- 🔇 for failed operations

In debug mode, the server provides full JSON responses with detailed information including messageId, message, voices, queuePosition, and success status.

### Available Tools

The server provides six MCP tools:

#### 1. `enable`
Enable the speech feature for this session. The LLM will receive behavioral instructions and will introduce itself by speaking. Once enabled, the LLM MUST speak brief summaries for every action and instruction. Each session is assigned a unique voice for easy identification.

**Parameters:**
- `sessionId` (string): Unique identifier for this session. Use a consistent ID across calls to maintain the same voice.

**Returns:**
- `success`: Boolean indicating success
- `sessionId`: The session identifier
- `name`: Randomly assigned name for this session
- `voice`: The voice assigned to this session
- `enabled`: Boolean indicating speech is now enabled
- `introduction`: Brief introduction message that will be spoken
- `introductionMessageId`: The message ID of the queued introduction
- `instructions`: String containing behavioral guidelines for the LLM, instructing it to start speaking NOW for all actions

**Example:**
```json
{
  "sessionId": "my-unique-session-id"
}
```

#### 2. `disable`
Disable the speech feature for this session. The LLM will stop speaking and will only communicate through text.

**Parameters:**
- `sessionId` (string): Unique identifier for the session to disable.

**Returns:**
- `success`: Boolean indicating success
- `sessionId`: The session identifier
- `enabled`: Boolean indicating speech is now disabled
- `message`: Confirmation message

**Example:**
```json
{
  "sessionId": "my-unique-session-id"
}
```

#### 3. `speak`
Add a message to the speech queue to be spoken aloud. The message will be spoken using the voice assigned to your session. **Note:** Speech must be enabled for the session first by calling the `enable` tool.

**Parameters:**
- `message` (string): The message to speak (max 500 characters, auto-truncated)
- `sessionId` (string): Session identifier to use the assigned voice for this session

**Example:**
```json
{
  "message": "Starting to analyze the codebase...",
  "sessionId": "my-unique-session-id"
}
```

#### 4. `cancel_message`
Cancel a specific queued message before it's spoken.

**Parameters:**
- `messageId` (string): The ID of the message to cancel (returned from `speak`)

**Example:**
```json
{
  "messageId": "msg_1234567890_abc123"
}
```

#### 5. `reset_queue`
Reset the entire speech queue and stop any currently playing message. Use this when an action has been cancelled.

**Example:**
```json
{}
```

#### 6. `get_queue_status`
Get the current status of the speech queue.

**Returns:**
- `queueLength`: Number of messages in queue
- `isProcessing`: Whether a message is currently being spoken
- `queue`: Array of queued messages with their IDs

**Example:**
```json
{}
```

## Configuration in MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

**Normal mode:**
```json
{
  "mcpServers": {
    "talkback": {
      "command": "node",
      "args": ["/path/to/talkback-mcp/dist/index.js"]
    }
  }
}
```

**Debug mode:**
```json
{
  "mcpServers": {
    "talkback": {
      "command": "node",
      "args": ["/path/to/talkback-mcp/dist/index.js", "--debug"]
    }
  }
}
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Testing

```bash
npm test           # Run tests once
npm run test:watch # Run tests in watch mode
npm run test:ui    # Run tests with UI
```

## Requirements

- macOS (uses the `say` command)
- Node.js 18+

## How It Works

1. The LLM calls `enable` with a `sessionId` to enable the speech feature and get assigned a unique voice
2. Upon enabling, the LLM receives a brief introduction message that is immediately queued to be spoken
3. The LLM also receives behavioral guidelines in the JSON response, instructing it to speak NOW for all actions
4. Each session gets a different voice (e.g., Alex, Daniel, Samantha) for easy identification
5. Session data (including voice assignments) is persisted to the filesystem using the process PID as an identifier
6. This ensures that the same `sessionId` maintains the same voice across all tool calls within the same process
7. The LLM uses the `speak` tool with its `sessionId` to queue messages (only works if speech is enabled)
8. Messages are automatically truncated to 500 characters if needed
9. The queue is shared across all sessions and processes messages sequentially using macOS's `say` command
10. This prevents overlapping speech from multiple concurrent sessions
11. The LLM can cancel individual messages or reset the queue if actions change
12. The LLM can call `disable` to turn off speech for a session
13. Sessions are stored in `tmpdir()/.talkback-sessions/sessions-<PID>.json` for persistence

## License

ISC
