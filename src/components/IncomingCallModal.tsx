import React, { useState } from 'react';
import { Phone, PhoneOff, Video, MessageSquare } from 'lucide-react';
import { ActiveCall } from '../types';

interface IncomingCallModalProps {
  call: ActiveCall;
  onAccept: () => void;
  onReject: () => void;
  onQuickMessage?: (text: string) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onReject,
  onQuickMessage,
}) => {
  const [showQuickMsg, setShowQuickMsg] = useState(false);
  const caller = call.caller;
  const isVideo = call.callType === 'video';

  const quickMessages = [
    'الان نمی‌توانم صحبت کنم، بعداً تماس می‌گیرم.',
    'در جلسه هستم.',
    'لطفاً پیام متنی بفرستید.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white overflow-hidden">
      {/* Background ambient glowing rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-96 h-96 rounded-full border border-emerald-500/40 animate-ping" />
        <div className="absolute w-[500px] h-[500px] rounded-full border border-emerald-400/20 animate-pulse" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex flex-col items-center pt-8 text-center">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium animate-pulse">
          {isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
          تماس {isVideo ? 'تصویری HD' : 'صوتی'} ورودی...
        </span>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
          {caller?.displayName || 'کاربر ناشناس'}
        </h2>
        <p className="mt-1 text-sm font-mono text-emerald-400">
          @{caller?.username || 'user'}
        </p>
        {caller?.bio && (
          <p className="mt-2 text-xs text-slate-400 max-w-xs line-clamp-1">
            {caller.bio}
          </p>
        )}
      </div>

      {/* Center Caller Avatar with pulsating ring */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-75 blur-xl animate-ring-pulse" />
          <img
            src={caller?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${caller?.username}`}
            alt={caller?.displayName}
            className="relative w-36 h-36 rounded-full object-cover border-4 border-emerald-400/60 shadow-2xl bg-slate-800"
          />
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>در حال زنگ خوردن...</span>
        </div>
      </div>

      {/* Quick message drawer toggle */}
      {showQuickMsg && (
        <div className="relative z-20 mb-4 p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 backdrop-blur-md">
          <p className="text-xs text-slate-400 mb-2 font-medium">پاسخ سریع با پیام:</p>
          <div className="flex flex-col gap-1.5">
            {quickMessages.map((msg, i) => (
              <button
                key={i}
                onClick={() => {
                  if (onQuickMessage) onQuickMessage(msg);
                  onReject();
                }}
                className="text-right text-xs py-2 px-3 rounded-xl bg-slate-700/60 hover:bg-slate-700 active:bg-slate-600 transition"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="relative z-10 flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            onClick={() => setShowQuickMsg(!showQuickMsg)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>پاسخ با پیام</span>
          </button>
        </div>

        <div className="flex items-center justify-around max-w-xs mx-auto w-full px-4">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onReject}
              className="w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 flex items-center justify-center shadow-lg shadow-rose-900/50 transition-all"
              title="رد تماس"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            <span className="text-xs text-rose-400 font-medium">رد تماس</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-18 h-18 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-90 flex items-center justify-center shadow-lg shadow-emerald-900/50 animate-bounce transition-all"
              title="پاسخ به تماس"
            >
              <Phone className="w-8 h-8 text-white fill-white" />
            </button>
            <span className="text-xs text-emerald-400 font-medium">پاسخ دادن</span>
          </div>
        </div>
      </div>
    </div>
  );
};
