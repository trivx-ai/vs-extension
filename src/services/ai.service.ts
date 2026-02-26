import * as vscode from 'vscode';
import { apiClient } from './api-client';
import { API_ROUTES } from '../constants';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  createdAt?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  organizationId?: string;
  projectId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface StreamCallbacks {
  onIntent?: (intent: string) => void;
  onChunk: (text: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export class AIService {
  private static instance: AIService;
  private abortController: AbortController | null = null;

  private constructor() {}

  static initialize(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      throw new Error('AIService not initialized');
    }
    return AIService.instance;
  }

  async sendMessage(data: {
    message: string;
    userId: string;
    organizationId: string;
    projectId?: string;
    sessionId?: string;
  }): Promise<ChatMessage> {
    try {
      const response = await apiClient.post<any>(API_ROUTES.AI_CHAT, data);
      return response.message || response.data || response;
    } catch (error) {
      logger.error('Failed to send AI message', error);
      throw error;
    }
  }

  async streamMessage(
    data: {
      message: string;
      userId: string;
      organizationId: string;
      projectId?: string;
      sessionId?: string;
      model?: string;
    },
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.abortController = new AbortController();

    try {
      await apiClient.stream(
        API_ROUTES.AI_CHAT_STREAM,
        data,
        {
          onChunk: callbacks.onChunk,
          onIntent: callbacks.onIntent,
          onDone: callbacks.onDone,
          onError: callbacks.onError,
        },
        this.abortController.signal
      );
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.info('AI stream was cancelled');
        return;
      }
      logger.error('AI stream error', error);
      callbacks.onError?.(error.message || 'Stream failed');
    } finally {
      this.abortController = null;
    }
  }

  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      logger.info('Cancelled AI stream');
    }
  }

  async getSessions(userId: string, orgId: string): Promise<ChatSession[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.AI_SESSIONS, {
        userId,
        organizationId: orgId,
      });
      return response.sessions || response.data || response || [];
    } catch (error) {
      logger.error('Failed to get AI sessions', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.AI_SESSION(sessionId));
      return response.session || response.data || response;
    } catch (error) {
      logger.error('Failed to get AI session', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await apiClient.delete(API_ROUTES.AI_SESSION(sessionId));
      return true;
    } catch (error) {
      logger.error('Failed to delete AI session', error);
      return false;
    }
  }

  async getProjectContext(projectId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.AI_CONTEXT(projectId));
      return response.context || response.data || response;
    } catch (error) {
      logger.error('Failed to get AI context', error);
      return null;
    }
  }
}
