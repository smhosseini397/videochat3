import React, { useState } from 'react';
import {
  X,
  User,
  Moon,
  Sun,
  Volume2,
  Vibrate,
  Smartphone,
  Check,
  Camera,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { CallSettings, UserProfile } from '../types';

interface ProfileModalProps {
  user: UserProfile;
  settings: CallSettings;
  theme: 'dark' | 'light';
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (updated: Partial<UserProfile>) => void;
  onUpdateSettings: (updated: Partial<CallSettings>) => void;
  onToggleTheme: () => void;
  onTestRingtone: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  settings,
  theme,
  isOpen,
  onClose,
  onSaveProfile,
  onUpdateSettings,
  onToggleTheme,
  onTestRingtone,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [status, setStatus] = useState(user.status);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 9);
    setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    onSaveProfile({
      displayName: displayName.trim() || cleanUsername,
      username: cleanUsername,
      bio: bio.trim(),
      avatar,
      status,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 text-right">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">پروفایل و تنظیمات کاربری</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Avatar selection */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group">
              <img
                src={avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl bg-slate-800"
              />
              <button
                type="button"
                onClick={handleRandomAvatar}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-95 transition"
                title="تولید آواتار جدید"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <span className="text-[11px] text-slate-400 mt-2">برای تغییر آیکون روی دکمه چرخش بزنید</span>
          </div>

          {/* Username (یوزرنیم یکتا) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              نام کاربری (یوزرنیم):
            </label>
            <div className="relative">
              <span className="absolute right-3 top-2.5 text-slate-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-800 text-white text-xs pr-7 pl-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 font-mono"
                placeholder="ali_dev"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              دیگران می‌توانند با این نام کاربری مستقیماً به شما زنگ بزنند.
            </span>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              نام نمایشی:
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full bg-slate-800 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              placeholder="علی رضایی"
            />
          </div>

          {/* Status Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              وضعیت و بیوگرافی کوتاه:
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              placeholder="همیشه در دسترس برای تماس کاری و دوستانه..."
            />
          </div>

          {/* Status Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              وضعیت حضور:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'online', label: 'آنلاین', color: 'bg-emerald-500' },
                { id: 'busy', label: 'مشغول', color: 'bg-rose-500' },
                { id: 'away', label: 'مرخصی', color: 'bg-amber-500' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatus(item.id as any)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border transition ${
                    status === item.id
                      ? 'bg-slate-800 border-emerald-500 font-bold text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">تنظیمات تم و تماس گوشی</h4>

            {/* Dark / Light Theme Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70">
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-indigo-400" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-white">حالت تم (تاریک / روشن)</span>
                  <p className="text-[10px] text-slate-400">
                    {theme === 'dark' ? 'تم تاریک (صرفه‌جویی باتری OLED)' : 'تم روشن'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleTheme}
                className="px-3 py-1.5 rounded-xl bg-slate-700 text-xs font-medium text-white hover:bg-slate-600 transition"
              >
                تغییر به {theme === 'dark' ? 'روشن' : 'تاریک'}
              </button>
            </div>

            {/* Ringtone Audio Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white">پخش صدای زنگ هنگام تماس</span>
                  <p className="text-[10px] text-slate-400">آهنگ زنگ شبیه تلفن واقعی</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.ringtoneEnabled}
                onChange={(e) => onUpdateSettings({ ringtoneEnabled: e.target.checked })}
                className="w-5 h-5 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Vibration Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70">
              <div className="flex items-center gap-2.5">
                <Vibrate className="w-5 h-5 text-purple-400" />
                <div>
                  <span className="text-xs font-bold text-white">لرزش گوشی (ویبره)</span>
                  <p className="text-[10px] text-slate-400">ویبره مداوم در تماس ورودی</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={(e) => onUpdateSettings({ vibrationEnabled: e.target.checked })}
                className="w-5 h-5 accent-purple-500 cursor-pointer"
              />
            </div>

            {/* Wake Lock Screen */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/70">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <div>
                  <span className="text-xs font-bold text-white">روشن ماندن صفحه حین تماس</span>
                  <p className="text-[10px] text-slate-400">جلوگیری از خاموش شدن صفحه نمایش</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.wakeLockEnabled}
                onChange={(e) => onUpdateSettings({ wakeLockEnabled: e.target.checked })}
                className="w-5 h-5 accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Test Ringtone Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onTestRingtone}
              className="w-full py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <BellRing className="w-4 h-4" />
              <span>تست زنگ و نوتیفیکیشن تماس</span>
            </button>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 active:scale-95 transition"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تغییرات با موفقیت ذخیره شد</span>
                </>
              ) : (
                <span>ذخیره مشخصات پروفایل</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
