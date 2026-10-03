import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Camera,
  Mic,
  Bell,
  Sparkles,
  ArrowLeft,
  Check
} from 'lucide-react';
import { UserProfile } from '../types';
import { notificationService } from '../services/notificationService';

interface OnboardingModalProps {
  onComplete: (user: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(1);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const avatarSeeds = ['saman', 'alex', 'maryam', 'david', 'negar', 'aria'];

  const handleRequestPermissions = async () => {
    // Notifications permission
    await notificationService.requestPermission();

    // Media permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {}

    setPermissionRequested(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) return;

    const seed = avatarSeeds[avatarIndex] || cleanUsername;
    const profile: UserProfile = {
      username: cleanUsername,
      displayName: displayName.trim() || cleanUsername,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`,
      bio: 'در دسترس برای تماس صوتی و تصویری HD',
      status: 'online',
    };

    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 text-right">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-slate-950" />
          </div>
          <h2 className="text-xl font-black text-white">خوش آمدید به AvaCall</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            اپلیکیشن تماس صوتی و تصویری اندروید با کیفیت HD و زنگ خوردن در پس‌زمینه
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
              انتخاب آواتار پروفایل:
            </label>
            <div className="flex items-center justify-center gap-2">
              {avatarSeeds.map((seed, idx) => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setAvatarIndex(idx)}
                  className={`w-11 h-11 rounded-full overflow-hidden border-2 transition ${
                    avatarIndex === idx
                      ? 'border-emerald-500 scale-110 shadow-lg shadow-emerald-500/40'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`}
                    alt="seed"
                    className="w-full h-full object-cover bg-slate-800"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              نام کاربری یکتا (یوزرنیم برای دریافت تماس):
            </label>
            <div className="relative">
              <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="مثال: ali_reza"
                className="w-full bg-slate-800 text-white text-xs pr-7 pl-3 py-3 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              حروف انگلیسی کوچک و اعداد مجاز هستند.
            </span>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              نام و نام خانوادگی (نمایشی):
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="مثال: علی رضایی"
              className="w-full bg-slate-800 text-white text-xs px-3 py-3 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Permission card */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">مجوز اعلان و زنگ خوردن</span>
              </div>
              {permissionRequested && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> فعال شد
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              برای زنگ خوردن گوشی هنگام دریافت تماس (حتی در حالت صفحه خاموش) و کارکرد میکروفون، مجوزها را فعال کنید.
            </p>
            {!permissionRequested && (
              <button
                type="button"
                onClick={handleRequestPermissions}
                className="mt-2.5 w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition"
              >
                تایید مجوزهای دوربین، میکروفون و زنگ
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-xl shadow-emerald-900/50 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <span>ورود و ایجاد پروفایل</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
