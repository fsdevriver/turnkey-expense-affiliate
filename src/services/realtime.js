// Real-time Event Synchronization & Browser Notifications for TurnkeyExpense Affiliate Portal
const listeners = new Set();
let eventSource = null;
let reconnectTimer = null;

// Notification ping audio alert using Web Audio API
const playPingTone = () => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Play a gentle notification ping: C6 (1046.5 Hz) bell tone
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    osc.start(now);
    osc.stop(now + 0.35);

    gainNode.gain.setValueAtTime(0.09, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
  } catch (err) {
    // Autoplay policy fallback
  }
};

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

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.turnkeyexpense.com';
  const token = localStorage.getItem('turnkey_partner_token');
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  const streamUrl = `${baseUrl.replace(/\/+$/, '')}/notifications/stream${tokenQuery}`;

  try {
    eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload) {
          notifyListeners(payload);

          // Handle incoming partner notifications and trigger OS push notifications
          if (payload.event === 'notification.new' && payload.data) {
            triggerBrowserNotification(payload.data.title, payload.data.body);
          } else if (payload.event === 'partner_referral_reward') {
            const amount = Number(payload.data?.amount || 0).toFixed(2);
            const name = payload.data?.refereeName || 'A referred user';
            triggerBrowserNotification(
              'New Commission Earned!',
              `Your referred user ${name} completed their first expense. $${amount} commission added to your wallet balance.`
            );
          } else if (payload.event === 'payout_processed') {
            const amount = Number(payload.data?.amount || 0).toFixed(2);
            triggerBrowserNotification(
              'Payout Approved!',
              `Your payout request of $${amount} has been processed via Tremendous.`
            );
          } else if (payload.event === 'payout_rejected') {
            const amount = Number(payload.data?.amount || 0).toFixed(2);
            const reason = payload.data?.reason || 'Verification requirements not met';
            triggerBrowserNotification(
              'Payout Request Update',
              `Your payout request of $${amount} was declined. ${reason}. Funds have been refunded to your wallet.`
            );
          } else if (payload.event === 'partner_bonus_queued') {
            const amount = Number(payload.data?.amount || 0).toFixed(2);
            triggerBrowserNotification(
              'Bonus Reserved',
              `Your referral commission of $${amount} is reserved and scheduled for release on the 1st of next month.`
            );
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
  // Play notification ping
  playPingTone();

  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title || 'TurnkeyExpense Affiliate Alert', {
        body: body || '',
        icon: '/favicon.ico',
      });
    } catch (err) {
      console.warn('Browser notification error:', err);
    }
  }
};
