# BMS Real-time Chat

> A fully Persian, right-to-left, real-time chat application built with **Node.js + Express + Socket.IO + MongoDB** on the backend and **React 19 + Vite + Tailwind CSS 4** on the frontend. Beyond text messaging, it supports **direct messages (DM)**, **file uploads to S3**, **unread notifications**, **WebRTC audio/video calls**, **screen sharing**, and **installable PWA** support.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [High-Level Architecture](#high-level-architecture)
- [Project Structure](#project-structure)
- [Backend](#backend)
  - [Entry Point & Startup](#entry-point--startup)
  - [Configuration](#configuration)
  - [Data Models](#data-models)
  - [REST API](#rest-api)
  - [Socket.IO Layer](#socketio-layer)
  - [Socket Events](#socket-events)
  - [Authentication](#authentication)
  - [File Upload via S3](#file-upload-via-s3)
  - [Notification System](#notification-system)
  - [WebRTC Signaling](#webrtc-signaling)
- [Frontend](#frontend)
  - [Routing & Auth](#routing--auth)
  - [State Management & Hooks](#state-management--hooks)
  - [Components](#components)
  - [Styling & Theme](#styling--theme)
  - [PWA](#pwa)
- [Core Flows](#core-flows)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Ports & Proxy](#ports--proxy)
- [Deployment](#deployment)
- [Security Notes & Known Limitations](#security-notes--known-limitations)
- [Future Roadmap](#future-roadmap)

---

## Overview

This project is a **dedicated real-time chat system** that started as a Socket.IO learning exercise and grew into a full application with the following capabilities:

- Authentication with **JWT** (an `httpOnly` cookie + socket authentication)
- Public/group rooms + **two-person direct messages (DM)**
- Text, **file**, and **system** messages
- Message editing and deletion (for me / for everyone)
- **Typing indicator** and **online users list**
- **Per-room unread notifications**
- **1:1 audio/video calls** via WebRTC + **high-quality screen sharing**
- **PWA** installable on mobile and desktop
- A modern, **Persian, RTL** UI with the Vazir font, glassmorphism effects, and a Halloween background

---

## Features

### Messaging
- Real-time send/receive of messages in rooms
- Message history loading (up to the last 100 messages on room join; pagination with `before` and `limit`)
- Message types `message` / `file` / `system`
- Editing restricted to the sender
- Deletion: "delete for me" or "delete for everyone" (sender only)
- Persian time formatting (`fa-IR`)
- All messages persisted in MongoDB

### Rooms
- Create rooms (2–30 characters, unique name)
- Join / leave rooms
- Delete a room only by its creator (also removes all its messages)
- Search public rooms and users (by username or ID)
- Private rooms for DMs named deterministically as `dm_<smallId>_<largeId>`

### Direct Messages (DM)
- Open a DM with an online user (via socket id) or an offline user (via database id)
- Automatically creates the private room if it doesn't exist
- Prevents messaging yourself
- Displays the other party's online/offline status

### Calls (WebRTC)
- 1:1 audio and video calls
- 1080p / 30fps target quality and `maxBitrate` up to 8 Mbps
- **Screen sharing** with smart video-track replacement (`replaceTrack`)
- Mute microphone and Deafen
- **Perfect Negotiation** and glare handling for mid-call track changes
- ICE candidate handling and deferred renegotiation (`pendingRenegotiation`)

### User Experience
- Glassmorphism design and animated gradients
- **Dark/Light** mode and a Halloween background
- Self-contained, reusable components
- Installable as a PWA with a Service Worker (build/preview only)
- Toast notifications via `sileo`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js (ES Modules) |
| Backend | Express 4, Socket.IO 4 |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` + `cookie-parser` |
| File Storage | AWS SDK v3 for S3 (compatible with Iranian providers) |
| Frontend | React 19, Vite 8, React Router 7 |
| Styling | Tailwind CSS 4 + custom CSS, Vazir font |
| Forms / Validation | react-hook-form + yup |
| Realtime | socket.io-client |
| PWA | vite-plugin-pwa |
| Notifications | sileo |
| Dev Tools | nodemon, ESLint, concurrently |

---

## High-Level Architecture

```
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
│  Express  ──▶ routes: auth / upload / (rooms-commented)       │
│                                                                 │
│  http.Server ──▶ Socket.IO                                     │
│      ├─ Auth middleware (JWT from cookie or auth.token)        │
│      ├─ handlers: users, chat, rooms, direct, typing,          │
│      │            notification, webrtc                         │
│      └─ UsersStore (in-memory Map for online users)            │
│                                                                 │
│  Mongoose ──▶ MongoDB   (User, Room, Message, Notification)    │
│  AWS SDK   ──▶ Object Storage (S3 compatible, presigned URLs)  │
└──────────────────────────────────────────────────────────────┘
```

> **Note:** All room logic is handled through **Socket.IO events**. `routes/rooms.js` is merely a commented-out, disabled early version.

---

## Project Structure

```
learning SOCKET.IO/
├── README.md                    ← this file (repository root)
├── backend/
│   ├── .env                     ← environment variables (must NOT be in Git)
│   ├── package.json
│   └── src/
│       ├── server.js            ← Express + HTTP + Socket.IO entry point
│       ├── config/
│       │   ├── db.js            ← Mongoose connection
│       │   └── s3.js            ← S3 client (forcePathStyle)
│       ├── models/
│       │   ├── User.js
│       │   ├── Room.js
│       │   ├── Message.js
│       │   └── Notification.js
│       ├── routes/
│       │   ├── auth.js          ← register/login/logout/me/profile
│       │   ├── upload.js        ← S3 presigned upload
│       │   └── rooms.js         ← legacy version, commented out
│       ├── socket/
│       │   ├── index.js         ← initSocket + registers all events
│       │   ├── call.js          ← @nhanaka/call skeleton (inactive)
│       │   └── handlers/
│       │       ├── users.js     ← join and room-list building
│       │       ├── chat.js      ← message, delete, edit, history, notify
│       │       ├── rooms.js     ← create/join/leave/delete/search/info
│       │       ├── direct.js    ← opening a DM
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
    ├── public/                  ← PWA icons and logo
    └── src/
        ├── main.jsx
        ├── App.jsx              ← Router + auth check (/auth/me)
        ├── socket.js            ← socket singleton
        ├── index.css            ← Tailwind + custom styles
        ├── assets/
        ├── fonts/               ← Vazir (Light/Medium)
        ├── hooks/
        │   ├── useChat.js       ← core chat and room logic
        │   ├── useSocket.js
        │   └── useWebRTC.js     ← all call and screen-share logic
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
            ├── CallModal.jsx            ← call UI
            ├── Avatar.jsx / ContextMenu.jsx
            ├── EmojiPickerPanel.jsx
            ├── ThemeToggle.jsx
            ├── HalloweenBackground.jsx
            ├── InstallButton.jsx        ← PWA install
            └── LoadingSpinner.jsx
```

---

## Backend

### Entry Point & Startup

`src/server.js`:

1. Creates an **Express** app and an **HTTP server** (via `node:http`).
2. Enables `express.json()`, `cookieParser()`, and **CORS** (origin: `http://localhost:5001` with `credentials: true`).
3. Mounts `/auth` and `/upload` routes (the `/api/rooms` route is commented out).
4. Serves the `frontend/dist` folder statically and provides an SPA **fallback** to `index.html` for non-API routes.
5. In `start()` it first connects to MongoDB, then initializes Socket.IO, and listens on `PORT` (default 3000).

### Configuration

- **`config/db.js`**: Connects to MongoDB via `MONGODB_URI`; calls `process.exit(1)` on failure.
- **`config/s3.js`**: Creates an `S3Client` with `region`, `endpoint`, credentials, and `forcePathStyle: true` (required for S3-compatible services).
- **`utils/users.js`**: The `UsersStore` class keeps a `socket.id → { id, userId, username }` mapping in a `Map`. It is **in-memory** and is cleared when the server restarts.

> ⚠️ Keeping online users in memory means running multiple instances without an **Adapter** (e.g., Redis) will cause inconsistencies. This project is designed for single-instance execution.

### Data Models

#### User
| Field | Type | Notes |
|-------|------|-------|
| `username` | String | Unique, trimmed, max 30 |
| `password` | String | bcrypt hash |
| `createdAt` | Date | |

#### Room
| Field | Type | Notes |
|-------|------|-------|
| `name` | String | Effectively unique, max 100 |
| `createdBy` | ObjectId → User | Creator |
| `members` | [ObjectId → User] | Members |
| `isPrivate` | Boolean | For DMs |
| `createdAt` | Date | |

Indexes: `name` (text), `members`, `isPrivate`

#### Message
| Field | Type | Notes |
|-------|------|-------|
| `text` | String | max 500 |
| `sender` | String | Username |
| `senderId` | ObjectId → User | |
| `type` | `message` \| `system` \| `file` | |
| `fileUrl` / `fileName` / `fileType` / `fileSize` | | For file messages |
| `room` | String | Room name (indexed) |
| `deletedFor` | [ObjectId] | Users who deleted it "for me" |
| `isDeletedForEveryone` | Boolean | |
| `createdAt` | Date | |

Indexes: `createdAt`, `(room, createdAt)`

#### Notification
| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | Recipient |
| `senderId` | ObjectId → User | Sender |
| `senderName` | String | |
| `roomName` | String | |
| `messagePreview` | String | max 150 |
| `isRead` | Boolean | Defaults to false |
| `createdAt` | Date | |

It also exposes a static method `markAllAsRead(userId, roomName?)`.

### REST API

All routes live under `/auth` and `/upload` (no `/api` prefix).

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register; sets the `token` cookie | — |
| POST | `/auth/login` | Login; sets the `token` cookie | — |
| POST | `/auth/logout` | Clear the cookie | — |
| GET | `/auth/me` | Return the current user + token (for persistence) | Cookie |
| GET | `/auth/profile` | Current user's profile + message count | ✅ |
| GET | `/auth/profile/:username` | Public profile of a user + message count | — |
| GET | `/auth/call-token` | Return the token for calls | ✅ |
| POST | `/upload/presign` | Create a presigned upload URL | — |

Responses are in the form `{ ... }` or `{ error }`. Error messages are in Persian.

> **Auth cookie:** `httpOnly: true`, `secure` and `sameSite: 'none'` in production, `lax` in development, `maxAge` of seven days, `path: '/'`.

### Socket.IO Layer

- `initSocket(server)` creates a `Server` instance with CORS matching the REST layer.
- An **auth middleware** reads the token from `socket.handshake.auth.token` or the `token` cookie header and, if valid, sets `socket.userId` and `socket.username`. Connections without a token are rejected.
- On connection, every socket joins its own personal room (`socket.id`) so it can be pushed to directly.
- All handlers are written as **factory functions**: `handleX(socket, io, users) → (payload, callback) => {}`, which keeps their registration in `socket/index.js` clean.
- On `disconnect`, the user is removed from `UsersStore` and `online users` is re-emitted.

### Socket Events

#### Client → Server (with callback)

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{}` | Register the user in UsersStore and receive the room list |
| `chat message` | `{ text, type, fileUrl, fileName, fileType, fileSize }` | Send a message |
| `get messages` | `{ room, before?, limit? }` | Paginated history |
| `edit message` | `{ messageId, newText }` | Edit by the sender |
| `delete message` | `{ messageId, deleteForEveryone }` | Delete |
| `typing` | `boolean` | Typing status |
| `list rooms` | — | Fetch the user's rooms |
| `search rooms` | `{ query }` or `string` | Search rooms/users |
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
|-------|---------|-------------|
| `chat message` | Message object | Emitted to the room |
| `system message` | `{ text, room }` | Member join/leave |
| `online users` | Array of users | |
| `typing` | `{ username, isTyping }` | |
| `room created` | `{ id, name, createdBy }` | To everyone |
| `room removed` | `{ roomName }` | |
| `room deleted` | `{ roomName }` | To room members |
| `room users` | Array of room users | |
| `message deleted` | `{ messageId, deleteForEveryone }` | |
| `message edited` | Message object | |
| `new notification` | Notification object | Direct to the recipient's personal room |
| `notifications updated` | `{ count }` | |
| `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` | Signals | |
| `webrtc-hangup` / `webrtc-stream-updated` / `webrtc-screen-lock` / `webrtc-screen-unlock` | | |

### Authentication

1. The user logs in via `POST /auth/login`; the server verifies the password with `bcrypt.compare` and creates a 7-day JWT (`{ id, username }`) using `signToken`.
2. The token is set in an `httpOnly` cookie and also returned in the response body.
3. The frontend stores the token in `socket.auth` via `setSocketToken(token)` so it's sent during the handshake.
4. On reload, `GET /auth/me` restores the user from the cookie (persistence login).

### File Upload via S3

The **Presigned URL** flow:

1. The client sends `POST /upload/presign` with `{ fileName, fileType }`.
2. The server generates a unique key: `uploads/<uuid>.<ext>`.
3. It builds a `PutObjectCommand` and uses `getSignedUrl` to produce a 10-minute upload URL.
4. It returns `uploadUrl` (for direct PUT) and `publicUrl` (`S3_ENDPOINT/BUCKET/key`).
5. The client **PUTs** the file to `uploadUrl` and then sends a `file`-type message with `fileUrl`.

> The security of this flow depends on the S3 bucket's CORS and policy configuration; S3 keys are kept in `.env`.

### Notification System

- After a message is sent in a room that has a `Room` document, a `Notification` is created for each member **not present in the room**.
- "Present in the room" is determined via the sockets joined to the room and the `UsersStore` mapping.
- No notification is sent to the sender.
- If the recipient is online, the `new notification` event is emitted directly to their personal room (`targetUser.id`).
- On room join or when the notifications dropdown is opened, `markAllAsRead` (optionally scoped to `roomName`) is called.

### WebRTC Signaling

The server is only a **relay** and no media passes through it:

- `webrtc-offer` → to the target user (with `renegotiate`)
- `webrtc-answer`, `webrtc-ice-candidate` → two-way relay
- `webrtc-hangup` → ends the call
- `webrtc-stream-updated` → notifies of a track change (so the client re-syncs)
- `webrtc-screen-lock/unlock` → notifies screen-share start/end

The target is located via `users.findByUserId(targetUserId)` (so calls are only possible with **online** users).

---

## Frontend

### Routing & Auth

`App.jsx` first calls `GET /auth/me`:

- If a user is returned, `authUser` is set and the socket receives the token.
- Until the check completes, a loading screen with the Halloween background is shown.

Routes:

| Path | Access | Content |
|------|--------|---------|
| `/login` | Guest | Login |
| `/register` | Guest | Register |
| `/chat` | Authenticated | Main chat screen |
| `/profile` | Authenticated | Own profile |
| `/profile/:username` | Authenticated | Others' profile |
| `/` | — | Smart redirect |

Logout uses `POST /auth/logout` + `chat.logout()` (disconnects the socket and clears state).

### State Management & Hooks

#### `useChat.js` — core chat logic

This hook holds all chat state:

- `messages`, `onlineUsers`, `typingUsers`, `rooms`, `currentRoom`
- `notifications`, `unreadCount`, `showNotifications`, `dmPartnerName`
- `connected`, `error`

And exports the following functions:

- Connection lifecycle: `connectSocket`, `disconnectSocket` / `logout`
- Messages: `sendMessage`, `setTyping`, `deleteMessage`, `editMessage`
- Rooms: `createRoom`, `searchRooms`, `switchRoom`, `leaveRoom`, `deleteRoom`, `refreshRooms`
- DM: `openDM`
- Notifications: `fetchNotifications`, `markNotificationsAsRead`

This hook registers all socket listeners (messages, system, online users, typing, rooms, delete/edit, notifications) and removes them in cleanup to prevent leaks.

#### `useWebRTC.js` — call engine

The largest and most complex part of the frontend. It is responsible for:

- Creating the `RTCPeerConnection` with Google STUN
- Managing `localStream` / `remoteStream` / `remoteStreamVersion`
- Controls `toggleMute`, `toggleDeafen`, `toggleVideo`, `toggleScreenShare`
- **Perfect Negotiation** to avoid offer conflicts (glare): the "polite" side rolls back and re-offers, while the "impolite" side ignores.
- Smart remote-track filtering (drop `ended` tracks, keep transient `muted` tracks)
- Bitrate tuning and deferred ICE candidate storage

#### `useSocket.js`
A lightweight version for exposing connection status (`isConnected`).

### Components

| Component | Role |
|-----------|------|
| `Login` / `Register` | Auth forms with react-hook-form + yup |
| `Chat` | Main layout, responsive sidebar, wires `useChat` to the UI |
| `ChatHeader` | Header, connection status, notification, call, profile, logout buttons |
| `RoomList` | Room list, create/delete/leave, search, online list, DM |
| `MessageList` | Scrollable message list rendering `MessageBubble` |
| `MessageBubble` | Message bubble, context menu, file display, edit/delete |
| `ChatInput` | Multi-line input, file send, emoji, typing |
| `EmojiPickerPanel` | Emoji picker |
| `TypingIndicator` | "... is typing" |
| `OnlineUsersList` | Online users and starting DM/call |
| `NotificationDropdown` | Unread notifications, jump to room/sender |
| `CallModal` | Full call UI (video, controls, ringing/connected states) |
| `WelcomeScreen` | Welcome screen when no room is selected |
| `Avatar` | Avatar generated from username/color |
| `ThemeToggle` | Theme switcher |
| `HalloweenBackground` | Decorative background |
| `InstallButton` | PWA install button |
| `LoadingSpinner` | Loader |
| `ToastProvider` | sileo toast container |
| `Profile` (page) | Profile with gradient banner, message stats, ID chip |

### Styling & Theme

- **Tailwind CSS 4** via `@tailwindcss/vite`.
- Design uses custom classes such as `glass-morphism-strong`, `btn-primary`, `bg-aurora`, `animate-blob`, `slide-in-left` defined in `index.css`.
- The **Vazir** font (Light/Medium) is bundled locally in `src/fonts`.
- The overall direction is `dir="rtl"` with `lang="fa"`.

### PWA

Configured in `vite.config.js` with `vite-plugin-pwa`:

- `registerType: 'autoUpdate'`
- manifest: name "BMS Real-time Chat", short name "BMS Chat", theme color `#6366f1`, background `#0f172a`, 192 and 512 (maskable) icons
- The Service Worker is active only in **build/preview** (`devOptions.enabled: false`).

---

## Core Flows

### 1) Login & Connection
```
Login ──POST /auth/login──▶ (Set-Cookie token, JSON {user, token})
   │
   ├─ setAuthUser(user)
   ├─ setSocketToken(token)
   └─ navigate('/chat') ─▶ connectSocket()
                              │
                              └─ socket.connect()
                                    ├─ handshake auth (token/cookie)
                                    └─ emit('join') → { user, rooms, history:[], currentRoom:null }
```

### 2) Joining a Room
```
switchRoom(name) ──emit('join room')──▶
    server: check membership / persist Room → socket.join(name)
            markAllAsRead(userId, name)
            load the last 100 messages
    ◀── { success, room, history }
    socket.to(room).emit('system message', '... joined the room.')
    io.to(room).emit('room users', ...)
```

### 3) Sending a Message
```
sendMessage({text,...}) ──emit('chat message')──▶
    server: validate (length ≤ 500) → Message.create
            io.to(room).emit('chat message', message)
            for absent members → Notification + emit('new notification')
    ◀── callback({ success, message })
```

### 4) Direct Message
```
openDM(targetUserId) ──emit('open dm')──▶
    if target is online: from UsersStore (socket id → userId)
    else: User.findById
    deterministic room name: dm_<minId>_<maxId>  (Room with isPrivate=true)
    socket leaves the previous room → joins the DM → loads history
    ◀── { room, history, targetUser:{id, username, isOnline} }
```

### 5) WebRTC Call
```
Caller: getUserMedia → createOffer → emit('webrtc-offer', {target, offer})
Callee: receive offer → getUserMedia → createAnswer → emit('webrtc-answer')
Both:   onicecandidate → emit('webrtc-ice-candidate')
        ontrack → syncRemoteStream
Mid-call change (video/screen): replaceTrack/addTrack
        → renegotiate if needed (Perfect Negotiation)
        → emit('webrtc-stream-updated')
End:    emit('webrtc-hangup')
```

---

## Getting Started

### Prerequisites
- **Node.js 18+** (the project uses ES Modules)
- **MongoDB** (or Atlas)
- Access to an **S3-compatible** service for file uploads (optional for other features)
- A WebRTC-capable browser (Chrome/Edge/Firefox/Safari)

### Installation

```bash
# 1) Backend
cd backend
npm install
# Create a .env file (see the Environment Variables section)
npm run dev

# 2) Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5001` in your browser.

### Running Both Together (optional)

From inside `frontend`:

```bash
npm start        # backend (nodemon) + frontend (vite) via concurrently
```

Or a local production-like run:

```bash
npm run devi     # build + preview (static serving) + backend
```

> In `preview` mode, PWA and the Service Worker are also active.

---

## Environment Variables

`backend/.env` should contain the following (sample values — never commit real values to Git):

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>

# Server
PORT=3000

# JWT
JWT_SECRET=<a-long-secure-random-string>

# Object Storage (S3-compatible)
S3_BUCKET_NAME=<bucket-name>
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_ENDPOINT=https://<s3-endpoint>
S3_REGION=<region>
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `PORT` | — | Defaults to 3000 |
| `JWT_SECRET` | ✅ | Token signing key |
| `S3_BUCKET_NAME` | For files | Bucket name |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | For files | Access keys |
| `S3_ENDPOINT` | For files | S3 service URL |
| `S3_REGION` | For files | Region (usually `default` for custom services) |

---

## Scripts

### Backend (`backend/package.json`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Runs `src/server.js` with nodemon |
| `npm start` | Normal run without watch |
| `npm test` | (Not implemented yet) |

### Frontend (`frontend/package.json`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Runs Vite on port 5001 |
| `npm run build` | Production build into `frontend/dist` |
| `npm run preview` | Previews the build on port 5000 |
| `npm run lint` | Runs ESLint |
| `npm run backend` | Runs the backend from inside the frontend folder |
| `npm start` | Backend + frontend simultaneously |
| `npm run devi` | build + preview + backend |

---

## Ports & Proxy

| Service | Port |
|---------|------|
| Backend (Express + Socket.IO) | `3000` |
| Frontend (Vite dev) | `5001` |
| Frontend (Vite preview) | `5000` |

`vite.config.js` defines a **proxy** for `/auth`, `/upload`, `/api` to `http://localhost:3000`; therefore the frontend's REST requests pass through without CORS issues. The socket connects directly to `http://localhost:3000`.

> ⚠️ On the backend, both `cors` origins (Express and Socket.IO) are **hard-coded** to `http://localhost:5001`. This must be updated for a real domain.

---

## Deployment

Recommended path (single instance):

1. `cd frontend && npm run build` to produce output in `frontend/dist`.
2. The backend serves it statically from `../../frontend/dist` and provides SPA fallback.
3. Run the backend with `npm start` on the server.
4. Set `NODE_ENV=production` so cookies become `secure` and `sameSite: 'none'`.
5. Change the CORS origins to the production domain.
6. Use **HTTPS**; WebRTC and secure cookies don't work well in real environments without it.
7. For scaling, you'll need a **Socket.IO Redis Adapter** and Redis-backed online-user storage (since `UsersStore` is in-memory).

---

## Security Notes & Known Limitations

This section honestly describes the current state of the project (without changing code):

- **Sensitive keys live in `.env`.** The backend `.gitignore` ignores `.env*`, but if they were ever committed they must be purged from history and **rotated**.
- **CORS is hard-coded** to `http://localhost:5001` (both REST and Socket.IO); it must be set to the real domain before production.
- **`UsersStore` is in-memory:** on server restart and across multiple instances, the online list and calls break.
- **No rate limiting or comprehensive input validation** on REST/Socket (only basic checks like message length and room name).
- **`routes/rooms.js` is disabled**; room logic is socket-based only.
- **`socket/call.js`** imports the `@nhanaka/call` package, which isn't in `package.json` and isn't used in `server.js`; it is effectively **dead/experimental** code.
- **`Profile.jsx`** references `profile.bio` and the `/settings` route, but the `User` model has no `bio` field and `/settings` isn't defined; thus the "About me" section is effectively empty and the edit-profile button has no destination.
- **No automated tests**; the backend's `test` script is a placeholder.
- **No membership validation in `join room` for public rooms:** a user is added to `members` when they join (current intended behavior).
- **Deleting a room** also deletes all of its messages.
- **`GET /auth/me` returns the token in the response body** so the socket can use it; from a security standpoint an `httpOnly` cookie is safer, but this project does it because of the socket architecture.

---

## Future Roadmap

- Add **tests** (Jest/Vitest + Supertest + socket.io tests)
- **Redis Adapter** for Socket.IO and Redis-backed online users for horizontal scaling
- **Rate limiting** and **Zod/Joi** validation
- **Refresh Tokens** and token rotation
- **Group WebRTC calls (SFU)** instead of 1:1
- **TURN server** for painful NAT traversal
- Real **Push** notifications in the PWA
- Support for **Threads/Replies**, **Reactions**, and **Pinning**
- In-room message search
- A `bio` field / custom avatar in the `User` model and a settings page
- Infinite scrolling of messages in the UI
- Internationalization (i18n) and multi-language support

---

<div align="center">

**BMS Real-time Chat** — built to learn and experience building a complete real-time chat with Node.js and Socket.IO

</div>
