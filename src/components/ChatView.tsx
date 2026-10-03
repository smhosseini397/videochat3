import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Square,
  Paperclip,
  Phone,
  Video,
  Play,
  Pause,
  Download,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Film,
  Music,
  Trash2,
  ArrowRight,
  MoreVertical,
  CheckCheck
} from 'lucide-react';
import { ChatMessage, FileAttachment, UserProfile } from '../types';

interface ChatViewProps {
  currentUser: UserProfile;
  activeChatUser?: UserProfile;
  roomId?: string;
  roomName?: string;
  messages: ChatMessage[];
  isTyping?: boolean;
  onSendMessage: (payload: {
    text?: string;
    voiceUrl?: string;
    voiceDuration?: number;
    file?: FileAttachment;
  }) => void;
  onSendTyping: (isTyping: boolean) => void;
  onStartCall: (user: UserProfile, type: 'audio' | 'video') => void;
  onBack?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  activeChatUser,
  roomId,
  roomName,
  messages,
  isTyping = false,
  onSendMessage,
  onSendTyping,
  onStartCall,
  onBack,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, uploadProgress]);

  // Handle typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 1500);
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage({ text: inputText.trim() });
    setInputText('');
    onSendTyping(false);
  };

  // Voice recording logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onSendMessage({
            voiceUrl: base64Audio,
            voiceDuration: recordSeconds,
          });
        };
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('دسترسی به میکروفون امکان‌پذیر نیست.');
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        audioChunksRef.current = [];
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Large File upload handler (supports reading in chunks with real progress)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadProgress(10);

    const reader = new FileReader();

    reader.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable) {
        const percent = Math.round((progressEvent.loaded / progressEvent.total) * 90);
        setUploadProgress(percent);
      }
    };

    reader.onload = () => {
      setUploadProgress(100);
      const dataUrl = reader.result as string;

      setTimeout(() => {
        onSendMessage({
          file: {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl: dataUrl,
          },
        });
        setUploadProgress(null);
        setUploadFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 400);
    };

    reader.onerror = () => {
      alert('خطا در خواندن فایل.');
      setUploadProgress(null);
    };

    reader.readAsDataURL(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-amber-400" />;
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z'))
      return <FileArchive className="w-5 h-5 text-orange-400" />;
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-text">
      {/* Chat Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <img
              src={
                activeChatUser?.avatar ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${roomId || 'room'}`
              }
              alt="Avatar"
              className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
            />
            {activeChatUser && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                  activeChatUser.status === 'online'
                    ? 'bg-emerald-500'
                    : activeChatUser.status === 'busy'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs">
              {roomName || activeChatUser?.displayName || 'چت'}
            </h3>
            <p className="text-[11px] text-emerald-400 font-mono">
              {roomId ? `شناسه گروه: ${roomId}` : `@${activeChatUser?.username || 'user'}`}
            </p>
          </div>
        </div>

        {/* Call Buttons in Chat Header */}
        <div className="flex items-center gap-1 sm:gap-2">
          {activeChatUser && (
            <>
              <button
                onClick={() => onStartCall(activeChatUser, 'audio')}
                className="p-2.5 rounded-full bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-400 border border-slate-700/60 transition active:scale-95"
                title="تماس صوتی رایگان"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartCall(activeChatUser, 'video')}
                className="p-2.5 rounded-full bg-slate-800 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-slate-700/60 transition active:scale-95"
                title="تماس تصویری با کیفیت بالا"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-950/40 to-slate-900"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3 text-emerald-400">
              <Phone className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-300">هنوز پیامی وجود ندارد</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              می‌توانید پیام متنی، ویس ضبط شده یا هر نوع فایل حجیم ارسال کنید یا مستقیماً تماس بگیرید.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUsername === currentUser.username;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}
              >
                {!isMe && (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderDisplayName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-700 mb-1"
                  />
                )}

                <div
                  className={`max-w-[82%] sm:max-w-md rounded-2xl p-3 shadow-md ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700/80 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {/* Sender Name in group chats */}
                  {roomId && !isMe && (
                    <span className="block text-[11px] font-bold text-emerald-400 mb-1">
                      {msg.senderDisplayName}
                    </span>
                  )}

                  {/* Text Message */}
                  {msg.text && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {msg.text}
                    </p>
                  )}

                  {/* Voice Note Player */}
                  {msg.voiceUrl && (
                    <VoicePlayer audioUrl={msg.voiceUrl} duration={msg.voiceDuration || 0} isMe={isMe} />
                  )}

                  {/* Large File Attachment */}
                  {msg.file && (
                    <div className="mt-1">
                      {msg.file.type.startsWith('image/') ? (
                        <div className="rounded-xl overflow-hidden mb-2 max-h-60 bg-black/30">
                          <img
                            src={msg.file.dataUrl}
                            alt={msg.file.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : null}

                      <div
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl ${
                          isMe ? 'bg-emerald-700/50' : 'bg-slate-900/60'
                        } border border-white/10`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="p-2 rounded-lg bg-black/20 shrink-0">
                            {getFileIcon(msg.file.type, msg.file.name)}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate text-white max-w-[160px]">
                              {msg.file.name}
                            </p>
                            <span className="text-[10px] text-slate-300">
                              {formatFileSize(msg.file.size)}
                            </span>
                          </div>
                        </div>

                        <a
                          href={msg.file.dataUrl}
                          download={msg.file.name}
                          className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition active:scale-95 shrink-0"
                          title="دانلود فایل"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Status */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/70">
                    <span>{timeStr}</span>
                    {isMe && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Upload progress banner */}
        {uploadProgress !== null && (
          <div className="p-3 rounded-2xl bg-slate-800 border border-emerald-500/40 shadow-lg text-right max-w-sm ml-auto">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-emerald-400 font-bold">{uploadProgress}%</span>
              <span className="text-slate-300 truncate max-w-[200px]">
                در حال ارسال: {uploadFileName}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Typing status */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>در حال نوشتن پیام...</span>
          </div>
        )}
      </div>

      {/* Input Control Bottom Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        {isRecording ? (
          // Recording active bar
          <div className="flex items-center justify-between bg-rose-950/60 border border-rose-800/80 rounded-2xl px-4 py-2 text-rose-300 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold">
                {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-rose-300">در حال ضبط صدا...</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => stopRecording(true)}
                className="p-1.5 rounded-xl hover:bg-rose-900 text-rose-400"
                title="لغو ضبط"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => stopRecording(false)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow transition"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>ارسال</span>
              </button>
            </div>
          </div>
        ) : (
          // Standard text / file / voice bar
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700/80 transition active:scale-95 shrink-0"
              title="ارسال فایل حجیم (عکس، ویدیو، آرشیو، سند)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-sm rounded-xl px-4 py-2.5 outline-none border border-slate-700/70 focus:border-emerald-500 transition"
            />

            {inputText.trim() ? (
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition shrink-0"
                title="ارسال پیام"
              >
                <Send className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/30 text-emerald-400 border border-slate-700/70 transition active:scale-95 shrink-0"
                title="ضبط پیام صوتی (ویس)"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Voice Note Player with audio speed control
interface VoicePlayerProps {
  audioUrl: string;
  duration: number;
  isMe: boolean;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioUrl, duration, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    audioRef.current.playbackRate = nextSpeed;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px]">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow transition ${
          isMe
            ? 'bg-white text-emerald-700 hover:bg-emerald-50'
            : 'bg-emerald-500 text-white hover:bg-emerald-400'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Waveform graphic & scrubber */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-0.5 h-5">
          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 35, 75, 55, 85].map((h, i) => {
            const active = (currentTime / (duration || 1)) * 14 > i;
            return (
              <span
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  active ? (isMe ? 'bg-white' : 'bg-emerald-400') : (isMe ? 'bg-emerald-400/50' : 'bg-slate-600')
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] opacity-80 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <button
        onClick={cycleSpeed}
        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/40 transition shrink-0"
      >
        {playbackRate}x
      </button>
    </div>
  );
};
