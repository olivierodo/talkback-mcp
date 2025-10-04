import { spawn, ChildProcess } from 'child_process';

export interface QueuedMessage {
  id: string;
  message: string;
  timestamp: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private currentProcess: ChildProcess | null = null;
  private maxMessageLength: number;

  constructor(maxMessageLength = 500) {
    this.maxMessageLength = maxMessageLength;
  }

  /**
   * Add a message to the queue
   */
  enqueue(message: string): QueuedMessage {
    const truncatedMessage = this.truncateMessage(message);
    const queuedMessage: QueuedMessage = {
      id: this.generateId(),
      message: truncatedMessage,
      timestamp: Date.now(),
    };
    
    this.queue.push(queuedMessage);
    
    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return queuedMessage;
  }

  /**
   * Cancel a specific message by ID
   */
  cancel(messageId: string): boolean {
    const index = this.queue.findIndex(msg => msg.id === messageId);
    
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Reset the entire queue and stop current playback
   */
  reset(): void {
    this.queue = [];
    this.stopCurrentPlayback();
  }

  /**
   * Get the current queue status
   */
  getStatus(): { queueLength: number; isProcessing: boolean; queue: QueuedMessage[] } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      queue: [...this.queue],
    };
  }

  /**
   * Truncate message to max length
   */
  private truncateMessage(message: string): string {
    if (message.length <= this.maxMessageLength) {
      return message;
    }
    
    return message.substring(0, this.maxMessageLength - 3) + '...';
  }

  /**
   * Generate a unique ID for messages
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const message = this.queue[0];
      
      try {
        await this.speak(message.message);
        this.queue.shift(); // Remove the processed message
      } catch (error) {
        console.error('Error speaking message:', error);
        this.queue.shift(); // Remove the failed message to continue processing
      }
    }

    this.isProcessing = false;
  }

  /**
   * Speak a message using the 'say' command (macOS)
   */
  private speak(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentProcess = spawn('say', [message]);

      this.currentProcess.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`say command exited with code ${code}`));
        }
      });

      this.currentProcess.on('error', (error) => {
        this.currentProcess = null;
        reject(error);
      });
    });
  }

  /**
   * Stop the current playback
   */
  private stopCurrentPlayback(): void {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
  }
}
