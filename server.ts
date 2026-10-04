import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

server.on('upgrade', (request) => {
  console.log('UPGRADE REQUEST:', request.url);
});
// Support large payloads for file sharing (up to 150MB)
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  status: 'online' | 'busy' | 'away';
  lastSeen: number;
}

interface SocketClient {
  ws: WebSocket;
  user?: UserProfile;
  activeRoomId?: string;
  isAlive: boolean;
}

// In-memory store
const clients = new Map<WebSocket, SocketClient>();
const usersByUsername = new Map<string, SocketClient>();
const rooms = new Map<string, Set<string>>(); // roomId -> Set of usernames
const messagesByRoom = new Map<string, any[]>(); // roomId or directKey -> messages
const messagesByUser = new Map<string, any[]>(); // direct messages -> messages
// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('listening', () => {
  console.log('WebSocket server listening');
});

wss.on('error', (err) => {
  console.error('WebSocket error:', err);
});

wss.on('connection', () => {
  console.log('NEW WEBSOCKET CONNECTION');
});
function broadcastUserList() {
  const onlineUsers: UserProfile[] = [];
  for (const client of usersByUsername.values()) {
    if (client.user && client.ws.readyState === WebSocket.OPEN) {
      onlineUsers.push(client.user);
    }
  }

  const payload = JSON.stringify({
    type: 'user_list',
    users: onlineUsers,
  });

  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function sendToUser(targetUsername: string, data: any): boolean {
  const client = usersByUsername.get(targetUsername.toLowerCase().trim());
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

function broadcastToRoom(roomId: string, data: any, excludeUsername?: string) {
  const roomUsers = rooms.get(roomId);
  if (!roomUsers) return;

  const payload = JSON.stringify(data);
  for (const username of roomUsers) {
    if (excludeUsername && username === excludeUsername) continue;
    const client = usersByUsername.get(username);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const clientData: SocketClient = {
    ws,
    isAlive: true,
  };
  clients.set(ws, clientData);

  ws.on('pong', () => {
    clientData.isAlive = true;
  });

  ws.on('message', (messageRaw: string) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type } = data;

      switch (type) {
        // Register or update user profile
        case 'register': {
          const rawUsername = (data.username || '').toLowerCase().trim();
          if (!rawUsername) return;

          const profile: UserProfile = {
            username: rawUsername,
            displayName: data.displayName || rawUsername,
            avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${rawUsername}`,
            bio: data.bio || 'همیشه در دسترس برای تماس و چت',
            status: 'online',
            lastSeen: Date.now(),
          };

          clientData.user = profile;
          usersByUsername.set(rawUsername, clientData);

          ws.send(
  JSON.stringify({
    type: 'registered',
    user: profile,
  })
);

// Send existing direct messages
const userMessages: any[] = [];

for (const [chatKey, msgs] of messagesByUser.entries()) {
  if (chatKey.includes(rawUsername)) {
    userMessages.push(...msgs);
  }
}

if (userMessages.length > 0) {
  ws.send(
    JSON.stringify({
      type: 'chat_history',
      messages: userMessages,
    })
  );
}


          broadcastUserList();
          break;
        }

        case 'update_status': {
          if (clientData.user && data.status) {
            clientData.user.status = data.status;
            broadcastUserList();
          }
          break;
        }

        // Direct Call Invitations (Audio / Video)
        case 'call_invite': {
          const target = (data.targetUsername || '').toLowerCase().trim();
          const caller = clientData.user;
          if (!caller) return;

          const targetClient = usersByUsername.get(target);
          if (!targetClient || targetClient.ws.readyState !== WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'call_failed',
                callId: data.callId,
                reason: 'user_offline',
                message: 'کاربر مورد نظر آفلاین است یا در دسترس نیست.',
              })
            );
            return;
          }

          // Relay call invite to target
          targetClient.ws.send(
            JSON.stringify({
              type: 'incoming_call',
              callId: data.callId,
              callType: data.callType || 'video', // 'audio' | 'video'
              caller: caller,
              timestamp: Date.now(),
            })
          );
          break;
        }

        case 'call_response': {
          const target = (data.targetUsername || '').toLowerCase().trim();
          const targetClient = usersByUsername.get(target);
          if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(
              JSON.stringify({
                type: 'call_response',
                callId: data.callId,
                fromUsername: clientData.user?.username,
                status: data.status, // 'accepted' | 'rejected' | 'busy'
              })
            );
          }
          break;
        }

        case 'call_end': {
          const target = (data.targetUsername || '').toLowerCase().trim();
          const targetClient = usersByUsername.get(target);
          if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(
              JSON.stringify({
                type: 'call_ended',
                callId: data.callId,
                fromUsername: clientData.user?.username,
                reason: data.reason || 'hangup',
              })
            );
          }
          break;
        }

        // 1-on-1 WebRTC Signaling
        case 'webrtc_signal': {
          const target = (data.targetUsername || '').toLowerCase().trim();
          const targetClient = usersByUsername.get(target);
          if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(
              JSON.stringify({
                type: 'webrtc_signal',
                callId: data.callId,
                fromUsername: clientData.user?.username,
                signal: data.signal,
              })
            );
          }
          break;
        }

        // Group Call & Conference Room
        case 'join_room': {
          const roomId = (data.roomId || '').trim();
          const user = clientData.user;
          if (!roomId || !user) return;

          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          const roomUsers = rooms.get(roomId)!;
          roomUsers.add(user.username);
          clientData.activeRoomId = roomId;

          // Notify existing room members of new participant
          const existingParticipants: UserProfile[] = [];
          for (const u of roomUsers) {
            if (u !== user.username) {
              const p = usersByUsername.get(u)?.user;
              if (p) existingParticipants.push(p);
            }
          }

          // Send current room state to joining user
          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomId,
              participants: existingParticipants,
              messages: messagesByRoom.get(roomId) || [],
            })
          );

          // Broadcast to existing room members
          broadcastToRoom(
            roomId,
            {
              type: 'participant_joined',
              roomId,
              user,
            },
            user.username
          );
          break;
        }

        case 'leave_room': {
          const roomId = data.roomId || clientData.activeRoomId;
          const user = clientData.user;
          if (roomId && user && rooms.has(roomId)) {
            const roomUsers = rooms.get(roomId)!;
            roomUsers.delete(user.username);
            if (roomUsers.size === 0) {
              rooms.delete(roomId);
            } else {
              broadcastToRoom(roomId, {
                type: 'participant_left',
                roomId,
                username: user.username,
              });
            }
          }
          clientData.activeRoomId = undefined;
          break;
        }

        case 'room_signal': {
          // WebRTC mesh signaling for group calls
          const target = (data.targetUsername || '').toLowerCase().trim();
          const targetClient = usersByUsername.get(target);
          if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(
              JSON.stringify({
                type: 'room_signal',
                roomId: data.roomId,
                fromUsername: clientData.user?.username,
                signal: data.signal,
              })
            );
          }
          break;
        }

        // Real-time Chat (Text, Voice Message, File transfer)
        case 'chat_message': {
          const sender = clientData.user;
          if (!sender) return;

          const msg = {
            id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            senderUsername: sender.username,
            senderDisplayName: sender.displayName,
            senderAvatar: sender.avatar,
            targetUsername: data.targetUsername ? data.targetUsername.toLowerCase().trim() : undefined,
            roomId: data.roomId,
            text: data.text || '',
            voiceUrl: data.voiceUrl,
            voiceDuration: data.voiceDuration,
            file: data.file, // { name, size, type, dataUrl }
            timestamp: Date.now(),
          };

          if (data.roomId) {
            // Room message
            if (!messagesByRoom.has(data.roomId)) {
              messagesByRoom.set(data.roomId, []);
            }
            const list = messagesByRoom.get(data.roomId)!;
            list.push(msg);
            if (list.length > 200) list.shift(); // keep last 200
            broadcastToRoom(data.roomId, {
              type: 'new_chat_message',
              message: msg,
            });
          } else if (data.targetUsername) {
            // Direct message
            const targetUsername = data.targetUsername.toLowerCase().trim();
            const chatKey = [sender.username.toLowerCase(), targetUsername]
  .sort()
  .join('_');

if (!messagesByUser.has(chatKey)) {
  messagesByUser.set(chatKey, []);
}

const list = messagesByUser.get(chatKey)!;
list.push(msg);

if (list.length > 200) list.shift();
            // Send to sender for confirmation
            ws.send(
              JSON.stringify({
                type: 'new_chat_message',
                message: msg,
              })
            );
            // Send to target
            sendToUser(targetUsername, {
              type: 'new_chat_message',
              message: msg,
            });
          }
          break;
        }

        // Typing indicator
        case 'typing': {
          const sender = clientData.user;
          if (!sender) return;

          if (data.roomId) {
            broadcastToRoom(
              data.roomId,
              {
                type: 'user_typing',
                username: sender.username,
                displayName: sender.displayName,
                roomId: data.roomId,
                isTyping: data.isTyping,
              },
              sender.username
            );
          } else if (data.targetUsername) {
            sendToUser(data.targetUsername.toLowerCase().trim(), {
              type: 'user_typing',
              username: sender.username,
              displayName: sender.displayName,
              isTyping: data.isTyping,
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (clientData.user) {
      const username = clientData.user.username;
      usersByUsername.delete(username);

      if (clientData.activeRoomId && rooms.has(clientData.activeRoomId)) {
        const roomUsers = rooms.get(clientData.activeRoomId)!;
        roomUsers.delete(username);
        if (roomUsers.size === 0) {
          rooms.delete(clientData.activeRoomId);
        } else {
          broadcastToRoom(clientData.activeRoomId, {
            type: 'participant_left',
            roomId: clientData.activeRoomId,
            username,
          });
        }
      }

      broadcastUserList();
    }
  });
});

// Periodic ping to keep alive
setInterval(() => {
  for (const [ws, client] of clients.entries()) {
    if (!client.isAlive) {
      ws.terminate();
      clients.delete(ws);
      if (client.user) {
        usersByUsername.delete(client.user.username);
      }
      continue;
    }
    client.isAlive = false;
    ws.ping();
  }
}, 30000);

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeConnections: clients.size,
    registeredUsers: usersByUsername.size,
    roomsCount: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/users', (req, res) => {
  const list: UserProfile[] = [];
  for (const client of usersByUsername.values()) {
    if (client.user) list.push(client.user);
  }
  res.json({ users: list });
});

// Large file upload endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { name, size, type, dataUrl } = req.body;
    if (!name || !dataUrl) {
      res.status(400).json({ error: 'File data and name are required' });
      return;
    }
    // Return formatted file response for immediate sharing in chat
    res.json({
      success: true,
      file: {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        size,
        type,
        url: dataUrl,
        uploadedAt: Date.now(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in dev or static serving in prod

// Setup Vite middleware in dev or static serving in prod

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

  } else {

    app.use(express.static(path.resolve(__dirname, 'dist')));

    // فقط درخواست های غیر API و غیر WebSocket را به React بده
    app.get('*', (req, res, next) => {

      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/ws')
      ) {
        return next();
      }

      res.sendFile(
        path.resolve(__dirname, 'dist', 'index.html')
      );
    });
  }


  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(
      `AvaCall Server running on port ${PORT} (${isProd ? 'production' : 'development'})`
    );
  });
}

startServer();