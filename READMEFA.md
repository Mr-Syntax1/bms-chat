<!-- ─────────────────────────  انتخاب زبان  ───────────────────────── -->
<div align="center">

## 🌐 زبان / Language

[![English](https://img.shields.io/badge/🇬🇧%20English-Read%20now-6366f1?style=for-the-badge)](./readme.md)
[![فارسی](https://img.shields.io/badge/🇮🇷%20فارسی-مطالعه-8b5cf6?style=for-the-badge)](./readmefa.md)

</div>

<!-- ─────────────────────────────  هدر  ───────────────────────────── -->
<div align="center">

# 💬 BMS Real-time Chat

### یک پلتفرم چت بلادرنگ مدرن با تماس WebRTC، چت خصوصی و ارسال فایل

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
  <a href="#-نمای-کلی">نمای کلی</a> •
  <a href="#-ویژگیها">ویژگی‌ها</a> •
  <a href="#-پشته-فناوری">پشته فناوری</a> •
  <a href="#-معماری">معماری</a> •
  <a href="#-شروع-به-کار">شروع به کار</a> •
  <a href="#-نکات-امنیتی-و-محدودیتهای-شناختهشده">امنیت</a>
</p>

</div>

---

## 🚀 نمای کلی

**BMS Real-time Chat** یک اپلیکیشن پیام‌رسان بلادرنگ فول‌استک با رابط کاربری کاملاً فارسی و راست‌به‌چپ است که روی یک استک مدرن جاوااسکریپت بنا شده:

- **بک‌اند:** Node.js · Express · Socket.IO · MongoDB · JWT · AWS S3
- **فرانت‌اند:** React 19 · Vite · Tailwind CSS 4 · React Router 7 · PWA

این پروژه فراتر از چت متنی ساده است — شامل **چت خصوصی (DM)**، **آپلود فایل**، **نوتیفیکیشن خوانده‌نشده**، **تماس صوتی/تصویری ۱:۱**، **اشتراک‌گذاری صفحه** و تجربه **PWA قابل نصب** می‌شود.

> 🎯 **هدف طراحی:** رابط کاربری مدرن و شیشه‌ای (Glassmorphism) همراه با معماری بلادرنگ در سطح تولید که خواندن، توسعه و یادگیری آن آسان باشد.

---

## ✨ ویژگی‌ها

<table>
<tr>
<td width="50%" valign="top">

### 💬 پیام‌رسانی
- ⚡ ارسال و دریافت بلادرنگ
- 🕘 تاریخچه پیام (۱۰۰ پیام آخر هنگام ورود)
- 📎 پیام متنی، فایل و سیستمی
- ✏️ ویرایش پیام‌های خود
- 🗑️ حذف برای من / برای همه
- 🕒 نمایش زمان به فارسی

### 🏠 اتاق‌ها
- ➕ ساخت اتاق (۲ تا ۳۰ کاراکتر)
- 🚪 ورود / خروج از اتاق
- 👑 حذف اتاق فقط توسط سازنده
- 🔍 جستجوی اتاق و کاربر
- 🔒 اتاق خصوصی برای DM

</td>
<td width="50%" valign="top">

### 👥 چت خصوصی
- 💌 DM با کاربر آنلاین و آفلاین
- 🧠 ساخت خودکار اتاق خصوصی
- 🚫 جلوگیری از چت با خود
- 🟢 نمایش زنده وضعیت آنلاین

### 📞 تماس WebRTC
- 🎙️ تماس صوتی و تصویری (۱:۱)
- 🖥️ اشتراک صفحه با کیفیت بالا
- 🔇 قطع صدا و ناشنوا شدن
- 🧩 Perfect Negotiation و مدیریت Glare
- 🧊 بافر کردن کاندیدهای ICE

</td>
</tr>
</table>

### 🎨 تجربه و پلتفرم
- 🧊 رابط شیشه‌ای با گرادیان‌های متحرک
- 🌗 تم روشن / تیره + 🎃 پس‌زمینه هالووین
- 📲 **PWA** قابل نصب با Service Worker به‌روزرسانی خودکار
- 🔔 اعلان‌های Toast با **sileo**
- 🈯 چیدمان کامل **فارسی / RTL** با فونت وزیر

---

## 🧰 پشته فناوری

| لایه | فناوری | توضیح |
|:-----|:-------|:------|
| **Runtime** | Node.js | ES Modules |
| **بک‌اند** | Express 4 + Socket.IO 4 | REST + بلادرنگ |
| **دیتابیس** | MongoDB + Mongoose 9 | کاربر، اتاق، پیام، نوتیف |
| **احراز هویت** | JWT + bcryptjs + cookie-parser | کوکی `httpOnly` + handshake سوکت |
| **ذخیره‌سازی** | AWS SDK v3 (سازگار با S3) | URL آپلود امضاشده |
| **فرانت‌اند** | React 19 + Vite 8 + React Router 7 | SPA |
| **استایل** | Tailwind CSS 4 + CSS سفارشی | فونت وزیر، RTL |
| **فرم‌ها** | react-hook-form + yup | اعتبارسنجی سمت کلاینت |
| **بلادرنگ** | socket.io-client | سوکت singleton |
| **PWA** | vite-plugin-pwa | SW به‌روزرسانی خودکار |
| **اعلان** | sileo | رابط نوتیفیکیشن |
| **توسعه** | nodemon · ESLint · concurrently | گردش‌کار محلی |

---

## 🏗️ معماری

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

> ℹ️ تمام منطق اتاق‌ها از طریق **رویدادهای Socket.IO** انجام می‌شود. فایل `routes/rooms.js` نسخه‌ی اولیه و کامنت‌شده است.

---

## 📁 ساختار پروژه

```text
learning SOCKET.IO/
├── readme.md                    ← نسخه انگلیسی
├── readmefa.md                  ← نسخه فارسی (اینجا هستید)
├── backend/
│   ├── .env                     ← متغیرهای محیطی (هرگز commit نشود)
│   ├── package.json
│   └── src/
│       ├── server.js            ← نقطه ورود Express + HTTP + Socket.IO
│       ├── config/
│       │   ├── db.js            ← اتصال Mongoose
│       │   └── s3.js            ← کلاینت S3 (forcePathStyle)
│       ├── models/
│       │   ├── User.js
│       │   ├── Room.js
│       │   ├── Message.js
│       │   └── Notification.js
│       ├── routes/
│       │   ├── auth.js          ← register / login / logout / me / profile
│       │   ├── upload.js        ← آپلود امضاشده S3
│       │   └── rooms.js         ← نسخه قدیمی کامنت‌شده
│       ├── socket/
│       │   ├── index.js         ← initSocket + ثبت رویدادها
│       │   ├── call.js          ← اسکلت @nhanaka/call (غیرفعال)
│       │   └── handlers/
│       │       ├── users.js     ← join + لیست اتاق‌ها
│       │       ├── chat.js      ← CRUD پیام + تاریخچه + نوتیف
│       │       ├── rooms.js     ← ساخت/ورود/خروج/حذف/جستجو/اطلاعات
│       │       ├── direct.js    ← باز کردن DM
│       │       ├── typing.js    ← وضعیت تایپ
│       │       ├── notification.js
│       │       └── webrtc.js    ← سیگنالینگ تماس
│       └── utils/
│           ├── jwt.js
│           ├── users.js         ← UsersStore (Map در حافظه)
│           └── messages.js
└── frontend/
    ├── index.html               ← lang="fa" dir="rtl"
    ├── vite.config.js           ← پورت 5001 + proxy + PWA
    ├── eslint.config.js
    ├── package.json
    ├── public/                  ← آیکون‌های PWA و لوگو
    └── src/
        ├── main.jsx
        ├── App.jsx              ← Router + بررسی auth (/auth/me)
        ├── socket.js            ← سوکت singleton
        ├── index.css            ← Tailwind + استایل سفارشی
        ├── assets/
        ├── fonts/               ← وزیر (Light / Medium)
        ├── hooks/
        │   ├── useChat.js       ← منطق اصلی چت و اتاق
        │   ├── useSocket.js
        │   └── useWebRTC.js     ← موتور تماس و اشتراک صفحه
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

## 🖥️ بک‌اند

### ⚙️ نقطه ورود و راه‌اندازی

فایل `src/server.js` موارد زیر را انجام می‌دهد:

1. یک اپ **Express** و یک **HTTP Server** (`node:http`) می‌سازد.
2. `express.json()`، `cookieParser()` و **CORS** (origin `http://localhost:5001` با `credentials: true`) را فعال می‌کند.
3. روت‌های `/auth` و `/upload` را mount می‌کند (روت `/api/rooms` کامنت شده است).
4. پوشه `frontend/dist` را استاتیک سرو می‌کند و برای SPA به `index.html` fallback دارد.
5. در `start()`: اتصال به MongoDB → راه‌اندازی Socket.IO → گوش دادن روی `PORT` (پیش‌فرض `3000`).

### 🧩 پیکربندی

| فایل | هدف |
|:-----|:----|
| `config/db.js` | اتصال MongoDB با `MONGODB_URI`؛ خروج در صورت خطا |
| `config/s3.js` | `S3Client` با endpoint، credentials و `forcePathStyle: true` |
| `utils/users.js` | `UsersStore` — `Map<socketId, user>` در حافظه |

> ⚠️ کاربران آنلاین **در حافظه** نگه‌داری می‌شوند. اجرای چند instance بدون Adapter (مثلاً Redis) باعث ناسازگاری می‌شود. این پروژه برای اجرای تک‌نمونه طراحی شده است.

### 🗃️ مدل‌های داده

<table>
<tr><th width="25%">مدل</th><th>فیلدها</th></tr>
<tr>
<td><b>User</b></td>
<td>

`username` (یکتا، حداکثر ۳۰) · `password` (bcrypt) · `createdAt`

</td>
</tr>
<tr>
<td><b>Room</b></td>
<td>

`name` · `createdBy` → User · `members` → [User] · `isPrivate` · `createdAt`
<br><sub>ایندکس: name (text)، members، isPrivate</sub>

</td>
</tr>
<tr>
<td><b>Message</b></td>
<td>

`text` (حداکثر ۵۰۰) · `sender` · `senderId` → User · `type` (`message` / `system` / `file`) · `fileUrl` · `fileName` · `fileType` · `fileSize` · `room` · `deletedFor` → [User] · `isDeletedForEveryone` · `createdAt`
<br><sub>ایندکس: createdAt، (room + createdAt)</sub>

</td>
</tr>
<tr>
<td><b>Notification</b></td>
<td>

`userId` → User · `senderId` → User · `senderName` · `roomName` · `messagePreview` · `isRead` · `createdAt`
<br><sub>متد استاتیک: <code>markAllAsRead(userId, roomName?)</code></sub>

</td>
</tr>
</table>

### 🌐 REST API

همه مسیرها زیر `/auth` و `/upload` هستند (بدون پیشوند `/api`).

| متد | مسیر | توضیح | احراز هویت |
|:---:|:-----|:------|:----------:|
| `POST` | `/auth/register` | ثبت‌نام + ست کردن کوکی `token` | — |
| `POST` | `/auth/login` | ورود + ست کردن کوکی `token` | — |
| `POST` | `/auth/logout` | پاک کردن کوکی | — |
| `GET` | `/auth/me` | کاربر جاری + توکن (persistence) | 🍪 |
| `GET` | `/auth/profile` | پروفایل خود + تعداد پیام | ✅ |
| `GET` | `/auth/profile/:username` | پروفایل عمومی + تعداد پیام | — |
| `GET` | `/auth/call-token` | توکن برای تماس | ✅ |
| `POST` | `/upload/presign` | URL آپلود امضاشده S3 | — |

> 🍪 **کوکی:** `httpOnly`، در production `secure` + `sameSite='none'`، در توسعه `lax`، `maxAge` هفت روز، `path='/'`.

### 🔌 لایه Socket.IO

- `initSocket(server)` سرور Socket.IO را با CORS مشابه می‌سازد.
- **Middleware احراز هویت** توکن را از `handshake.auth.token` یا کوکی `token` می‌خواند و `socket.userId` / `socket.username` را ست می‌کند. توکن نامعتبر یا غایب رد می‌شود.
- هر سوکت به **اتاق شخصی** خودش (`socket.id`) join می‌شود تا بتوان مستقیم به آن push کرد.
- هندلرها به شکل **factory function** هستند: `handleX(socket, io, users) → (payload, callback) => {}`.
- در `disconnect`، کاربر از `UsersStore` حذف و `online users` دوباره emit می‌شود.

### 📡 رویدادهای Socket

#### کلاینت → سرور (با callback)

| رویداد | Payload | توضیح |
|:-------|:--------|:------|
| `join` | `{}` | ثبت کاربر + دریافت لیست اتاق‌ها |
| `chat message` | `{ text, type, fileUrl, fileName, fileType, fileSize }` | ارسال پیام |
| `get messages` | `{ room, before?, limit? }` | تاریخچه صفحه‌بندی‌شده |
| `edit message` | `{ messageId, newText }` | فقط فرستنده |
| `delete message` | `{ messageId, deleteForEveryone }` | حذف |
| `typing` | `boolean` | وضعیت تایپ |
| `list rooms` | — | اتاق‌های کاربر |
| `search rooms` | `{ query }` / `string` | جستجوی اتاق و کاربر |
| `create room` | `{ name }` | |
| `join room` | `{ roomName }` | |
| `leave room` | `{ roomName? }` | |
| `delete room` | `{ roomName }` | فقط سازنده |
| `get room info` | `{ roomName }` | |
| `open dm` | `{ targetUserId }` | |
| `get notifications` | `{}` | نوتیف‌های خوانده‌نشده |
| `mark notifications as read` | `{ roomName? }` | |
| `webrtc-offer` | `{ targetUserId, offer, renegotiate? }` | |
| `webrtc-answer` | `{ targetUserId, answer }` | |
| `webrtc-ice-candidate` | `{ targetUserId, candidate }` | |
| `webrtc-hangup` | `{ targetUserId }` | |
| `webrtc-stream-updated` | `{ targetUserId }` | تغییر ترک |
| `webrtc-screen-lock` | `{ targetUserId }` | شروع اشتراک صفحه |
| `webrtc-screen-unlock` | `{ targetUserId }` | پایان اشتراک صفحه |

#### سرور → کلاینت

| رویداد | Payload | توضیح |
|:-------|:--------|:------|
| `chat message` | پیام | به اتاق |
| `system message` | `{ text, room }` | ورود / خروج |
| `online users` | User[] | |
| `typing` | `{ username, isTyping }` | |
| `room created` | `{ id, name, createdBy }` | Broadcast |
| `room removed` | `{ roomName }` | |
| `room deleted` | `{ roomName }` | اعضای اتاق |
| `room users` | User[] | |
| `message deleted` | `{ messageId, deleteForEveryone }` | |
| `message edited` | پیام | |
| `new notification` | نوتیف | مستقیم به گیرنده |
| `notifications updated` | `{ count }` | |
| `webrtc-*` | سیگنال‌ها | Offer، Answer، ICE، Hangup، Stream، Screen |

### 🔐 احراز هویت

1. `POST /auth/login` → بررسی با `bcrypt.compare` → امضای JWT هفت‌روزه `{ id, username }`.
2. توکن در کوکی `httpOnly` **و** در بدنه پاسخ برگردانده می‌شود.
3. فرانت‌اند با `setSocketToken(token)` توکن را در handshake سوکت می‌فرستد.
4. در بارگذاری مجدد، `GET /auth/me` نشست را از کوکی بازیابی می‌کند.

### ☁️ آپلود فایل با S3

```text
Client ──POST /upload/presign──▶ Server
                                  ├─ key = uploads/<uuid>.<ext>
                                  ├─ PutObjectCommand
                                  └─ getSignedUrl (۱۰ دقیقه)
        ◀── { uploadUrl, publicUrl, key }
Client ──PUT file──▶ uploadUrl (S3)
Client ──emit('chat message', { type:'file', fileUrl, ... })
```

امنیت به CORS و policy باکت بستگی دارد. کلیدها در `.env` می‌مانند.

### 🔔 سیستم نوتیفیکیشن

- پس از ارسال پیام در اتاقی که سند `Room` دارد، برای هر عضو **حاضر نبودن در اتاق** یک `Notification` ساخته می‌شود.
- حضور از طریق سوکت‌های join شده به اتاق و `UsersStore` تشخیص داده می‌شود.
- فرستنده هرگز نوتیف خودش را دریافت نمی‌کند.
- گیرنده آنلاین، `new notification` را **مستقیم** در اتاق شخصی سوکت خود می‌گیرد.
- `markAllAsRead` هنگام ورود به اتاق یا باز کردن dropdown فراخوانی می‌شود.

### 📞 سیگنالینگ WebRTC

سرور فقط یک **relay خالص** است — هیچ مدیایی از آن عبور نمی‌کند.

| رویداد | جهت | هدف |
|:-------|:----|:----|
| `webrtc-offer` | → مقصد | SDP offer (+ `renegotiate`) |
| `webrtc-answer` | → مقصد | SDP answer |
| `webrtc-ice-candidate` | → مقصد | کاندید ICE |
| `webrtc-hangup` | → مقصد | پایان تماس |
| `webrtc-stream-updated` | → مقصد | تغییر ترک |
| `webrtc-screen-lock` / `unlock` | → مقصد | شروع / پایان اشتراک صفحه |

مقصد با `users.findByUserId(targetUserId)` پیدا می‌شود — تماس فقط با کاربر **آنلاین** ممکن است.

---

## 🎨 فرانت‌اند

### 🧭 مسیریابی و احراز هویت

`App.jsx` در بارگذاری `GET /auth/me` را صدا می‌زند. تا پایان بررسی، صفحه لودینگ با تم هالووین نمایش داده می‌شود.

| مسیر | دسترسی | صفحه |
|:-----|:-------|:-----|
| `/login` | مهمان | ورود |
| `/register` | مهمان | ثبت‌نام |
| `/chat` | احراز شده | چت اصلی |
| `/profile` | احراز شده | پروفایل خود |
| `/profile/:username` | احراز شده | پروفایل عمومی |
| `/` | — | redirect هوشمند |

خروج = `POST /auth/logout` + `chat.logout()`.

### 🧠 مدیریت وضعیت و هوک‌ها

<table>
<tr><th width="22%">هوک</th><th>مسئولیت</th></tr>
<tr>
<td><code>useChat.js</code></td>
<td>

نگه‌داری `messages`، `onlineUsers`، `typingUsers`، `rooms`، `currentRoom`، `notifications`، `unreadCount`، `dmPartnerName`، `connected`، `error`.
<br>ارائه `connectSocket`، `disconnectSocket`/`logout`، `sendMessage`، `setTyping`، `deleteMessage`، `editMessage`، `createRoom`، `searchRooms`، `switchRoom`، `leaveRoom`، `deleteRoom`، `openDM`، `fetchNotifications`، `markNotificationsAsRead`.
<br>ثبت و پاک‌سازی همه listenerهای سوکت.

</td>
</tr>
<tr>
<td><code>useWebRTC.js</code></td>
<td>

موتور تماس: `RTCPeerConnection`، استریم‌های محلی/ریموت، mute/deafen، تغییر ویدیو، اشتراک صفحه، **Perfect Negotiation**، مدیریت Glare، فیلتر ترک و بافر ICE.

</td>
</tr>
<tr>
<td><code>useSocket.js</code></td>
<td>هوک سبک برای وضعیت اتصال.</td>
</tr>
</table>

### 🧱 کامپوننت‌ها

| کامپوننت | نقش |
|:---------|:----|
| `Login` / `Register` | فرم‌های احراز هویت (react-hook-form + yup) |
| `Chat` | چیدمان، سایدبار واکنش‌گرا، اتصال `useChat` |
| `ChatHeader` | اتصال، نوتیف، تماس، پروفایل، خروج |
| `RoomList` | اتاق‌ها، ساخت/حذف/ترک، جستجو، لیست آنلاین، DM |
| `MessageList` | پیام‌های اسکرول‌شونده |
| `MessageBubble` | حباب پیام، منوی context، فایل، ویرایش/حذف |
| `ChatInput` | متن، فایل، ایموجی، تایپ |
| `EmojiPickerPanel` | انتخابگر ایموجی |
| `TypingIndicator` | «... در حال تایپ» |
| `OnlineUsersList` | کاربران آنلاین → DM / تماس |
| `NotificationDropdown` | نوتیف‌های خوانده‌نشده |
| `CallModal` | رابط کامل تماس |
| `WelcomeScreen` | صفحه خالی / خوش‌آمدگویی |
| `Avatar` | آواتار تولیدشده |
| `ThemeToggle` | تغییر تم |
| `HalloweenBackground` | پس‌زمینه تزئینی |
| `InstallButton` | نصب PWA |
| `LoadingSpinner` | لودر |
| `ToastProvider` | کانتینر sileo |
| `Profile` | بنر، آمار، کلید شناسه |

### 🎨 استایل و تم

- **Tailwind CSS 4** از طریق `@tailwindcss/vite`.
- یوتیلیتی‌های سفارشی: `glass-morphism-strong`، `btn-primary`، `bg-aurora`، `animate-blob`، `slide-in-left`.
- فونت **وزیر** به‌صورت لوکال در `src/fonts` قرار دارد.
- `dir="rtl"` و `lang="fa"` در کل پروژه.

### 📲 PWA

تنظیم‌شده در `vite.config.js`:

- `registerType: 'autoUpdate'`
- Manifest: **BMS Real-time Chat** / **BMS Chat**، تم `#6366f1`، پس‌زمینه `#0f172a`، آیکون‌های ۱۹۲ و ۵۱۲ (maskable)
- Service Worker فقط در **build / preview** فعال است (`devOptions.enabled: false`)

---

## 🔄 جریان‌های اصلی

### ۱️⃣ ورود و اتصال

```text
Login ──POST /auth/login──▶ (Set-Cookie token, JSON {user, token})
   ├─ setAuthUser(user)
   ├─ setSocketToken(token)
   └─ navigate('/chat') ─▶ connectSocket()
        └─ socket.connect()
             ├─ handshake auth
             └─ emit('join') → { user, rooms, history:[], currentRoom:null }
```

### ۲️⃣ ورود به اتاق

```text
switchRoom(name) ──emit('join room')──▶
   server: بررسی عضویت → socket.join(name)
           markAllAsRead(userId, name)
           بارگذاری ۱۰۰ پیام آخر
   ◀── { success, room, history }
   socket.to(room).emit('system message', '... وارد شد')
   io.to(room).emit('room users', ...)
```

### ۳️⃣ ارسال پیام

```text
sendMessage({text,...}) ──emit('chat message')──▶
   server: اعتبارسنجی (≤ ۵۰۰) → Message.create
           io.to(room).emit('chat message', message)
           اعضای غایب → Notification + emit('new notification')
   ◀── callback({ success, message })
```

### ۴️⃣ چت خصوصی

```text
openDM(targetUserId) ──emit('open dm')──▶
   آنلاین  → حل از UsersStore
   آفلاین → User.findById
   room = dm_<minId>_<maxId>  (isPrivate: true)
   ترک اتاق قبلی → join به DM → بارگذاری تاریخچه
   ◀── { room, history, targetUser }
```

### ۵️⃣ تماس WebRTC

```text
Caller: getUserMedia → createOffer → emit('webrtc-offer')
Callee: getUserMedia → createAnswer → emit('webrtc-answer')
Both:   onicecandidate → emit('webrtc-ice-candidate')
        ontrack → syncRemoteStream
Change: replaceTrack/addTrack → renegotiate (Perfect Negotiation)
End:    emit('webrtc-hangup')
```

---

## ⚡ شروع به کار

### ✅ پیش‌نیازها

- **Node.js 18+** (ES Modules)
- **MongoDB** (لوکال یا Atlas)
- **ذخیره‌سازی سازگار با S3** (اختیاری برای آپلود)
- مرورگر دارای پشتیبانی **WebRTC**

### 📦 نصب

```bash
# ۱) بک‌اند
cd backend
npm install
# ساخت .env (بخش بعدی)
npm run dev

# ۲) فرانت‌اند (ترمینال دوم)
cd frontend
npm install
npm run dev
```

سپس **http://localhost:5001** را باز کنید 🎉

### ▶️ اجرای هم‌زمان

از داخل `frontend/`:

```bash
npm start        # بک‌اند (nodemon) + فرانت (vite)
npm run devi     # build + preview + بک‌اند (PWA فعال)
```

---

## 🔐 متغیرهای محیطی

فایل `backend/.env` را بسازید:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>

# سرور
PORT=3000

# JWT
JWT_SECRET=<یک-رشته-تصادفی-طولانی-و-امن>

# Object Storage (S3-compatible)
S3_BUCKET_NAME=<bucket-name>
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_ENDPOINT=https://<s3-endpoint>
S3_REGION=<region>
```

| متغیر | اجباری | توضیح |
|:------|:------:|:------|
| `MONGODB_URI` | ✅ | رشته اتصال MongoDB |
| `PORT` | — | پیش‌فرض `3000` |
| `JWT_SECRET` | ✅ | کلید امضای توکن |
| `S3_BUCKET_NAME` | 📎 | نام باکت |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | 📎 | کلیدهای دسترسی |
| `S3_ENDPOINT` | 📎 | آدرس سرویس S3 |
| `S3_REGION` | 📎 | ریجن (`default` برای سرویس‌های سفارشی) |

> 🔒 هرگز اعتبارنامه واقعی را commit نکنید. هر کلیدی که افشا شده را فوراً rotate کنید.

---

## 📜 اسکریپت‌ها

<table>
<tr><th width="50%">بک‌اند</th><th width="50%">فرانت‌اند</th></tr>
<tr>
<td>

| دستور | کار |
|:------|:----|
| `npm run dev` | nodemon |
| `npm start` | اجرای معمولی |
| `npm test` | پیاده‌سازی نشده |

</td>
<td>

| دستور | کار |
|:------|:----|
| `npm run dev` | Vite :5001 |
| `npm run build` | `dist/` |
| `npm run preview` | Vite :5000 |
| `npm run lint` | ESLint |
| `npm run backend` | بک‌اند از داخل فرانت |
| `npm start` | بک‌اند + فرانت |
| `npm run devi` | build + preview + بک‌اند |

</td>
</tr>
</table>

---

## 🌐 پورت‌ها و Proxy

| سرویس | پورت |
|:------|:----:|
| بک‌اند (Express + Socket.IO) | `3000` |
| فرانت‌اند (Vite dev) | `5001` |
| فرانت‌اند (Vite preview) | `5000` |

`vite.config.js` مسیرهای `/auth`، `/upload` و `/api` را به `http://localhost:3000` پروکسی می‌کند. سوکت **مستقیماً** به `http://localhost:3000` وصل می‌شود.

> ⚠️ originهای CORS در Express و Socket.IO روی `http://localhost:5001` **هاردکد** شده‌اند.

---

## ☁️ استقرار

1. `cd frontend && npm run build` → `frontend/dist`
2. بک‌اند `dist` را استاتیک با SPA fallback سرو می‌کند.
3. اجرا با `npm start`.
4. `NODE_ENV=production` را ست کنید (کوکی‌های secure، `sameSite='none'`).
5. originهای CORS را به دامنه تولید تغییر دهید.
6. **از HTTPS استفاده کنید** — برای WebRTC و کوکی‌های secure ضروری است.
7. برای مقیاس‌پذیری: **Socket.IO Redis Adapter** + کاربران آنلاین در Redis.

---

## 🛡️ نکات امنیتی و محدودیت‌های شناخته‌شده

تصویر صادقانه از وضعیت فعلی کد:

- 🔑 **کلیدها در `.env`.** `.gitignore` فایل‌های `.env*` را پوشش می‌دهد؛ اگر قبلاً commit شده‌اند، تاریخچه را پاک و **rotate** کنید.
- 🌍 **CORS هاردکد** روی `http://localhost:5001` (REST + Socket.IO).
- 🧠 **`UsersStore` در حافظه** → با ری‌استارت و در چند instance از کار می‌افتد.
- 🚦 **بدون Rate Limiting** یا اعتبارسنجی جامع (فقط بررسی‌های پایه).
- 🗂️ **`routes/rooms.js` غیرفعال** — اتاق‌ها فقط socket-based هستند.
- 🧟 **`socket/call.js`** پکیج `@nhanaka/call` را ایمپورت می‌کند که در `package.json` نیست و استفاده نمی‌شود → کد مرده/آزمایشی.
- 👤 **`Profile.jsx`** به `profile.bio` و `/settings` ارجاع می‌دهد، اما مدل `User` فیلد `bio` ندارد و `/settings` تعریف نشده → بخش «درباره من» خالی می‌ماند.
- 🧪 **بدون تست خودکار** (`test` placeholder است).
- 🚪 **`join room` برای اتاق‌های عمومی** صرفاً کاربر را به `members` اضافه می‌کند.
- 🧨 **حذف اتاق** تمام پیام‌های آن را نیز حذف می‌کند.
- 🍪 **`GET /auth/me` توکن را در بدنه برمی‌گرداند** تا سوکت بتواند استفاده کند؛ طراحی فقط `httpOnly` سخت‌گیرانه‌تر بود.

---

## 🗺️ مسیر توسعه آینده

- 🧪 تست — Vitest / Jest + Supertest + تست سوکت
- 🧱 **Redis Adapter** + کاربران آنلاین در Redis
- 🚦 Rate limiting + **Zod / Joi**
- 🔁 Refresh Token و چرخش
- 👥 **تماس گروهی (SFU)** به‌جای ۱:۱
- ❄️ **TURN Server** برای NATهای سخت
- 🔔 **Push Notification** واقعی
- 🧵 Threads، Reaction، Pin
- 🔎 جستجوی پیام در اتاق
- 👤 `bio` / آواتار سفارشی + صفحه تنظیمات
- ♾️ Infinite Scroll برای تاریخچه
- 🌍 i18n / چندزبانه

---

<div align="center">

### ⭐ اگر این پروژه به شما کمک کرد، یک ستاره بدهید!

**ساخته‌شده با ❤️ با Node.js، Socket.IO و React**

[⬆ بازگشت به بالا](#-bms-real-time-chat) · [🇬🇧 Read in English](./readme.md)

</div>
