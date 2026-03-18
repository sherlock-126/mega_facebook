'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mega/ui';
import { Skeleton } from '@mega/ui';
import { useAuth } from '../../lib/auth-context';
import { useSocket } from '../../lib/socket-context';
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../lib/notification-api';
import { NotificationItem } from '../../components/notification/NotificationItem';
import type { NotificationResponse, NotificationType } from '@mega/shared';

interface TabConfig {
  label: string;
  types: string | undefined;
}

const TABS: Record<string, TabConfig> = {
  all: { label: 'All', types: undefined },
  messages: { label: 'Messages', types: 'NEW_MESSAGE' },
  friends: { label: 'Friends', types: 'FRIEND_REQUEST,FRIEND_ACCEPTED' },
  reactions: { label: 'Reactions', types: 'REACTION' },
  comments: { label: 'Comments', types: 'COMMENT,COMMENT_REPLY' },
};

const READ_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Unread', value: 'false' },
] as const;

function getNavigationUrl(notification: NotificationResponse): string | null {
  switch (notification.type) {
    case 'NEW_MESSAGE':
      return notification.targetId ? `/messages?conversation=${notification.targetId}` : null;
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return `/profile/${notification.actorId}`;
    case 'REACTION':
    case 'COMMENT':
    case 'COMMENT_REPLY':
      return notification.targetId ? `/post/${notification.targetId}` : null;
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [readFilter, setReadFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request generation counter to discard stale responses
  const requestGenRef = useRef(0);

  const fetchNotifications = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setLoading(true);
      setError(null);
      const gen = ++requestGenRef.current;

      try {
        const tabConfig = TABS[activeTab];
        const res = await listNotifications(pageNum, 20, {
          type: tabConfig.types,
          isRead: readFilter,
        });

        // Discard stale response
        if (gen !== requestGenRef.current) return;

        if (append) {
          setNotifications((prev) => [...prev, ...res.data]);
        } else {
          setNotifications(res.data);
        }
        setTotalPages(res.meta.totalPages);
        setPage(pageNum);
      } catch {
        if (gen !== requestGenRef.current) return;
        setError('Failed to load notifications. Please try again.');
      } finally {
        if (gen === requestGenRef.current) {
          setLoading(false);
        }
      }
    },
    [activeTab, readFilter],
  );

  // Fetch on mount and when filters change
  useEffect(() => {
    if (!isAuthenticated) return;
    setPage(1);
    fetchNotifications(1);
  }, [isAuthenticated, fetchNotifications]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { notification: NotificationResponse }) => {
      const n = data.notification;
      const tabConfig = TABS[activeTab];

      // Check if notification matches current type filter
      if (tabConfig.types) {
        const allowedTypes = tabConfig.types.split(',');
        if (!allowedTypes.includes(n.type)) {
          // Still update unread count even if not showing
          setUnreadCount((prev) => prev + 1);
          return;
        }
      }

      // Check if notification matches current read filter
      if (readFilter === 'true' && !n.isRead) {
        setUnreadCount((prev) => prev + 1);
        return;
      }

      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleUnreadCount = (data: { count: number }) => {
      setUnreadCount(data.count);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread_count', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread_count', handleUnreadCount);
    };
  }, [socket, activeTab, readFilter]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleReadFilterChange = (value: string | undefined) => {
    setReadFilter(value);
  };

  const handleLoadMore = () => {
    fetchNotifications(page + 1, true);
  };

  const handleNotificationClick = async (notification: NotificationResponse) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        );
      } catch {
        // Don't block navigation on error
      }
    }

    const url = getNavigationUrl(notification);
    if (url) {
      router.push(url);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      // If viewing "Unread" filter, clear the list
      if (readFilter === 'false') {
        setNotifications([]);
      }
    } catch {
      setError('Failed to mark all as read.');
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 text-center text-gray-500">
        Please log in to view notifications.
      </div>
    );
  }

  const emptyMessage = readFilter === 'false'
    ? 'No unread notifications'
    : activeTab === 'messages'
      ? 'No message notifications'
      : activeTab === 'friends'
        ? 'No friend notifications'
        : activeTab === 'reactions'
          ? 'No reaction notifications'
          : activeTab === 'comments'
            ? 'No comment notifications'
            : 'No notifications yet';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Type tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b">
        {Object.entries(TABS).map(([key, tab]) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Read filter */}
      <div className="mb-4 flex gap-2">
        {READ_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={readFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleReadFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-1">
        {!loading && notifications.length === 0 && (
          <div className="py-12 text-center text-gray-500">{emptyMessage}</div>
        )}

        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={() => handleNotificationClick(notification)}
          />
        ))}

        {loading && (
          <div className="space-y-3 py-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}
      </div>

      {/* Load more */}
      {!loading && page < totalPages && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
