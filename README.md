# talkback-mcp

Let your MCP talk, so you can listen, not read.

A Model Context Protocol (MCP) server that provides text-to-speech functionality using macOS's `say` command. This allows LLMs to communicate their actions audibly, making it easier for developers to stay informed without constantly reading the screen.

## Features

- ✅ **Initialization**: Get behavioral guidelines for LLM interaction through speech
- ✅ **Message Queuing**: Messages are queued and spoken sequentially
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

```bash
npm run dev
```

Or use the built version:

```bash
node dist/index.js
```

### Available Tools

The server provides five MCP tools:

#### 1. `init`
Initialize the MCP server and receive behavioral guidelines for the LLM. This should be called at the start of a session.

**Parameters:**
None

**Returns:**
- `success`: Boolean indicating success
- `instructions`: String containing behavioral guidelines for the LLM, including:
  - Speak about everything the LLM needs to do
  - Always speak when prompting questions or waiting for answers (user might be busy)
  - Keep speech concise, leaving details for the terminal
  - Introduction with a randomly selected name

**Example:**
```json
{}
```

#### 2. `speak`
Add a message to the speech queue to be spoken aloud.

**Parameters:**
- `message` (string): The message to speak (max 500 characters, auto-truncated)

**Example:**
```json
{
  "message": "Starting to analyze the codebase..."
}
```

#### 3. `cancel_message`
Cancel a specific queued message before it's spoken.

**Parameters:**
- `messageId` (string): The ID of the message to cancel (returned from `speak`)

**Example:**
```json
{
  "messageId": "msg_1234567890_abc123"
}
```

#### 4. `reset_queue`
Reset the entire speech queue and stop any currently playing message. Use this when an action has been cancelled.

**Example:**
```json
{}
```

#### 5. `get_queue_status`
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

1. The LLM can call `init` to receive behavioral guidelines at the start of a session
2. The LLM uses the `speak` tool to queue messages
3. Messages are automatically truncated to 500 characters if needed
4. The queue processes messages sequentially using macOS's `say` command
5. The LLM can cancel individual messages or reset the queue if actions change

## License

ISC
