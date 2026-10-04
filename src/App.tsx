import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserProfile,
  ActiveCall,
  ChatMessage,
  GroupRoom,
  CallSettings,
  CallType,
  VideoQuality
} from './types';
import { soundService } from './services/soundService';
import { notificationService } from './services/notificationService';
import { webrtcService } from './services/webrtcService';
import { IncomingCallModal } from './components/IncomingCallModal';
import { CallScreen } from './components/CallScreen';
import { ChatView } from './components/ChatView';
import { ContactsView } from './components/ContactsView';
import { GroupRoomsView } from './components/GroupRoomsView';
import { ProfileModal } from './components/ProfileModal';
import { OnboardingModal } from './components/OnboardingModal';
import { BottomNav, ActiveTab } from './components/BottomNav';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Phone,
  PhoneOff,
  Video,
  Moon,
  Sun,
  BellRing,
  Volume2,
  Shield,
  Smartphone,
  Sparkles
} from 'lucide-react';

const DEFAULT_SETTINGS: CallSettings = {
  videoQuality: '1080p',
  echoCancellation: true,
  noiseSuppression: true,
  cameraFacingMode: 'user',
  ringtoneEnabled: true,
  vibrationEnabled: true,
  wakeLockEnabled: true,
};

export default function App() {
  // User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('avacall_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Theme (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('avacall_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Settings
  const [settings, setSettings] = useState<CallSettings>(() => {
    const saved = localStorage.getItem('avacall_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<ActiveTab>('contacts');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTestRinging, setIsTestRinging] = useState(false);

  // Real-time State
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [groupRooms, setGroupRooms] = useState<GroupRoom[]>([
    {
      id: 'general',
      name: 'اتاق عمومی AvaCall',
      createdBy: 'system',
      participants: [],
      callActive: false,
    },
    {
      id: 'tech_meeting',
      name: 'جلسه فناوری و توسعه',
      createdBy: 'system',
      participants: [],
      callActive: false,
    },
  ]);

  // Chat State
  const [activeChatUser, setActiveChatUser] = useState<UserProfile | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Active Call State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Apply theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('avacall_theme', theme);
  }, [theme]);

  // Save Settings
  const handleUpdateSettings = (updated: Partial<CallSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('avacall_settings', JSON.stringify(next));
      return next;
    });
  };

  // Toggle Theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Save Profile
  const handleSaveProfile = (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const newProfile = { ...currentUser, ...updated };
    setCurrentUser(newProfile);
    localStorage.setItem('avacall_user', JSON.stringify(newProfile));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'register',
          ...newProfile,
        })
      );
    }
  };

  // Stop Ringing helper
  const stopAllRinging = useCallback(() => {
    soundService.stopIncomingRingtone();
    soundService.stopOutgoingRingback();
    notificationService.stopCallVibration();
    notificationService.releaseWakeLock();
    setIsTestRinging(false);
  }, []);

  // WebSocket Setup & Signaling
  const connectWebSocket = useCallback(() => {
    if (!currentUser) return;

    const wsUrl = 'wss://videochat3-q22j.onrender.com/ws';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Register currentUser
      ws.send(
        JSON.stringify({
          type: 'register',
          ...currentUser,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        switch (type) {
          case 'user_list': {
            setOnlineUsers(data.users || []);
            break;
          }

          // Incoming Call Alert
          case 'incoming_call': {
            // Trigger Phone Ringing & Vibrations
            if (settings.ringtoneEnabled) {
              soundService.startIncomingRingtone();
            }
            if (settings.vibrationEnabled) {
              notificationService.startCallVibration();
            }
            if (settings.wakeLockEnabled) {
              notificationService.acquireWakeLock();
            }

            // Show system notification
            notificationService.showIncomingCallNotification(
              data.caller.displayName,
              data.callType,
              () => {
                // User clicked notification to answer
                handleAcceptCall();
              }
            );

            setActiveCall({
              callId: data.callId,
              caller: data.caller,
              callType: data.callType,
              isIncoming: true,
              status: 'incoming_ringing',
            });
            break;
          }

          // Response to outgoing call
          case 'call_response': {
  console.log("CALL RESPONSE RECEIVED:", data);

              if (data.status === 'accepted') {
              soundService.stopOutgoingRingback();
              soundService.playConnectedTone();

              setActiveCall((prev) =>
                prev ? { ...prev, status: 'connected' } : null
              );

              const target = data.fromUsername;

              const pc = webrtcService.getOrCreatePeerConnection(
                target,
                (remoteStream) => {
                  setRemoteStreams((prev) =>
                    new Map(prev).set(target, remoteStream)
                  );
                },
                (targetUser, candidate) => {

                  if (wsRef.current?.readyState !== WebSocket.OPEN) {
                    console.warn("WebSocket not ready - ICE skipped");
                    return;
                  }

                  wsRef.current.send(
                    JSON.stringify({
                      type: 'webrtc_signal',
                      callId: activeCall?.callId,
                      targetUsername: targetUser,
                      signal: {
                        type: 'candidate',
                        candidate,
                      },
                    })
                  );
                }
              );

              const offer = await webrtcService.createOffer(target);


              if (wsRef.current?.readyState === WebSocket.OPEN) {

                wsRef.current.send(
                  JSON.stringify({
                    type: 'webrtc_signal',
                    callId: activeCall?.callId,
                    targetUsername: target,
                    signal: {
                      type: 'offer',
                      sdp: offer,
                    },
                  })
                );

              } else {
                console.warn("WebSocket not ready - offer not sent");
              }


            } else {

              stopAllRinging();
              soundService.playEndCallTone();

              alert(
                data.status === 'busy'
                  ? 'کاربر در حال مکالمه است.'
                  : 'تماس توسط مخاطب رد شد.'
              );

              webrtcService.closeAll();
              setActiveCall(null);
            }

            break;
          }


          case 'call_failed': {

            stopAllRinging();
            soundService.playEndCallTone();

            alert(
              data.message || 'برقراری تماس امکان‌پذیر نیست.'
            );

            webrtcService.closeAll();
            setActiveCall(null);

            break;
          }


          case 'call_ended': {

            stopAllRinging();
            soundService.playEndCallTone();

            webrtcService.closeAll();
            setRemoteStreams(new Map());
            setActiveCall(null);

            break;
          }



          // WebRTC Signaling (Offer / Answer / ICE Candidate)
          case 'webrtc_signal': {

            const from = data.fromUsername;
            const signal = data.signal;


            if (signal.type === 'offer') {

              const pc = webrtcService.getOrCreatePeerConnection(
                from,

                (remoteStream) => {
                  setRemoteStreams((prev) =>
                    new Map(prev).set(from, remoteStream)
                  );
                },


                (targetUser, candidate) => {

                  if (wsRef.current?.readyState !== WebSocket.OPEN) {
                    console.warn("WebSocket not ready - ICE skipped");
                    return;
                  }

                  wsRef.current.send(
                    JSON.stringify({
                      type: 'webrtc_signal',
                      callId: data.callId,
                      targetUsername: targetUser,
                      signal: {
                        type: 'candidate',
                        candidate,
                      },
                    })
                  );

                }
              );


              const answer = await webrtcService.handleOffer(
                from,
                signal.sdp
              );


              if (wsRef.current?.readyState === WebSocket.OPEN) {

                wsRef.current.send(
                  JSON.stringify({
                    type: 'webrtc_signal',
                    callId: data.callId,
                    targetUsername: from,
                    signal: {
                      type: 'answer',
                      sdp: answer,
                    },
                  })
                );

              } else {

                console.warn("WebSocket not ready - answer not sent");

              }

            } else if (signal.type === 'answer') {

              await webrtcService.handleAnswer(
                from,
                signal.sdp
              );

            } else if (signal.type === 'candidate') {

              await webrtcService.handleIceCandidate(
                from,
                signal.candidate
              );

            }

            break;
          }

          // Group Room events
          case 'room_joined': {
            // Received participants in the room
            setActiveCall({
              callId: `room_${data.roomId}`,
              roomId: data.roomId,
              callType: 'video',
              isIncoming: false,
              isGroup: true,
              status: 'connected',
            });

            if (data.messages) {
              setMessages(data.messages);
            }

            break;
          }

          case 'participant_joined': {
            const newUser: UserProfile = data.user;

            setGroupRooms((prev) =>
              prev.map((r) =>
                r.id === data.roomId
                  ? {
                      ...r,
                      participants: [
                        ...r.participants.filter(
                          (p) => p.username !== newUser.username
                        ),
                        newUser,
                      ],
                    }
                  : r
              )
            );

            break;
          }

          case 'participant_left': {
            webrtcService.closePeerConnection(data.username);

            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.delete(data.username);
              return next;
            });

            break;
          }

          // Chat Messages
          case 'chat_history': {
  const history: ChatMessage[] = data.messages || [];

  setMessages((prev) => {
    const all = [...prev, ...history];

    const unique = Array.from(
      new Map(all.map((m) => [m.id, m])).values()
    );

    return unique.sort((a, b) => a.timestamp - b.timestamp);
  });

  break;
}
          case 'new_chat_message': {
            const msg: ChatMessage = data.message;

            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });

            if (msg.senderUsername !== currentUser.username) {
              soundService.playMessagePing();
              notificationService.vibrateShort();

              notificationService.showChatMessageNotification(
                msg.senderDisplayName,
                msg.text ||
                  (msg.voiceUrl
                    ? 'پیام صوتی'
                    : 'یک فایل ارسال شد')
              );

              if (activeTab !== 'chat') {
                setUnreadCount((c) => c + 1);
              }
            }

            break;
          }

          case 'user_typing': {
            setIsTyping(data.isTyping);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error in ws message handling:', err);
      }
    };

    ws.onclose = () => {
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
  }, [currentUser, settings, activeCall, stopAllRinging, activeTab]);

  useEffect(() => {
    if (currentUser) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentUser, connectWebSocket]);

  // Handle URL params for direct call or room join
  // (e.g. ?call=username or ?join=room1)
  useEffect(() => {
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const callTarget = params.get('call');
    const joinRoom = params.get('join');

    if (
      callTarget &&
      callTarget.toLowerCase() !== currentUser.username.toLowerCase()
    ) {
      const user: UserProfile = {
        username: callTarget.toLowerCase(),
        displayName: callTarget,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${callTarget}`,
        status: 'online',
      };

      setActiveChatUser(user);
      setActiveTab('chat');
    } else if (joinRoom) {
      handleJoinGroupRoom(joinRoom, 'video');
    }
  }, [currentUser]);

  // Initiate Outgoing Call
  const handleStartCall = async (
    target: UserProfile,
    type: CallType
  ) => {
    if (!currentUser || !wsRef.current) return;

    try {
      // Start local camera/mic stream with HD constraints
      await webrtcService.startLocalMedia(
        type,
        settings.videoQuality,
        settings.cameraFacingMode
      );

      const callId = `call_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

      setActiveCall({
        callId,
        targetUser: target,
        caller: currentUser,
        callType: type,
        isIncoming: false,
        status: 'outgoing_ringing',
      });

      // Play outgoing ringback beep
      soundService.startOutgoingRingback();

      // Send call invite to server
      wsRef.current.send(
        JSON.stringify({
          type: 'call_invite',
          callId,
          targetUsername: target.username,
          callType: type,
        })
      );
    } catch (err) {
      alert('دسترسی به دوربین یا میکروفون امکان‌پذیر نیست.');
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    if (!activeCall || !wsRef.current) return;

    stopAllRinging();

    try {
      // Start local media stream
      await webrtcService.startLocalMedia(
        activeCall.callType,
        settings.videoQuality,
        settings.cameraFacingMode
      );

      // Notify caller
      wsRef.current.send(
        JSON.stringify({
          type: 'call_response',
          callId: activeCall.callId,
          targetUsername: activeCall.caller?.username,
          status: 'accepted',
        })
      );

      setActiveCall((prev) =>
        prev ? { ...prev, status: 'connected' } : null
      );
    } catch (err) {
      alert('خطا در دسترسی به دوربین یا میکروفون');
      handleRejectCall();
    }
  };

  // Reject Incoming Call
  const handleRejectCall = () => {
    if (!activeCall || !wsRef.current) return;

    stopAllRinging();

    wsRef.current.send(
      JSON.stringify({
        type: 'call_response',
        callId: activeCall.callId,
        targetUsername: activeCall.caller?.username,
        status: 'rejected',
      })
    );

    setActiveCall(null);
  };

  // End Active Call
  const handleEndCall = () => {
    stopAllRinging();
    soundService.playEndCallTone();

    if (activeCall && wsRef.current) {
      if (activeCall.isGroup && activeCall.roomId) {
        wsRef.current.send(
          JSON.stringify({
            type: 'leave_room',
            roomId: activeCall.roomId,
          })
        );
      } else {
        const targetUsername =
          activeCall.targetUser?.username ||
          activeCall.caller?.username;

        if (targetUsername) {
          wsRef.current.send(
            JSON.stringify({
              type: 'call_end',
              callId: activeCall.callId,
              targetUsername,
            })
          );
        }
      }
    }

    webrtcService.closeAll();
    setRemoteStreams(new Map());
    setActiveCall(null);
  };

  // Join Group Room
  const handleJoinGroupRoom = async (
    roomId: string,
    callType: CallType = 'video'
  ) => {
    if (!currentUser || !wsRef.current) return;

    try {
      await webrtcService.startLocalMedia(
        callType,
        settings.videoQuality,
        settings.cameraFacingMode
      );

      wsRef.current.send(
        JSON.stringify({
          type: 'join_room',
          roomId,
          callType,
        })
      );

      setActiveRoomId(roomId);
    } catch (err) {
      alert('خطا در راه‌اندازی دوربین/میکروفون برای تماس گروهی');
    }
  };

  // Create Group Room
  const handleCreateGroupRoom = (roomName: string) => {
    if (!currentUser) return;

    const roomId = `room_${Date.now().toString(36)}`;

    const newRoom: GroupRoom = {
      id: roomId,
      name: roomName,
      createdBy: currentUser.username,
      participants: [currentUser],
      callActive: true,
    };

    setGroupRooms((prev) => [newRoom, ...prev]);
    handleJoinGroupRoom(roomId, 'video');
  };

  // Send Chat Message (Text, Voice, Large File)
  const handleSendMessage = (payload: {
  text?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  file?: any;
}) => {
  if (
    !currentUser ||
    !wsRef.current ||
    wsRef.current.readyState !== WebSocket.OPEN
  ) {
    console.log("WebSocket not ready");
    return;
  }

  wsRef.current.send(
    JSON.stringify({
      type: 'chat_message',
      targetUsername: activeChatUser?.username,
      roomId: activeRoomId || undefined,
      ...payload,
    })
  );
};

  // Send Typing Indicator
  const handleSendTyping = (typingState: boolean) => {
    if (!wsRef.current) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'typing',
        targetUsername: activeChatUser?.username,
        roomId: activeRoomId || undefined,
        isTyping: typingState,
      })
    );
  };

  // Test Ringtone & Notification Simulator
  const handleTestRingtone = async () => {
    await notificationService.requestPermission();
    setIsTestRinging(true);

    if (settings.ringtoneEnabled) {
      soundService.startIncomingRingtone();
    }

    if (settings.vibrationEnabled) {
      notificationService.startCallVibration();
    }

    if (settings.wakeLockEnabled) {
      notificationService.acquireWakeLock();
    }

    notificationService.showIncomingCallNotification(
      'تست تماس اندروید (AvaCall)',
      'video',
      () => {
        stopAllRinging();
      }
    );

    // Stop after 7 seconds
    setTimeout(() => {
      stopAllRinging();
    }, 7000);
  };

  // Onboarding completion
  const handleOnboardingComplete = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('avacall_user', JSON.stringify(user));
  };

  // Filter messages for current chat
  const filteredMessages = messages.filter((m) => {
    if (activeRoomId) return m.roomId === activeRoomId;

    if (activeChatUser) {
      return (
        (m.senderUsername === currentUser?.username &&
          m.targetUsername === activeChatUser.username) ||
        (m.senderUsername === activeChatUser.username &&
          m.targetUsername === currentUser?.username)
      );
    }

    return false;
  });

  // If no user profile created yet -> Show onboarding
  if (!currentUser) {
    return <OnboardingModal onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-['Vazirmatn',sans-serif] overflow-hidden select-none">
      {/* Offline Mode Alert */}
      <OfflineIndicator />

      {/* Top Application Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-slate-950" />
          </div>

          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              <span>AvaCall</span>

              <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Android PWA
              </span>
            </h1>

            <p className="text-[10px] text-slate-400 font-mono">
              @{currentUser.username}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* PWA In-App Install Button */}
          <PWAInstallButton />

          {/* Test Ringtone */}
          <button
            onClick={handleTestRingtone}
            className={`p-2 rounded-xl border transition ${
              isTestRinging
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-bounce'
                : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
            title="تست زنگ و لرزش گوشی"
          >
            <BellRing className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition"
            title={theme === 'dark' ? 'حالت روز' : 'حالت شب'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Profile Avatar */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="مشاهده پروفایل"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500 bg-slate-800 shadow"
            />

            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden pb-16 relative">
        {/* Outgoing Call Ringing Screen */}
        {activeCall && activeCall.status === 'outgoing_ringing' && (
          <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/95 backdrop-blur-xl p-6 text-white text-center">
            <div className="pt-8">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-medium">
                {activeCall.callType === 'video' ? (
                  <Video className="w-3.5 h-3.5" />
                ) : (
                  <Phone className="w-3.5 h-3.5" />
                )}

                تماس{' '}
                {activeCall.callType === 'video'
                  ? 'تصویری'
                  : 'صوتی'}{' '}
                خروجی...
              </span>

              <h2 className="mt-4 text-2xl font-black text-white">
                {activeCall.targetUser?.displayName}
              </h2>

              <p className="text-xs text-emerald-400 font-mono">
                @{activeCall.targetUser?.username}
              </p>
            </div>

            <div className="my-auto flex flex-col items-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-blue-500/30 blur-xl animate-ring-pulse" />

                <img
                  src={activeCall.targetUser?.avatar}
                  alt={activeCall.targetUser?.displayName}
                  className="relative w-36 h-36 rounded-full object-cover border-4 border-blue-500/60 shadow-2xl bg-slate-800"
                />
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span>در حال زنگ خوردن گوشی مخاطب...</span>
              </div>
            </div>

            <div className="pb-8">
              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 mx-auto flex items-center justify-center shadow-xl shadow-rose-900/50 active:scale-90 transition"
                title="قطع تماس"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>

              <span className="block text-xs text-rose-400 mt-2 font-medium">
                لغو تماس
              </span>
            </div>
          </div>
        )}

        {/* Incoming Call Screen Overlay */}
        {activeCall && activeCall.status === 'incoming_ringing' && (
          <IncomingCallModal
            call={activeCall}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            onQuickMessage={(quickText) => {
              handleSendMessage({ text: quickText });
            }}
          />
        )}

        {/* Connected Active Call Screen */}
        {activeCall && activeCall.status === 'connected' && (
          <CallScreen
            call={activeCall}
            currentUser={currentUser}
            remoteStreams={remoteStreams}
            onEndCall={handleEndCall}
            onOpenChat={() => {
              setActiveTab('chat');
            }}
            unreadCount={unreadCount}
          />
        )}

        {/* Tabs Views */}
        {activeTab === 'contacts' && (
          <ContactsView
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            onStartCall={handleStartCall}
            onOpenChat={(user) => {
              setActiveChatUser(user);
              setActiveRoomId(null);
              setActiveTab('chat');
              setUnreadCount(0);
            }}
            onTestRingtone={handleTestRingtone}
            onAddContactByUsername={(target) => {
              setActiveChatUser({
                username: target,
                displayName: target,
                avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${target}`,
                status: 'online',
              });

              setActiveTab('chat');
            }}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            currentUser={currentUser}
            activeChatUser={activeChatUser || undefined}
            roomId={activeRoomId || undefined}
            roomName={
              activeRoomId
                ? groupRooms.find((r) => r.id === activeRoomId)?.name ||
                  activeRoomId
                : undefined
            }
            messages={filteredMessages}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            onSendTyping={handleSendTyping}
            onStartCall={handleStartCall}
            onBack={() => {
              setActiveTab('contacts');
            }}
          />
        )}

        {activeTab === 'groups' && (
          <GroupRoomsView
            currentUser={currentUser}
            rooms={groupRooms}
            onCreateRoom={handleCreateGroupRoom}
            onJoinRoom={(roomId, type) => {
              handleJoinGroupRoom(roomId, type || 'video');
            }}
          />
        )}
      </main>

      {/* Android Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);

          if (tab === 'chat') {
            setUnreadCount(0);
          }
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        unreadMessagesCount={unreadCount}
        onlineCount={onlineUsers.length}
      />

      {/* Profile & Settings Drawer */}
      <ProfileModal
        user={currentUser}
        settings={settings}
        theme={theme}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaveProfile={handleSaveProfile}
        onUpdateSettings={handleUpdateSettings}
        onToggleTheme={toggleTheme}
        onTestRingtone={handleTestRingtone}
      />
    </div>
  );
}
