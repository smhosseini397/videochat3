class NotificationService {
  private wakeLockSentinel: any = null;
  private vibrationInterval: any = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  // Keep screen awake (e.g. while ringing and during active call)
  async acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
      } catch (e) {
        console.warn('Wake Lock request failed:', e);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  // Trigger continuous Android phone vibration during incoming call
  startCallVibration() {
    if ('vibrate' in navigator) {
      const vibratePattern = () => {
        try {
          navigator.vibrate([800, 400, 800, 400, 800]);
        } catch {}
      };
      vibratePattern();
      this.stopCallVibration();
      this.vibrationInterval = setInterval(vibratePattern, 3000);
    }
  }

  stopCallVibration() {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  // Single short vibrate for new message
  vibrateShort() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(150);
      } catch {}
    }
  }

  // Display system notification (visible even when screen is locked or in other app)
  showIncomingCallNotification(callerName: string, callType: 'audio' | 'video', onAnswer?: () => void) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;

    try {
      const title = `📞 تماس ${callType === 'video' ? 'تصویری' : 'صوتی'} ورودی`;
      const options: NotificationOptions = {
        body: `${callerName} در حال تماس با شماست...`,
        icon: '/pwa-192x192.png',
        tag: 'incoming-call',
        requireInteraction: true,
        silent: false,
      };

      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif.close();
        if (onAnswer) onAnswer();
      };
      return notif;
    } catch (e) {
      console.warn('Notification display failed:', e);
      return null;
    }
  }

  showChatMessageNotification(senderName: string, text: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // Don't show if user is looking at app

    try {
      const notif = new Notification(`💬 پیام از ${senderName}`, {
        body: text.length > 50 ? text.substring(0, 50) + '...' : text,
        icon: '/pwa-192x192.png',
        tag: 'new-message',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch {}
  }
}

export const notificationService = new NotificationService();
