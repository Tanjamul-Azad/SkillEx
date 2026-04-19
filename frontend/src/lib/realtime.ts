import type { Notification, NotificationType } from '@/types';

export const REALTIME_NOTIFICATION_EVENT = 'skillex:notification';

function parseCreatedAt(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (Array.isArray(value) && value.length >= 5) {
    const [year, month, day, hour, minute, second = 0, nano = 0] = value;
    if (
      typeof year === 'number' &&
      typeof month === 'number' &&
      typeof day === 'number' &&
      typeof hour === 'number' &&
      typeof minute === 'number'
    ) {
      const millis = typeof nano === 'number' ? Math.floor(nano / 1_000_000) : 0;
      return new Date(year, month - 1, day, hour, minute, typeof second === 'number' ? second : 0, millis).toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeNotificationType(value: unknown): NotificationType {
  if (typeof value !== 'string') {
    return 'SYSTEM_UPDATE';
  }

  const normalized = value.toUpperCase();
  const knownTypes: NotificationType[] = [
    'MATCH_REQUEST',
    'CONNECTION_REQUEST',
    'CONNECTION_ACCEPTED',
    'SESSION_SCHEDULED',
    'REVIEW_LEFT',
    'SYSTEM_UPDATE',
  ];

  return knownTypes.includes(normalized as NotificationType)
    ? (normalized as NotificationType)
    : 'SYSTEM_UPDATE';
}

export function normalizeNotificationPayload(payload: unknown): Notification | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const id = typeof data.id === 'string' ? data.id : null;
  const message = typeof data.message === 'string' ? data.message : '';

  if (!id) {
    return null;
  }

  const fromUserRaw = data.fromUser;
  const fromUser =
    fromUserRaw && typeof fromUserRaw === 'object'
      ? {
          id: typeof (fromUserRaw as Record<string, unknown>).id === 'string'
            ? (fromUserRaw as Record<string, unknown>).id as string
            : '',
          name: typeof (fromUserRaw as Record<string, unknown>).name === 'string'
            ? (fromUserRaw as Record<string, unknown>).name as string
            : undefined,
          avatar: typeof (fromUserRaw as Record<string, unknown>).avatar === 'string'
            ? (fromUserRaw as Record<string, unknown>).avatar as string
            : null,
        }
      : undefined;

  return {
    id,
    type: normalizeNotificationType(data.type),
    message,
    fromUser: fromUser?.id ? fromUser : undefined,
    createdAt: parseCreatedAt(data.createdAt),
    isRead: Boolean(data.isRead),
  };
}

export function emitRealtimeNotification(notification: Notification): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent<Notification>(REALTIME_NOTIFICATION_EVENT, { detail: notification }));
}

export function onRealtimeNotification(listener: (notification: Notification) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<Notification>;
    if (!customEvent.detail) {
      return;
    }
    listener(customEvent.detail);
  };

  window.addEventListener(REALTIME_NOTIFICATION_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(REALTIME_NOTIFICATION_EVENT, handler as EventListener);
  };
}
