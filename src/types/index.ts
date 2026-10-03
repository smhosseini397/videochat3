export interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  status: 'online' | 'busy' | 'away';
  lastSeen?: number;
}

export type CallType = 'audio' | 'video';

export type CallStatus = 
  | 'idle'
  | 'outgoing_ringing'
  | 'incoming_ringing'
  | 'connecting'
  | 'connected'
  | 'ended';

export interface ActiveCall {
  callId: string;
  targetUser?: UserProfile;
  caller?: UserProfile;
  callType: CallType;
  isIncoming: boolean;
  status: CallStatus;
  startTime?: number;
  roomId?: string;
  isGroup?: boolean;
}

export interface FileAttachment {
  id?: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  targetUsername?: string;
  roomId?: string;
  text?: string;
  voiceUrl?: string;
  voiceDuration?: number; // in seconds
  file?: FileAttachment;
  timestamp: number;
}

export interface GroupRoom {
  id: string;
  name: string;
  createdBy: string;
  participants: UserProfile[];
  callActive: boolean;
}

export type VideoQuality = '1080p' | '720p' | '480p';

export interface CallSettings {
  videoQuality: VideoQuality;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  cameraFacingMode: 'user' | 'environment';
  ringtoneEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
}
