import React, { useState } from 'react';
import {
  Search,
  Phone,
  Video,
  MessageSquare,
  Share2,
  BellRing,
  UserPlus,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Users
} from 'lucide-react';
import { UserProfile } from '../types';

interface ContactsViewProps {
  currentUser: UserProfile;
  onlineUsers: UserProfile[];
  onStartCall: (user: UserProfile, type: 'audio' | 'video') => void;
  onOpenChat: (user: UserProfile) => void;
  onTestRingtone: () => void;
  onAddContactByUsername: (username: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  currentUser,
  onlineUsers,
  onStartCall,
  onOpenChat,
  onTestRingtone,
  onAddContactByUsername,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [directUsernameInput, setDirectUsernameInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter other users
  const otherUsers = onlineUsers.filter(
    (u) => u.username.toLowerCase() !== currentUser.username.toLowerCase()
  );

  const filteredUsers = otherUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/?call=${currentUser.username}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDirectCallOrChat = (type: 'chat' | 'audio' | 'video') => {
    const target = directUsernameInput.trim().replace('@', '').toLowerCase();
    if (!target) return;

    const existing = onlineUsers.find((u) => u.username.toLowerCase() === target);
    const targetUser: UserProfile = existing || {
      username: target,
      displayName: target,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${target}`,
      status: 'online',
    };

    if (type === 'chat') {
      onOpenChat(targetUser);
    } else {
      onStartCall(targetUser, type);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 overflow-y-auto p-4 space-y-4">
      {/* Test Ringtone Banner - Key requirement */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/30 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">تست زنگ و لرزش گوشی</h4>
            <p className="text-[11px] text-slate-300">
              بررسی پخش آهنگ زنگ و نوتیفیکیشن در حالت صفحه خاموش
            </p>
          </div>
        </div>

        <button
          onClick={onTestRingtone}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow active:scale-95 transition"
        >
          شبیه‌سازی زنگ
        </button>
      </div>

      {/* Share Direct Call Link Card */}
      <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">لینک مستقیم تماس با من:</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">@{currentUser.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`${window.location.origin}/?call=${currentUser.username}`}
            className="flex-1 bg-slate-900 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-700 font-mono outline-none"
          />
          <button
            onClick={handleCopyInviteLink}
            className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center gap-1.5 active:scale-95 transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'کپی شد' : 'کپی لینک'}</span>
          </button>
        </div>
      </div>

      {/* Direct Call / Search by Username */}
      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
        <label className="block text-xs font-medium text-slate-300 mb-2">
          تماس مستقیم با وارد کردن یوزرنیم (نام کاربری):
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-sm">@</span>
            <input
              type="text"
              value={directUsernameInput}
              onChange={(e) => setDirectUsernameInput(e.target.value)}
              placeholder="مثال: ali_reza"
              className="w-full bg-slate-900 text-white text-xs pr-7 pl-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <button
            onClick={() => handleDirectCallOrChat('audio')}
            disabled={!directUsernameInput.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 disabled:opacity-40 text-white hover:bg-emerald-500 transition active:scale-95"
            title="تماس صوتی"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDirectCallOrChat('video')}
            disabled={!directUsernameInput.trim()}
            className="p-2.5 rounded-xl bg-blue-600 disabled:opacity-40 text-white hover:bg-blue-500 transition active:scale-95"
            title="تماس تصویری"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDirectCallOrChat('chat')}
            disabled={!directUsernameInput.trim()}
            className="p-2.5 rounded-xl bg-slate-700 disabled:opacity-40 text-white hover:bg-slate-600 transition active:scale-95"
            title="ارسال پیام"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Online Users List */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200">
              کاربران آنلاین ({otherUsers.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">به‌روزرسانی زنده</span>
        </div>

        {/* Filter input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در بین کاربران..."
            className="w-full bg-slate-800 text-xs text-white pr-9 pl-4 py-2.5 rounded-xl border border-slate-700/70 outline-none focus:border-emerald-500"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-center text-slate-400">
            <Smartphone className="w-10 h-10 mx-auto mb-2 text-slate-500" />
            <p className="text-xs font-medium text-slate-300">
              {otherUsers.length === 0
                ? 'در حال حاضر کاربری آنلاین نیست'
                : 'کاربری با این مشخصات یافت نشد'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              می‌توانید لینک صفحه را در مرورگر یا گوشی دیگری باز کنید یا برای دوستان خود بفرستید تا با هم تست کنید!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.username}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition group"
              >
                {/* User info */}
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden"
                  onClick={() => onOpenChat(user)}
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-600 bg-slate-700"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-800" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition truncate">
                      {user.displayName}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">@{user.username}</p>
                    {user.bio && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[150px] sm:max-w-xs mt-0.5">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenChat(user)}
                    className="p-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 hover:text-white transition active:scale-95"
                    title="چت متنی"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartCall(user, 'audio')}
                    className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition active:scale-95"
                    title="تماس صوتی"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStartCall(user, 'video')}
                    className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition active:scale-95"
                    title="تماس تصویری HD"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
