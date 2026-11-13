<!-- ─────────────────────────  LANGUAGE SWITCHER  ───────────────────────── -->
<div align="center">

## 🌐 Language / زبان

[![English](https://img.shields.io/badge/🇬🇧%20English-Read%20now-6366f1?style=for-the-badge)](./README.md)
[![فارسی](https://img.shields.io/badge/🇮🇷%20فارسی-مطالعه-8b5cf6?style=for-the-badge)](./READMEFA.md)

</div>

<!-- ─────────────────────────────  HERO  ───────────────────────────── -->
<div align="center">

# 💬 BMS Real-time Chat

### A modern, real-time chat platform with WebRTC calls, DMs & file sharing

<p>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React%2019-61DAFB?style=flat-square&logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white">
</p>

<p>
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-security-notes--known-limitations">Security</a>
</p>

</div>

---

## 🚀 Overview

**BMS Real-time Chat** is a full-stack, real-time messaging application with a fully Persian, RTL interface on top of a modern JavaScript stack:

- **Backend:** Node.js · Express · Socket.IO · MongoDB · JWT · AWS S3
- **Frontend:** React 19 · Vite · Tailwind CSS 4 · React Router 7 · PWA

It goes far beyond plain text chat — it ships with **direct messages**, **file uploads**, **unread notifications**, **1:1 audio/video calls**, **screen sharing**, and an **installable PWA** experience.

> 🎯 **Design goal:** a clean, modern, glassmorphism UI with a production-grade real-time architecture that is easy to read, extend, and learn from.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 💬 Messaging
- ⚡ Real-time send / receive
- 🕘 Message history (last 100 on join)
- 📎 Text, file & system messages
- ✏️ Edit your own messages
- 🗑️ Delete for me / for everyone
- 🕒 Persian time formatting

### 🏠 Rooms
- ➕ Create rooms (2–30 chars)
- 🚪 Join / leave rooms
- 👑 Creator-only room deletion
- 🔍 Search rooms & users
- 🔒 Private DM rooms

</td>
<td width="50%" valign="top">

### 👥 Direct Messages
- 💌 Online & offline DMs
- 🧠 Auto-created private rooms
- 🚫 Self-DM protection
- 🟢 Live online status

### 📞 WebRTC Calls
- 🎙️ Audio & video (1:1)
- 🖥️ High-quality screen share
- 🔇 Mute & deafen
- 🧩 Perfect Negotiation + glare handling
- 🧊 ICE candidate buffering

</td>
</tr>
</table>

### 🎨 Experience & Platform
- 🧊 Glassmorphism + animated gradient UI
- 🌗 Dark / Light theme + 🎃 Halloween background
- 📲 Installable **PWA** with auto-update Service Worker
- 🔔 Toast notifications via **sileo**
- 🈯 Full **Persian / RTL** layout with Vazir font

---

## 🧰 Tech Stack

| Layer | Technology | Notes |
|:------|:-----------|:------|
| **Runtime** | Node.js | ES Modules |
| **Backend** | Express 4 + Socket.IO 4 | REST + realtime |
| **Database** | MongoDB + Mongoose 9 | Users, rooms, messages, notifications |
| **Auth** | JWT + bcryptjs + cookie-parser | `httpOnly` cookie + socket handshake |
| **Storage** | AWS SDK v3 (S3-compatible) | Presigned upload URLs |
| **Frontend** | React 19 + Vite 8 + React Router 7 | SPA |
| **Styling** | Tailwind CSS 4 + custom CSS | Vazir font, RTL |
| **Forms** | react-hook-form + yup | Client validation |
| **Realtime** | socket.io-client | Singleton socket |
| **PWA** | vite-plugin-pwa | Auto-update SW |
| **Toasts** | sileo | Notification UI |
| **Dev** | nodemon · ESLint · concurrently | Local workflow |

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Client)                       │
│  React 19 + Vite + Tailwind + React Router + PWA             │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │  UI (JSX)  │──▶│ hooks        │──▶│ socket.io-client   │  │
│  │ Components │   │ useChat      │   │ + WebRTC PeerConn. │  │
│  │            │   │ useWebRTC    │   │ + fetch (REST)     │  │
│  └────────────┘   └──────────────┘   └─────────┬──────────┘  │
└────────────────────────────────────────────────│─────────────┘
               │ HTTP (REST)                       │ WebSocket
               │ /auth  /upload  /api             │ (Socket.IO)
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                     Backend (Node/Express)                    │
│  Express  ──▶ routes: auth / upload / (rooms — disabled)      │
│                                                               │
│  http.Server ──▶ Socket.IO                                    │
│      ├─ Auth middleware (JWT from cookie or auth.token)       │
│      ├─ handlers: users · chat · rooms · direct · typing      │
│      │            notification · webrtc                       │
│      └─ UsersStore (in-memory Map for online users)           │
│                                                               │
│  Mongoose ──▶ MongoDB   (User, Room, Message, Notification)   │
│  AWS SDK   ──▶ Object Storage (S3-compatible, presigned URLs) │
└──────────────────────────────────────────────────────────────┘
```

> ℹ️ All room logic is handled through **Socket.IO events**. `routes/rooms.js` is a commented-out, disabled early version.

---

## 📁 Project Structure

```text
learning SOCKET.IO/
├── README.md                    ← English README (you are here)
├── READMEFA.md                  ← Persian README
├── backend/
│   ├── .env                     ← environment variables (never commit)
│   ├── package.json
│   └── src/
│       ├── server.js            ← Express + HTTP + Socket.IO entry
│       ├── config/
│       │   ├── db.js            ← Mongoose connection
│       │   └── s3.js            ← S3 client (forcePathStyle)
│       ├── models/
│       │   ├── User.js
│       │   ├── Room.js
│       │   ├── Message.js
│       │   └── Notification.js
│       ├── routes/
│       │   ├── auth.js          ← register / login / logout / me / profile
│       │   ├── upload.js        ← S3 presigned upload
│       │   └── rooms.js         ← legacy commented version
│       ├── socket/
│       │   ├── index.js         ← initSocket + event registration
│       │   ├── call.js          ← @nhanaka/call skeleton (inactive)
│       │   └── handlers/
│       │       ├── users.js     ← join + room list
│       │       ├── chat.js      ← message CRUD + history + notify
│       │       ├── rooms.js     ← create/join/leave/delete/search/info
│       │       ├── direct.js    ← open DM
│       │       ├── typing.js    ← typing status
│       │       ├── notification.js
│       │       └── webrtc.js    ← call signaling
│       └── utils/
│           ├── jwt.js
│           ├── users.js         ← UsersStore (in-memory Map)
│           └── messages.js
└── frontend/
    ├── index.html               ← lang="fa" dir="rtl"
    ├── vite.config.js           ← port 5001 + proxy + PWA
    ├── eslint.config.js
    ├── package.json
    ├── public/                  ← PWA icons & logo
    └── src/
        ├── main.jsx
        ├── App.jsx              ← Router + auth check (/auth/me)
        ├── socket.js            ← socket singleton
        ├── index.css            ← Tailwind + custom styles
        ├── assets/
        ├── fonts/               ← Vazir (Light / Medium)
        ├── hooks/
        │   ├── useChat.js       ← core chat & room logic
        │   ├── useSocket.js
        │   └── useWebRTC.js     ← call & screen-share engine
        ├── providers/
        │   └── ToastProvider.jsx
        ├── pages/
        │   └── Profile.jsx
        └── components/
            ├── Login.jsx / Register.jsx
            ├── Chat.jsx / ChatHeader.jsx
            ├── MessageList.jsx / MessageBubble.jsx / ChatInput.jsx
            ├── RoomList.jsx / WelcomeScreen.jsx
            ├── OnlineUsersList.jsx / TypingIndicator.jsx
            ├── NotificationDropdown.jsx
            ├── CallModal.jsx
            ├── Avatar.jsx / ContextMenu.jsx
            ├── EmojiPickerPanel.jsx
            ├── ThemeToggle.jsx
            ├── HalloweenBackground.jsx
            ├── InstallButton.jsx
            └── LoadingSpinner.jsx
```

---

## 🖥️ Backend

### ⚙️ Entry Point & Startup

`src/server.js` performs the following:

1. Creates an **Express** app and an **HTTP server** (`node:http`).
2. Enables `express.json()`, `cookieParser()`, and **CORS** (origin `http://localhost:5001`, `credentials: true`).
3. Mounts `/auth` and `/upload` (the `/api/rooms` route is commented out).
4. Serves `frontend/dist` statically and provides an SPA fallback to `index.html`.
5. On `start()`: connects to MongoDB → initializes Socket.IO → listens on `PORT` (default `3000`).

### 🧩 Configuration

| File | Purpose |
|:-----|:--------|
| `config/db.js` | MongoDB connection via `MONGODB_URI`; exits on failure |
| `config/s3.js` | `S3Client` with endpoint, credentials & `forcePathStyle: true` |
| `utils/users.js` | `UsersStore` — in-memory `Map<socketId, user>` |

> ⚠️ Online users live **in memory**. Running multiple instances without an adapter (e.g. Redis) causes inconsistencies. This project targets a single instance.

### 🗃️ Data Models

<table>
<tr><th width="25%">Model</th><th>Fields</th></tr>
<tr>
<td><b>User</b></td>
<td>

`username` (unique, max 30) · `password` (bcrypt) · `createdAt`

</td>
</tr>
<tr>
<td><b>Room</b></td>
<td>

`name` · `createdBy` → User · `members` → [User] · `isPrivate` · `createdAt`
<br><sub>Indexes: name (text), members, isPrivate</sub>

</td>
</tr>
<tr>
<td><b>Message</b></td>
<td>

`text` (max 500) · `sender` · `senderId` → User · `type` (`message` / `system` / `file`) · `fileUrl` · `fileName` · `fileType` · `fileSize` · `room` · `deletedFor` → [User] · `isDeletedForEveryone` · `createdAt`
<br><sub>Indexes: createdAt, (room + createdAt)</sub>

</td>
</tr>
<tr>
<td><b>Notification</b></td>
<td>

`userId` → User · `senderId` → User · `senderName` · `roomName` · `messagePreview` · `isRead` · `createdAt`
<br><sub>Static helper: <code>markAllAsRead(userId, roomName?)</code></sub>

</td>
</tr>
</table>

### 🌐 REST API

All routes live under `/auth` and `/upload` (no `/api` prefix).

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `POST` | `/auth/register` | Register + set `token` cookie | — |
| `POST` | `/auth/login` | Login + set `token` cookie | — |
| `POST` | `/auth/logout` | Clear cookie | — |
| `GET` | `/auth/me` | Current user + token (persistence) | 🍪 |
| `GET` | `/auth/profile` | Own profile + message count | ✅ |
| `GET` | `/auth/profile/:username` | Public profile + message count | — |
| `GET` | `/auth/call-token` | Token for calls | ✅ |
| `POST` | `/upload/presign` | Presigned S3 upload URL | — |

> 🍪 **Cookie:** `httpOnly`, `secure` + `sameSite='none'` in production, `lax` in dev, 7-day `maxAge`, `path='/'`.

### 🔌 Socket.IO Layer

- `initSocket(server)` creates the Socket.IO server with matching CORS.
- **Auth middleware** reads the token from `handshake.auth.token` or the `token` cookie, then sets `socket.userId` / `socket.username`. Invalid or missing tokens are rejected.
- Every socket joins its **personal room** (`socket.id`) so it can be targeted directly.
- Handlers are **factory functions**: `handleX(socket, io, users) → (payload, callback) => {}`.
- On `disconnect`, the user is removed from `UsersStore` and `online users` is re-emitted.

### 📡 Socket Events

#### Client → Server (with callback)

| Event | Payload | Description |
|:------|:--------|:------------|
| `join` | `{}` | Register user + receive room list |
| `chat message` | `{ text, type, fileUrl, fileName, fileType, fileSize }` | Send message |
| `get messages` | `{ room, before?, limit? }` | Paginated history |
| `edit message` | `{ messageId, newText }` | Sender only |
| `delete message` | `{ messageId, deleteForEveryone }` | Delete |
| `typing` | `boolean` | Typing status |
| `list rooms` | — | User's rooms |
| `search rooms` | `{ query }` / `string` | Search rooms & users |
| `create room` | `{ name }` | |
| `join room` | `{ roomName }` | |
| `leave room` | `{ roomName? }` | |
| `delete room` | `{ roomName }` | Creator only |
| `get room info` | `{ roomName }` | |
| `open dm` | `{ targetUserId }` | |
| `get notifications` | `{}` | Unread notifications |
| `mark notifications as read` | `{ roomName? }` | |
| `webrtc-offer` | `{ targetUserId, offer, renegotiate? }` | |
| `webrtc-answer` | `{ targetUserId, answer }` | |
| `webrtc-ice-candidate` | `{ targetUserId, candidate }` | |
| `webrtc-hangup` | `{ targetUserId }` | |
| `webrtc-stream-updated` | `{ targetUserId }` | Track changed |
| `webrtc-screen-lock` | `{ targetUserId }` | Screen share started |
| `webrtc-screen-unlock` | `{ targetUserId }` | Screen share ended |

#### Server → Client

| Event | Payload | Description |
|:------|:--------|:------------|
| `chat message` | Message | To room |
| `system message` | `{ text, room }` | Join / leave |
| `online users` | User[] | |
| `typing` | `{ username, isTyping }` | |
| `room created` | `{ id, name, createdBy }` | Broadcast |
| `room removed` | `{ roomName }` | |
| `room deleted` | `{ roomName }` | Room members |
| `room users` | User[] | |
| `message deleted` | `{ messageId, deleteForEveryone }` | |
| `message edited` | Message | |
| `new notification` | Notification | Direct to recipient |
| `notifications updated` | `{ count }` | |
| `webrtc-*` | Signals | Offer, answer, ICE, hangup, stream, screen |

### 🔐 Authentication

1. `POST /auth/login` → verify with `bcrypt.compare` → sign a 7-day JWT `{ id, username }`.
2. Token is stored in an `httpOnly` cookie **and** returned in the body.
3. Frontend calls `setSocketToken(token)` → token sent during the socket handshake.
4. On reload, `GET /auth/me` restores the session from the cookie.

### ☁️ File Upload via S3

```text
Client ──POST /upload/presign──▶ Server
                                  ├─ key = uploads/<uuid>.<ext>
                                  ├─ PutObjectCommand
                                  └─ getSignedUrl (10 min)
        ◀── { uploadUrl, publicUrl, key }
Client ──PUT file──▶ uploadUrl (S3)
Client ──emit('chat message', { type:'file', fileUrl, ... })
```

Security depends on the bucket's CORS & policy. Keys stay in `.env`.

### 🔔 Notification System

- After a message is sent in a room with a `Room` document, a `Notification` is created for every member **not currently in that room**.
- Presence is detected through the sockets joined to the room and `UsersStore`.
- The sender never receives their own notification.
- Online recipients get `new notification` **directly** in their personal socket room.
- `markAllAsRead` is triggered on room join or when the dropdown opens.

### 📞 WebRTC Signaling

The server is a **pure relay** — no media flows through it.

| Event | Direction | Purpose |
|:------|:----------|:--------|
| `webrtc-offer` | → target | SDP offer (+ `renegotiate`) |
| `webrtc-answer` | → target | SDP answer |
| `webrtc-ice-candidate` | → target | ICE candidate |
| `webrtc-hangup` | → target | End call |
| `webrtc-stream-updated` | → target | Track changed |
| `webrtc-screen-lock` / `unlock` | → target | Screen share start / end |

Targets are resolved with `users.findByUserId(targetUserId)` — calls require an **online** user.

---

## 🎨 Frontend

### 🧭 Routing & Auth

`App.jsx` calls `GET /auth/me` on load. While checking, a Halloween-themed loading screen is shown.

| Path | Access | Screen |
|:-----|:-------|:-------|
| `/login` | Guest | Login |
| `/register` | Guest | Register |
| `/chat` | Auth | Main chat |
| `/profile` | Auth | Own profile |
| `/profile/:username` | Auth | Public profile |
| `/` | — | Smart redirect |

Logout = `POST /auth/logout` + `chat.logout()`.

### 🧠 State Management & Hooks

<table>
<tr><th width="22%">Hook</th><th>Responsibility</th></tr>
<tr>
<td><code>useChat.js</code></td>
<td>

Holds `messages`, `onlineUsers`, `typingUsers`, `rooms`, `currentRoom`, `notifications`, `unreadCount`, `dmPartnerName`, `connected`, `error`.
<br>Exposes `connectSocket`, `disconnectSocket`/`logout`, `sendMessage`, `setTyping`, `deleteMessage`, `editMessage`, `createRoom`, `searchRooms`, `switchRoom`, `leaveRoom`, `deleteRoom`, `openDM`, `fetchNotifications`, `markNotificationsAsRead`.
<br>Registers & cleans up all socket listeners.

</td>
</tr>
<tr>
<td><code>useWebRTC.js</code></td>
<td>

The call engine: `RTCPeerConnection`, local/remote streams, mute/deafen, video toggle, screen share, **Perfect Negotiation**, glare handling, track filtering, ICE buffering.

</td>
</tr>
<tr>
<td><code>useSocket.js</code></td>
<td>Lightweight connection-status hook.</td>
</tr>
</table>

### 🧱 Components

| Component | Role |
|:----------|:-----|
| `Login` / `Register` | Auth forms (react-hook-form + yup) |
| `Chat` | Layout, responsive sidebar, wires `useChat` |
| `ChatHeader` | Connection, notifications, call, profile, logout |
| `RoomList` | Rooms, create/delete/leave, search, online list, DM |
| `MessageList` | Scrollable messages |
| `MessageBubble` | Bubble, context menu, files, edit/delete |
| `ChatInput` | Text, file, emoji, typing |
| `EmojiPickerPanel` | Emoji picker |
| `TypingIndicator` | "... is typing" |
| `OnlineUsersList` | Online users → DM / call |
| `NotificationDropdown` | Unread notifications |
| `CallModal` | Full call UI |
| `WelcomeScreen` | Empty-state screen |
| `Avatar` | Generated avatar |
| `ThemeToggle` | Theme switcher |
| `HalloweenBackground` | Decorative background |
| `InstallButton` | PWA install |
| `LoadingSpinner` | Loader |
| `ToastProvider` | sileo container |
| `Profile` | Banner, stats, ID chip |

### 🎨 Styling & Theme

- **Tailwind CSS 4** via `@tailwindcss/vite`.
- Custom utilities: `glass-morphism-strong`, `btn-primary`, `bg-aurora`, `animate-blob`, `slide-in-left`.
- **Vazir** font bundled locally (`src/fonts`).
- Global `dir="rtl"` / `lang="fa"`.

### 📲 PWA

Configured in `vite.config.js`:

- `registerType: 'autoUpdate'`
- Manifest: **BMS Real-time Chat** / **BMS Chat**, theme `#6366f1`, background `#0f172a`, 192 & 512 maskable icons
- Service Worker active in **build / preview only** (`devOptions.enabled: false`)

---

## 🔄 Core Flows

### 1️⃣ Login & Connection

```text
Login ──POST /auth/login──▶ (Set-Cookie token, JSON {user, token})
   ├─ setAuthUser(user)
   ├─ setSocketToken(token)
   └─ navigate('/chat') ─▶ connectSocket()
        └─ socket.connect()
             ├─ handshake auth
             └─ emit('join') → { user, rooms, history:[], currentRoom:null }
```

### 2️⃣ Joining a Room

```text
switchRoom(name) ──emit('join room')──▶
   server: membership check → socket.join(name)
           markAllAsRead(userId, name)
           load last 100 messages
   ◀── { success, room, history }
   socket.to(room).emit('system message', '... joined')
   io.to(room).emit('room users', ...)
```

### 3️⃣ Sending a Message

```text
sendMessage({text,...}) ──emit('chat message')──▶
   server: validate (≤ 500) → Message.create
           io.to(room).emit('chat message', message)
           absent members → Notification + emit('new notification')
   ◀── callback({ success, message })
```

### 4️⃣ Direct Message

```text
openDM(targetUserId) ──emit('open dm')──▶
   online  → resolve via UsersStore
   offline → User.findById
   room = dm_<minId>_<maxId>  (isPrivate: true)
   leave previous room → join DM → load history
   ◀── { room, history, targetUser }
```

### 5️⃣ WebRTC Call

```text
Caller: getUserMedia → createOffer → emit('webrtc-offer')
Callee: getUserMedia → createAnswer → emit('webrtc-answer')
Both:   onicecandidate → emit('webrtc-ice-candidate')
        ontrack → syncRemoteStream
Change: replaceTrack/addTrack → renegotiate (Perfect Negotiation)
End:    emit('webrtc-hangup')
```

---

## ⚡ Getting Started

### ✅ Prerequisites

- **Node.js 18+** (ES Modules)
- **MongoDB** (local or Atlas)
- **S3-compatible storage** (optional for uploads)
- A **WebRTC-capable** browser

### 📦 Installation

```bash
# 1) Backend
cd backend
npm install
# create .env (see below)
npm run dev

# 2) Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5001** 🎉

### ▶️ Run Both Together

From `frontend/`:

```bash
npm start        # backend (nodemon) + frontend (vite)
npm run devi     # build + preview + backend (PWA enabled)
```

---

## 🔐 Environment Variables

Create `backend/.env`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>

# Server
PORT=3000

# JWT
JWT_SECRET=<long-secure-random-string>

# Object Storage (S3-compatible)
S3_BUCKET_NAME=<bucket-name>
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_ENDPOINT=https://<s3-endpoint>
S3_REGION=<region>
```

| Variable | Required | Description |
|:---------|:--------:|:------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `PORT` | — | Default `3000` |
| `JWT_SECRET` | ✅ | Token signing key |
| `S3_BUCKET_NAME` | 📎 | Bucket name |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | 📎 | Access keys |
| `S3_ENDPOINT` | 📎 | S3 service URL |
| `S3_REGION` | 📎 | Region (`default` for custom services) |

> 🔒 Never commit real credentials. Rotate any key that has ever been exposed.

---

## 📜 Scripts

<table>
<tr><th width="50%">Backend</th><th width="50%">Frontend</th></tr>
<tr>
<td>

| Command | Action |
|:--------|:-------|
| `npm run dev` | nodemon |
| `npm start` | plain run |
| `npm test` | not implemented |

</td>
<td>

| Command | Action |
|:--------|:-------|
| `npm run dev` | Vite :5001 |
| `npm run build` | `dist/` |
| `npm run preview` | Vite :5000 |
| `npm run lint` | ESLint |
| `npm run backend` | backend from frontend |
| `npm start` | backend + frontend |
| `npm run devi` | build + preview + backend |

</td>
</tr>
</table>

---

## 🌐 Ports & Proxy

| Service | Port |
|:--------|:----:|
| Backend (Express + Socket.IO) | `3000` |
| Frontend (Vite dev) | `5001` |
| Frontend (Vite preview) | `5000` |

`vite.config.js` proxies `/auth`, `/upload`, `/api` → `http://localhost:3000`. The socket connects **directly** to `http://localhost:3000`.

> ⚠️ Both Express and Socket.IO CORS origins are **hard-coded** to `http://localhost:5001`.

---

## ☁️ Deployment

1. `cd frontend && npm run build` → `frontend/dist`
2. Backend serves `dist` statically with SPA fallback.
3. Run with `npm start`.
4. Set `NODE_ENV=production` (secure cookies, `sameSite='none'`).
5. Update CORS origins to the production domain.
6. **Use HTTPS** — required for WebRTC and secure cookies.
7. For scaling: **Socket.IO Redis Adapter** + Redis-backed online users.

---

## 🛡️ Security Notes & Known Limitations

Honest snapshot of the current codebase:

- 🔑 **Secrets in `.env`.** `.gitignore` covers `.env*`; if ever committed, purge history and **rotate**.
- 🌍 **Hard-coded CORS** to `http://localhost:5001` (REST + Socket.IO).
- 🧠 **In-memory `UsersStore`** → breaks on restart and across instances.
- 🚦 **No rate limiting** or comprehensive validation (basic checks only).
- 🗂️ **`routes/rooms.js` is disabled** — rooms are socket-based only.
- 🧟 **`socket/call.js`** imports `@nhanaka/call`, which is not in `package.json` and not used → dead/experimental.
- 👤 **`Profile.jsx`** references `profile.bio` and `/settings`, but the `User` model has no `bio` and `/settings` isn't defined → "About me" stays empty.
- 🧪 **No automated tests** (`test` is a placeholder).
- 🚪 **`join room` for public rooms** simply adds the user to `members`.
- 🧨 **Deleting a room** also deletes all its messages.
- 🍪 **`GET /auth/me` returns the token in the body** so the socket can use it; an `httpOnly`-only design would be stricter.

---

## 🗺️ Future Roadmap

- 🧪 Tests — Vitest / Jest + Supertest + socket tests
- 🧱 **Redis Adapter** + Redis online users
- 🚦 Rate limiting + **Zod / Joi**
- 🔁 Refresh tokens & rotation
- 👥 **Group calls (SFU)** instead of 1:1
- ❄️ **TURN server** for tough NATs
- 🔔 Real **push notifications**
- 🧵 Threads, reactions, pinning
- 🔎 In-room message search
- 👤 `bio` / custom avatar + settings page
- ♾️ Infinite scroll for history
- 🌍 i18n / multi-language

---

<div align="center">

### ⭐ If this project helped you, give it a star!

**Built with ❤️ using Node.js, Socket.IO & React**

[⬆ Back to top](#-bms-real-time-chat) · [🇮🇷 Read in Persian](./READMEFA.md)

</div>
