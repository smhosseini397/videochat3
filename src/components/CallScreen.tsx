import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Monitor,
  MessageSquare,
  Settings,
  Users,
  Sparkles,
  Maximize2,
  Minimize2,
  Signal
} from 'lucide-react';
import { ActiveCall, UserProfile, VideoQuality } from '../types';
import { webrtcService } from '../services/webrtcService';

interface CallScreenProps {
  call: ActiveCall;
  currentUser: UserProfile;
  remoteStreams: Map<string, MediaStream>; // peerUsername -> MediaStream
  participants?: UserProfile[];
  onEndCall: () => void;
  onOpenChat: () => void;
  unreadCount?: number;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  call,
  currentUser,
  remoteStreams,
  participants = [],
  onEndCall,
  onOpenChat,
  unreadCount = 0,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(call.callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [quality, setQuality] = useState<VideoQuality>('1080p');
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [beautyFilter, setBeautyFilter] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    const localStream = webrtcService.getLocalStream();
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [isVideoOff, isScreenSharing]);

  // Attach first remote stream to main video if 1-on-1
  useEffect(() => {
    if (remoteStreams.size > 0 && mainVideoRef.current) {
      const firstStream = Array.from(remoteStreams.values())[0];
      mainVideoRef.current.srcObject = firstStream;
    }
  }, [remoteStreams]);

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleToggleMic = () => {
    const next = !isMuted;
    setIsMuted(next);
    webrtcService.setAudioEnabled(!next);
  };

  const handleToggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    webrtcService.setVideoEnabled(!next);
  };

  const handleFlipCamera = async () => {
    const newMode = await webrtcService.flipCamera(quality);
    setFacingMode(newMode);
  };

  const handleToggleScreenShare = async () => {
    const active = await webrtcService.toggleScreenShare();
    setIsScreenSharing(active);
  };

  const handleChangeQuality = async (newQuality: VideoQuality) => {
    setQuality(newQuality);
    await webrtcService.startLocalMedia(call.callType, newQuality, facingMode);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = webrtcService.getLocalStream();
    }
  };

  const isGroup = call.isGroup || participants.length > 1;
  const isVideo = call.callType === 'video';
  const targetUser = call.targetUser || call.caller;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col bg-slate-950 text-white ${
        beautyFilter ? 'brightness-105 contrast-95 saturate-110' : ''
      }`}
    >
      {/* Top Bar Overlay */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {formatDuration(duration)}
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <Signal className="w-3 h-3 text-emerald-400" />
            HD {quality}
          </span>
        </div>

        {/* Center Title */}
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-bold text-white max-w-[150px] truncate text-center">
            {isGroup ? `گروه: ${call.roomId}` : targetUser?.displayName || 'در حال مکالمه'}
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {isGroup ? `${participants.length + 1} کاربر در تماس` : `@${targetUser?.username || 'user'}`}
          </span>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBeautyFilter(!beautyFilter)}
            className={`p-2 rounded-full border transition ${
              beautyFilter
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="فیلتر شفاف‌سازی چهره"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition"
            title="تنظیمات کیفیت"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video View / Grid View */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-slate-900">
        {!isGroup ? (
          // 1-on-1 Video View
          <div className="relative w-full h-full flex items-center justify-center">
            {isVideo && remoteStreams.size > 0 ? (
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              // Audio call avatar or when remote video is off
              <div className="flex flex-col items-center justify-center text-center p-6">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-pulse blur-lg" />
                  <img
                    src={targetUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser?.username}`}
                    alt={targetUser?.displayName}
                    className="relative w-32 h-32 rounded-full object-cover border-4 border-slate-700 shadow-2xl bg-slate-800"
                  />
                </div>
                <h2 className="mt-5 text-xl font-bold text-white">{targetUser?.displayName}</h2>
                <p className="mt-1 text-xs text-emerald-400 font-mono">@{targetUser?.username}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  کیفیت صدا: فوق‌العاده شفاف (Opus HD)
                </div>
              </div>
            )}

            {/* Local Video Thumbnail (PiP) */}
            {isVideo && (
              <div className="absolute bottom-28 left-4 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black z-30 group cursor-pointer">
                {isVideoOff ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-[10px]">
                    <VideoOff className="w-6 h-6 mb-1" />
                    <span>دوربین خاموش</span>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror scale-x-[-1]"
                  />
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white">
                  شما
                </div>
              </div>
            )}
          </div>
        ) : (
          // Group Call Video Grid
          <div className="w-full h-full p-3 pt-20 pb-28 grid grid-cols-2 gap-2 auto-rows-fr overflow-y-auto">
            {/* Local Tile */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/60 flex items-center justify-center">
              {isVideo && !isVideoOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-3">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName}
                    className="w-14 h-14 rounded-full border border-slate-600 mb-1"
                  />
                  <span className="text-xs text-slate-300">شما {isMuted && '(بی‌صدا)'}</span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] text-emerald-400 font-medium">
                شما (میزبان)
              </div>
            </div>

            {/* Participants tiles */}
            {participants.map((p) => {
              const stream = remoteStreams.get(p.username);
              return (
                <div
                  key={p.username}
                  className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700/60 flex items-center justify-center"
                >
                  {stream && isVideo ? (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el) el.srcObject = stream;
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3">
                      <img
                        src={p.avatar}
                        alt={p.displayName}
                        className="w-14 h-14 rounded-full border border-slate-600 mb-1"
                      />
                      <span className="text-xs text-slate-300">{p.displayName}</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] text-white">
                    {p.displayName}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quality & Settings Flyout Modal */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-40 w-64 rounded-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl p-4 shadow-2xl text-right">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
            <h4 className="text-xs font-bold text-white">تنظیمات کیفیت تماس</h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 text-xs hover:text-white"
            >
              بستن
            </button>
          </div>

          <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
            کیفیت تصویر ویدیو:
          </label>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(['1080p', '720p', '480p'] as VideoQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => handleChangeQuality(q)}
                className={`py-1.5 text-xs rounded-xl border transition ${
                  quality === q
                    ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 space-y-1 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
            <p>• حالت ۱۰۸۰p: وضوح بسیار بالا و ۶۰ فریم</p>
            <p>• فشرده‌سازی خودکار نویز صدا فعال است</p>
            <p>• محافظت از اکو و تنظیم خودکار بلندی صدا</p>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-4 pb-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          {/* Mute Mic */}
          <button
            onClick={handleToggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={isMuted ? 'وصل میکروفون' : 'بی‌صدا کردن'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Toggle */}
          {isVideo && (
            <button
              onClick={handleToggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 ${
                isVideoOff
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                  : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700'
              }`}
              title={isVideoOff ? 'روشن کردن دوربین' : 'خاموش کردن دوربین'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Flip Camera */}
          {isVideo && !isVideoOff && (
            <button
              onClick={handleFlipCamera}
              className="w-12 h-12 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition active:scale-95"
              title="چرخش دوربین (جلو / عقب)"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}

          {/* Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition active:scale-95 ${
              isScreenSharing
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title="اشتراک‌گذاری صفحه نمایش"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Chat in call */}
          <button
            onClick={onOpenChat}
            className="relative w-12 h-12 rounded-full bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition active:scale-95"
            title="چت در حین تماس"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-90 text-white flex items-center justify-center shadow-xl shadow-rose-900/60 transition ml-2"
            title="قطع تماس"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
