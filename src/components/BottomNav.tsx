import React from 'react';
import {
  Users,
  Phone,
  MessageSquare,
  Video,
  Settings
} from 'lucide-react';

export type ActiveTab = 'contacts' | 'chat' | 'groups' | 'calls';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenProfile: () => void;
  unreadMessagesCount?: number;
  onlineCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenProfile,
  unreadMessagesCount = 0,
  onlineCount = 0,
}) => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {/* Contacts / Users */}
        <button
          onClick={() => onSelectTab('contacts')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition relative ${
            activeTab === 'contacts' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {onlineCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950">
                {onlineCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium">مخاطبین</span>
        </button>

        {/* Chats */}
        <button
          onClick={() => onSelectTab('chat')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition relative ${
            activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium">پیام‌ها</span>
        </button>

        {/* Groups */}
        <button
          onClick={() => onSelectTab('groups')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition ${
            activeTab === 'groups' ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">تماس گروهی</span>
        </button>

        {/* Profile / Settings */}
        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-slate-200 transition"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">تنظیمات</span>
        </button>
      </div>
    </div>
  );
};
