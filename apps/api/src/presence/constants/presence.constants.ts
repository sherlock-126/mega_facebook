export const PRESENCE_KEY_PREFIX = 'presence:';
export const PRESENCE_COUNT_SUFFIX = ':count';
export const PRESENCE_PENDING_OFFLINE_SUFFIX = ':pending_offline';

export const PRESENCE_OFFLINE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
export const PRESENCE_COUNT_TTL = 5 * 60; // 5 minutes heartbeat TTL
export const PRESENCE_PENDING_OFFLINE_TTL = 3; // 3 seconds delay
export const PRESENCE_SUBSCRIBE_TTL = 5 * 60; // 5 minutes

export const PRESENCE_BATCH_MAX = 100;

export const PRESENCE_EVENTS = {
  WS_USER_CONNECTED: 'ws.user.connected',
  WS_USER_DISCONNECTED: 'ws.user.disconnected',
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_SUBSCRIBE: 'presence:subscribe',
} as const;
