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
    id: data.id || `msg_${Date.now()}`,
    senderUsername: sender.username,
    senderDisplayName: sender.displayName,
    senderAvatar: sender.avatar,
    targetUsername: data.targetUsername?.toLowerCase().trim(),
    roomId: data.roomId,
    text: data.text || '',
    voiceUrl: data.voiceUrl,
    voiceDuration: data.voiceDuration,
    file: data.file,
    timestamp: Date.now(),
  };


  if (data.roomId) {

    if (!messagesByRoom.has(data.roomId)) {
      messagesByRoom.set(data.roomId, []);
    }

    const list = messagesByRoom.get(data.roomId)!;

    list.push(msg);

    if(list.length > 200)
      list.shift();


    broadcastToRoom(
      data.roomId,
      {
        type:'new_chat_message',
        message:msg
      }
    );


  } else if(data.targetUsername){


    ws.send(JSON.stringify({
      type:'new_chat_message',
      message:msg
    }));


    sendToUser(
      data.targetUsername,
      {
        type:'new_chat_message',
        message:msg
      }
    );

  }

  break;
}


default:
 break;

} // پایان switch


} catch(err){

 console.error(
  'Error handling WebSocket message:',
  err
 );

}


}); // پایان ws.on message


}); // پایان wss connection



// API

app.get('/api/health',(req,res)=>{

res.json({
 status:'ok',
 activeConnections:clients.size,
 registeredUsers:usersByUsername.size,
 roomsCount:rooms.size,
 timestamp:Date.now()
});

});


app.get('/api/users',(req,res)=>{

const list:UserProfile[]=[];

for(const client of usersByUsername.values()){

 if(client.user)
   list.push(client.user);

}


res.json({
 users:list
});

});



// upload

app.post('/api/upload',(req,res)=>{

try{

const {name,size,type,dataUrl}=req.body;


if(!name || !dataUrl){

return res.status(400).json({
error:'File data and name are required'
});

}


res.json({

success:true,

file:{
id:`file_${Date.now()}`,
name,
size,
type,
url:dataUrl,
uploadedAt:Date.now()
}

});


}catch(err:any){

res.status(500).json({
error:err.message
});

}

});




// START SERVER

async function startServer(){

const isProd =
process.env.NODE_ENV === 'production';



if(!isProd){


const {createServer:createViteServer}
=
await import('vite');


const vite =
await createViteServer({

server:{
middlewareMode:true
},

appType:'spa'

});


app.use(vite.middlewares);



}else{


const distPath =
path.join(process.cwd(),'dist');


console.log(
'Serving static files:',
distPath
);



app.use(
express.static(distPath)
);



app.get('*splat',(req,res)=>{


if(req.path.startsWith('/api')){

return res.status(404).json({
error:'API route not found'
});

}


res.sendFile(
path.join(
distPath,
'index.html'
)

);


});


}



const PORT =
Number(process.env.PORT) || 10000;



server.listen(
PORT,
"0.0.0.0",
()=>{

console.log(
`AvaCall Server running on port ${PORT}`
);

});


}



startServer();
