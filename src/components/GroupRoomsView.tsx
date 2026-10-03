import React, { useState } from 'react';
import {
  Users,
  Plus,
  Video,
  Phone,
  MessageSquare,
  Hash,
  ArrowRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { GroupRoom, UserProfile } from '../types';

interface GroupRoomsViewProps {
  currentUser: UserProfile;
  rooms: GroupRoom[];
  onCreateRoom: (name: string) => void;
  onJoinRoom: (roomId: string, callType?: 'audio' | 'video') => void;
}

export const GroupRoomsView: React.FC<GroupRoomsViewProps> = ({
  currentUser,
  rooms,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName.trim());
    setNewRoomName('');
    setIsCreating(false);
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinRoom(joinCodeInput.trim(), 'video');
    setJoinCodeInput('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 overflow-y-auto p-4 space-y-4">
      {/* Header Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">تماس‌های ویدیویی گروهی HD</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              امکان برگزاری کنفرانس ویدیویی چند نفره با کیفیت عالی و بدون قطعی
            </p>
          </div>
        </div>
      </div>

      {/* Quick Join by Room ID */}
      <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
        <h4 className="text-xs font-bold text-slate-200 mb-2">ورود به اتاق با شناسه یا کد:</h4>
        <form onSubmit={handleJoinWithCode} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="مثال: room_meeting_1"
              className="w-full bg-slate-900 text-xs text-white pr-9 pl-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!joinCodeInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold hover:bg-blue-500 transition active:scale-95 shrink-0"
          >
            ورود به تماس
          </button>
        </form>
      </div>

      {/* Create New Group Room Accordion */}
      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد اتاق گروهی جدید</span>
          </button>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <span className="text-xs font-bold text-white">مشخصات اتاق جدید:</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                انصراف
              </button>
            </div>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="نام اتاق (مثال: جلسه دوستانه یا کاری)"
              className="w-full bg-slate-900 text-xs text-white px-3 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newRoomName.trim()}
              className="w-full py-2 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold hover:bg-emerald-500 transition"
            >
              ساخت اتاق و شروع گفتگو
            </button>
          </form>
        )}
      </div>

      {/* Existing Rooms List */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 mb-2 px-1">
          اتاق‌های فعال ({rooms.length})
        </h4>

        {rooms.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-500" />
            <p className="text-xs font-medium text-slate-300">هنوز اتاقی ایجاد نشده است</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              یک اتاق بسازید و دوستان خود را با لینک یا شناسه به تماس گروهی دعوت کنید!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 transition flex items-center justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-white">{room.name}</h5>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="font-mono text-emerald-400">#{room.id}</span>
                    <span>• {room.participants.length} کاربر حاضر</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onJoinRoom(room.id, 'audio')}
                    className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition active:scale-95"
                    title="تماس صوتی گروهی"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onJoinRoom(room.id, 'video')}
                    className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition active:scale-95"
                    title="تماس تصویری گروهی HD"
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
