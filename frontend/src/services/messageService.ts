import { api } from './api';

export interface MessageDto {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  /** "TEXT" | "IMAGE" */
  type: string;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationDto {
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  peerUniversity?: string | null;
  peerIsOnline: boolean;
  lastMessage: string;
  lastMessageType: string;
  lastMessageTime?: string | null;
  unreadCount: number;
}

export interface PagedMessages {
  content: MessageDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const MessageService = {
  /** GET /api/messages/conversations — all conversations, most-recent first */
  getConversations: (): Promise<ConversationDto[]> =>
    api.get<ConversationDto[]>('/messages/conversations'),

  /**
   * GET /api/messages/{peerId}?page=0&size=50
   * Paginated message history between the current user and a peer.
   */
  getHistory: (peerId: string, page = 0, size = 50): Promise<PagedMessages> =>
    api.get<PagedMessages>(`/messages/${peerId}?page=${page}&size=${size}`),

  /** PATCH /api/messages/{peerId}/read — mark all messages from peerId as read */
  markRead: (peerId: string): Promise<void> =>
    api.patch<void>(`/messages/${peerId}/read`, {}),
};
