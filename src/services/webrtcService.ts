import { VideoQuality } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>(); // username/peerId -> RTCPeerConnection
  private onRemoteStreamCallbacks = new Map<string, (stream: MediaStream) => void>();
  private onIceCandidateCallback?: (targetUsername: string, candidate: RTCIceCandidate) => void;
  private isScreenSharing = false;
  private currentFacingMode: 'user' | 'environment' = 'user';

  // Quality constraints
  getVideoConstraints(quality: VideoQuality, facingMode: 'user' | 'environment' = 'user'): MediaTrackConstraints {
    const facing = { ideal: facingMode };
    switch (quality) {
      case '1080p':
        return {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: facing,
        };
      case '720p':
        return {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 },
          facingMode: facing,
        };
      case '480p':
      default:
        return {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
          facingMode: facing,
        };
    }
  }

  getAudioConstraints(): MediaTrackConstraints {
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    };
  }

  // Get local camera/mic stream
  async startLocalMedia(
    callType: 'audio' | 'video',
    quality: VideoQuality = '720p',
    facingMode: 'user' | 'environment' = 'user'
  ): Promise<MediaStream> {
    this.stopLocalMedia();
    this.currentFacingMode = facingMode;

    const constraints: MediaStreamConstraints = {
      audio: this.getAudioConstraints(),
      video: callType === 'video' ? this.getVideoConstraints(quality, facingMode) : false,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.warn('High quality constraints failed, attempting fallback:', err);
      // Fallback to basic constraints if device cannot satisfy HD 1080p/720p
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? true : false,
      });
    }

    return this.localStream;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  stopLocalMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.isScreenSharing = false;
  }

  setAudioEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }

  setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  }

  // Switch between front & back camera
  async flipCamera(quality: VideoQuality = '720p'): Promise<'user' | 'environment'> {
    if (!this.localStream) return this.currentFacingMode;
    const newFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: this.getVideoConstraints(quality, newFacingMode),
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = this.localStream.getVideoTracks()[0];

      if (oldVideoTrack) {
        this.localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }

      this.localStream.addTrack(newVideoTrack);
      this.currentFacingMode = newFacingMode;

      // Replace track on all active peer connections
      for (const pc of this.peerConnections.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      return newFacingMode;
    } catch (err) {
      console.warn('Camera flip error:', err);
      return this.currentFacingMode;
    }
  }

  // Screen sharing toggle
  async toggleScreenShare(): Promise<boolean> {
    if (!this.localStream) return false;

    if (this.isScreenSharing) {
      // Revert back to camera
      await this.startLocalMedia('video', '720p', this.currentFacingMode);
      this.isScreenSharing = false;
      return false;
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          this.toggleScreenShare();
        };

        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          this.localStream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        this.localStream.addTrack(screenTrack);

        for (const pc of this.peerConnections.values()) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        this.isScreenSharing = true;
        return true;
      } catch (e) {
        console.warn('Screen share cancelled/denied:', e);
        return false;
      }
    }
  }

  // Peer Connection management
  getOrCreatePeerConnection(
    peerId: string,
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (targetUsername: string, candidate: RTCIceCandidate) => void
  ): RTCPeerConnection {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(peerId, pc);
    this.onRemoteStreamCallbacks.set(peerId, onRemoteStream);
    this.onIceCandidateCallback = onIceCandidate;

    // Attach local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(peerId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        const callback = this.onRemoteStreamCallbacks.get(peerId);
        if (callback) callback(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // Peer disconnected
      }
    };

    return pc;
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error('Peer connection not found');
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error('Peer connection not found');
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Error adding ICE candidate:', err);
      }
    }
  }

  closePeerConnection(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.onRemoteStreamCallbacks.delete(peerId);
  }

  closeAll() {
    for (const [peerId, pc] of this.peerConnections.entries()) {
      pc.close();
    }
    this.peerConnections.clear();
    this.onRemoteStreamCallbacks.clear();
    this.stopLocalMedia();
  }
}

export const webrtcService = new WebRTCService();
