import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface Session {
  id: string;
  name: string;
  voice: string;
  enabled: boolean;
}

/**
 * Session storage manager that persists sessions to the filesystem
 * using the process PID to ensure session consistency per process
 */
export class SessionStorage {
  private readonly storageDir: string;
  private readonly storageFile: string;
  private sessions: Map<string, Session>;

  constructor() {
    // Use tmpdir with process PID to ensure unique storage per process
    this.storageDir = join(tmpdir(), '.talkback-sessions');
    this.storageFile = join(this.storageDir, `sessions-${process.pid}.json`);
    this.sessions = new Map<string, Session>();
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
    
    // Load existing sessions from disk
    this.load();
  }

  /**
   * Ensure the storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Load sessions from disk
   */
  private load(): void {
    try {
      if (existsSync(this.storageFile)) {
        const data = readFileSync(this.storageFile, 'utf-8');
        const sessionsArray = JSON.parse(data) as Session[];
        this.sessions = new Map(sessionsArray.map(s => [s.id, s]));
      }
    } catch (error) {
      // If there's an error loading, start with empty sessions
      console.error('Error loading sessions from disk:', error);
      this.sessions = new Map<string, Session>();
    }
  }

  /**
   * Save sessions to disk
   */
  private save(): void {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      writeFileSync(this.storageFile, JSON.stringify(sessionsArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving sessions to disk:', error);
    }
  }

  /**
   * Get a session by ID
   */
  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if a session exists
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Set or update a session
   */
  set(sessionId: string, session: Session): void {
    this.sessions.set(sessionId, session);
    this.save();
  }

  /**
   * Get all sessions
   */
  getAll(): Map<string, Session> {
    return this.sessions;
  }
}
