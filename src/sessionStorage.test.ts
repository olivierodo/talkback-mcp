import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionStorage, Session } from './sessionStorage';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SessionStorage', () => {
  let storage: SessionStorage;
  const storageDir = join(tmpdir(), '.talkback-sessions');
  const storageFile = join(storageDir, `sessions-${process.pid}.json`);

  beforeEach(() => {
    // Clean up any existing storage before each test
    if (existsSync(storageFile)) {
      rmSync(storageFile);
    }
    storage = new SessionStorage();
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(storageFile)) {
      rmSync(storageFile);
    }
  });

  describe('initialization', () => {
    it('should create storage directory if it does not exist', () => {
      expect(existsSync(storageDir)).toBe(true);
    });

    it('should start with empty sessions if no file exists', () => {
      expect(storage.has('test-session')).toBe(false);
    });
  });

  describe('session management', () => {
    it('should store and retrieve a session', () => {
      const session: Session = {
        id: 'session1',
        name: 'Alex',
        voice: 'Alex',
        enabled: true,
      };

      storage.set('session1', session);
      const retrieved = storage.get('session1');

      expect(retrieved).toEqual(session);
    });

    it('should check if a session exists', () => {
      const session: Session = {
        id: 'session2',
        name: 'Morgan',
        voice: 'Daniel',
        enabled: false,
      };

      expect(storage.has('session2')).toBe(false);
      storage.set('session2', session);
      expect(storage.has('session2')).toBe(true);
    });

    it('should return undefined for non-existent session', () => {
      expect(storage.get('non-existent')).toBeUndefined();
    });

    it('should update an existing session', () => {
      const session: Session = {
        id: 'session3',
        name: 'Jordan',
        voice: 'Fred',
        enabled: false,
      };

      storage.set('session3', session);
      
      // Update the session
      session.enabled = true;
      storage.set('session3', session);

      const retrieved = storage.get('session3');
      expect(retrieved?.enabled).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist sessions to disk', () => {
      const session: Session = {
        id: 'persistent-session',
        name: 'Taylor',
        voice: 'Karen',
        enabled: true,
      };

      storage.set('persistent-session', session);

      // Verify file exists
      expect(existsSync(storageFile)).toBe(true);
    });

    it('should load sessions from disk on initialization', () => {
      const session: Session = {
        id: 'loaded-session',
        name: 'Casey',
        voice: 'Moira',
        enabled: true,
      };

      storage.set('loaded-session', session);

      // Create a new storage instance
      const newStorage = new SessionStorage();
      const retrieved = newStorage.get('loaded-session');

      expect(retrieved).toEqual(session);
    });

    it('should maintain session consistency across multiple operations', () => {
      const session1: Session = {
        id: 'session-a',
        name: 'Riley',
        voice: 'Samantha',
        enabled: false,
      };

      const session2: Session = {
        id: 'session-b',
        name: 'Quinn',
        voice: 'Victoria',
        enabled: true,
      };

      storage.set('session-a', session1);
      storage.set('session-b', session2);

      // Create a new storage instance to test persistence
      const newStorage = new SessionStorage();
      
      expect(newStorage.get('session-a')).toEqual(session1);
      expect(newStorage.get('session-b')).toEqual(session2);
    });

    it('should preserve voice assignment for the same session ID', () => {
      const session: Session = {
        id: 'voice-test-session',
        name: 'Avery',
        voice: 'Fiona',
        enabled: false,
      };

      storage.set('voice-test-session', session);

      // Create a new storage instance
      const newStorage = new SessionStorage();
      const retrieved = newStorage.get('voice-test-session');

      expect(retrieved?.voice).toBe('Fiona');
    });
  });

  describe('error handling', () => {
    it('should handle corrupt storage files gracefully', () => {
      const { writeFileSync } = require('fs');
      
      // Write invalid JSON
      writeFileSync(storageFile, 'invalid json content', 'utf-8');

      // Should not throw, but start with empty sessions
      const newStorage = new SessionStorage();
      expect(newStorage.has('any-session')).toBe(false);
    });
  });
});
