// Real-time Event Synchronization & Browser Notifications for Affiliate Partner
const listeners = new Set();
let eventSource = null;
let reconnectTimer = null;

export const subscribeToRealtimeEvents = (callback) => {
  listeners.add(callback);
  ensureConnection();

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
};

const notifyListeners = (event) => {
  listeners.forEach((cb) => {
    try {
      cb(event);
    } catch (err) {
      console.warn('Realtime event listener error:', err);
    }
  });
};

const ensureConnection = () => {
  if (eventSource || typeof window === 'undefined') return;

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const streamUrl = `${baseUrl.replace(/\/+$/, '')}/notifications/stream`;

  try {
    eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload) {
          notifyListeners(payload);

          // Trigger browser notification if allowed & relevant to partner
          if (
            payload.event === 'notification.new' &&
            payload.data &&
            payload.data.role === 'partner'
          ) {
            triggerBrowserNotification(payload.data.title, payload.data.body);
          }
        }
      } catch (err) {
        console.warn('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        if (listeners.size > 0) ensureConnection();
      }, 5000);
    };
  } catch (err) {
    console.warn('Could not establish SSE stream connection:', err);
  }
};

export const requestNotificationPermission = async () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }
  return 'denied';
};

export const triggerBrowserNotification = (title, body) => {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title || 'TurnKey Affiliate Alert', {
        body: body || '',
        icon: '/favicon.ico',
      });
    } catch (err) {
      console.warn('Browser notification error:', err);
    }
  }
};
