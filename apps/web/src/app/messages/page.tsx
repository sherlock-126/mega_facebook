'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ConversationList } from '@/components/message/ConversationList';
import { ChatWindow } from '@/components/message/ChatWindow';
import type { ConversationListItem } from '@mega/shared';

export default function MessagesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeConversation, setActiveConversation] = useState<ConversationListItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-gray-500">Please log in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-5xl">
      <div className="w-80 shrink-0 border-r overflow-hidden flex flex-col">
        <div className="border-b p-4">
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            activeConversationId={activeConversation?.id}
            onSelectConversation={setActiveConversation}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <ChatWindow conversation={activeConversation} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
