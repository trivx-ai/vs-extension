import { apiClient } from './api-client';
import { API_ROUTES } from '../constants';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  channel: string;
  metadata?: any;
  createdAt: string;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() { }

  static initialize(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      throw new Error('NotificationService not initialized');
    }
    return NotificationService.instance;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const response = await apiClient.get<any>(API_ROUTES.NOTIFICATIONS(userId));
      return response.notifications || response.data || response || [];
    } catch (error) {
      logger.error('Failed to get notifications', error);
      return [];
    }
  }
}
