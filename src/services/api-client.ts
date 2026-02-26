import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getConfig } from '../utils/config';
import { handleApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ApiClient {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL?: string) {
    const config = getConfig();
    this.axiosInstance = axios.create({
      baseURL: baseURL || config.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (reqConfig) => {
        if (this.token) {
          reqConfig.headers.Authorization = `Bearer ${this.token}`;
        }
        logger.debug(`[API] ${reqConfig.method?.toUpperCase()} ${reqConfig.url}`);
        return reqConfig;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`[API] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const status = error.response?.status || 'NET';
        logger.error(`[API] ${status} ${error.config?.url}`, error.message);
        throw handleApiError(error);
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(path, { params });
    return response.data;
  }

  async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(path, data, config);
    return response.data;
  }

  async patch<T>(path: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.patch(path, data);
    return response.data;
  }

  async put<T>(path: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(path, data);
    return response.data;
  }

  async delete<T>(path: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(path);
    return response.data;
  }

  /**
   * SSE streaming for AI chat.
   * Makes a POST request and reads the response as a stream of text/event-stream chunks.
   */
  async stream(
    path: string,
    data: any,
    callbacks: {
      onChunk: (text: string) => void;
      onIntent?: (intent: string) => void;
      onDone?: () => void;
      onError?: (error: string) => void;
    },
    abortSignal?: AbortSignal
  ): Promise<void> {
    const config = getConfig();
    const url = `${config.apiBaseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body for stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            // Next line should be data
            continue;
          }
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6);

            // Try to parse as JSON first
            try {
              const parsed = JSON.parse(eventData);
              if (parsed.type === 'intent' && callbacks.onIntent) {
                callbacks.onIntent(parsed.data || parsed.intent);
              } else if (parsed.type === 'chunk') {
                callbacks.onChunk(parsed.data || parsed.text || '');
              } else if (parsed.type === 'done') {
                callbacks.onDone?.();
              } else if (parsed.type === 'error') {
                callbacks.onError?.(parsed.data || parsed.error || 'Unknown error');
              } else {
                // Generic chunk
                callbacks.onChunk(parsed.data || parsed.text || eventData);
              }
            } catch {
              // Plain text chunk
              if (eventData === '[DONE]') {
                callbacks.onDone?.();
              } else {
                callbacks.onChunk(eventData);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    callbacks.onDone?.();
  }
}

// Pre-configured singleton
export const apiClient = new ApiClient();
