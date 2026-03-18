'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@mega/ui';
import { useSocket } from '../../lib/socket-context';
import {
  listNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../lib/notification-api';
import { NotificationItem } from './NotificationItem';
import type { NotificationResponse } from '@mega/shared';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNotifications();
      setNotifications(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { notification: NotificationResponse }) => {
      setNotifications((prev) => [data.notification, ...prev]);
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
  }, [socket]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open) {
      fetchNotifications();
    }
    setOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification: NotificationResponse) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-500 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            )}

            {!loading &&
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
