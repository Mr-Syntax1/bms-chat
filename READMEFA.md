# BMS Real-time Chat

> یک اپلیکیشن چت بلادرنگ (Real-time) کاملاً فارسی و راست‌به‌چپ، ساخته‌شده با **Node.js + Express + Socket.IO + MongoDB** در بک‌اند و **React 19 + Vite + Tailwind CSS 4** در فرانت‌اند، که علاوه بر پیام‌رسانی متنی از **چت خصوصی (DM)**، **آپلود فایل روی S3**، **نوتیفیکیشن خوانده‌نشده**، **تماس صوتی/تصویری WebRTC**، **اشتراک‌گذاری صفحه** و **قابلیت نصب به‌عنوان PWA** پشتیبانی می‌کند.

---

## فهرست مطالب

- [نمای کلی](#نمای-کلی)
- [ویژگی‌ها](#ویژگیها)
- [پشته فناوری](#پشته-فناوری)
- [معماری کلی](#معماری-کلی)
- [ساختار پروژه](#ساختار-پروژه)
- [بک‌اند (Backend)](#بکاند-backend)
  - [نقطه ورود و راه‌اندازی](#نقطه-ورود-و-راهاندازی)
  - [پیکربندی](#پیکربندی)
  - [مدل‌های داده](#مدلهای-داده)
  - [REST API](#rest-api)
  - [لایه Socket.IO](#لایه-socketio)
  - [رویدادهای Socket](#رویدادهای-socket)
  - [احراز هویت](#احراز-هویت)
  - [آپلود فایل با S3](#آپلود-فایل-با-s3)
  - [سیستم نوتیفیکیشن](#سیستم-نوتیفیکیشن)
  - [سیگنالینگ WebRTC](#سیگنالینگ-webrtc)
- [فرانت‌اند (Frontend)](#فرانتاند-frontend)
  - [مسیریابی و احراز هویت](#مسیریابی-و-احراز-هویت)
  - [مدیریت وضعیت و هوک‌ها](#مدیریت-وضعیت-و-هوکها)
  - [کامپوننت‌ها](#کامپوننتها)
  - [استایل و تم](#استایل-و-تم)
  - [PWA](#pwa)
- [جریان‌های اصلی](#جریانهای-اصلی)
- [شروع به کار](#شروع-به-کار)
- [متغیرهای محیطی](#متغیرهای-محیطی)
- [اسکریپت‌ها](#اسکریپتها)
- [پورت‌ها و Proxy](#پورتها-و-proxy)
- [استقرار (Deployment)](#استقرار-deployment)
- [نکات امنیتی و محدودیت‌های شناخته‌شده](#نکات-امنیتی-و-محدودیتهای-شناختهشده)
- [ایده‌های توسعه آینده](#ایدههای-توسعه-آینده)

---

## نمای کلی

این پروژه یک **سیستم چت بلادرنگ اختصاصی** است که با هدف یادگیری و پیاده‌سازی عملی Socket.IO شروع شده و به یک اپلیکیشن کامل با قابلیت‌های زیر رسیده است:

- احراز هویت با **JWT** (کوکی `httpOnly` + احراز هویت سوکت)
- اتاق‌های عمومی و گروهی + **چت خصوصی دو‌نفره (DM)**
- پیام‌های متنی، **فایل** و **سیستمی**
- ویرایش و حذف پیام (برای خودم / برای همه)
- **نشانگر در حال تایپ** و **لیست کاربران آنلاین**
- **نوتیفیکیشن** پیام‌های خوانده‌نشده به‌ازای هر اتاق
- تماس **صوتی و تصویری ۱:۱** با WebRTC + **اشتراک صفحه با کیفیت بالا**
- **PWA** قابل نصب روی موبایل و دسکتاپ
- رابط کاربری مدرن، **فارسی، RTL**، با فونت وزیر، افکت‌های شیشه‌ای و پس‌زمینه هالووین

---

## ویژگی‌ها

### پیام‌رسانی
- ارسال/دریافت پیام بلادرنگ در اتاق‌ها
- بارگذاری تاریخچه پیام‌ها (تا ۱۰۰ پیام اخیر هنگام ورود به اتاق، صفحه‌بندی با `before` و `limit`)
- پیام‌های نوع `message` / `file` / `system`
- ویرایش پیام فقط توسط فرستنده
- حذف پیام: «حذف برای من» یا «حذف برای همه» (فقط فرستنده)
- نمایش زمان به صورت فارسی (`fa-IR`)
- ذخیره‌سازی همه پیام‌ها در MongoDB

### اتاق‌ها
- ساخت اتاق (۲ تا ۳۰ کاراکتر، نام یکتا)
- پیوستن / ترک اتاق
- حذف اتاق فقط توسط سازنده (همراه با حذف تمام پیام‌های آن)
- جستجوی اتاق‌های عمومی و کاربران (بر اساس یوزرنیم یا شناسه)
- اتاق‌های خصوصی برای DM با نام‌گذاری قطعی `dm_<idSmall>_<idLarge>`

### چت خصوصی (DM)
- باز کردن DM با کاربر آنلاین (از طریق socket id) یا آفلاین (از طریق شناسه دیتابیس)
- ساخت خودکار اتاق خصوصی در صورت نبود
- جلوگیری از چت با خود
- نمایش وضعیت آنلاین/آفلاین طرف مقابل

### تماس (WebRTC)
- تماس صوتی و تصویری ۱:۱
- کیفیت هدف 1080p / 30fps و تنظیم `maxBitrate` تا ۸ مگابیت
- **اشتراک صفحه** و جایگزینی هوشمند ترک ویدیو (`replaceTrack`)
- قطع/وصل میکروفون (Mute) و ناشنوا شدن (Deafen)
- **Perfect Negotiation** و glare handling برای تغییر ترک وسط تماس
- مدیریت کاندیدهای ICE و renegotiation معلق (`pendingRenegotiation`)

### تجربه کاربری
- طراحی Glassmorphism و گرادیان‌های متحرک
- حالت **Dark/Light** و پس‌زمینه هالووین
- کامپوننت‌های مستقل و قابل استفاده مجدد
- نصب به‌صورت PWA با Service Worker (فقط در حالت build/preview)
- نوتیفیکیشن‌های Toast با کتابخانه `sileo`

---

## پشته فناوری

| لایه | فناوری |
|------|---------|
| Runtime | Node.js (ES Modules) |
| بک‌اند | Express 4، Socket.IO 4 |
| دیتابیس | MongoDB + Mongoose 9 |
| احراز هویت | JWT (`jsonwebtoken`) + `bcryptjs` + `cookie-parser` |
| ذخیره فایل | AWS SDK v3 برای S3 (سازگار با ارائه‌دهنده ایرانی) |
| فرانت‌اند | React 19، Vite 8، React Router 7 |
| استایل | Tailwind CSS 4 + CSS سفارشی، فونت Vazir |
| فرم / اعتبارسنجی | react-hook-form + yup |
| چت بلادرنگ | socket.io-client |
| PWA | vite-plugin-pwa |
| اعلان‌ها | sileo |
| ابزار توسعه | nodemon، ESLint، concurrently |

---

## معماری کلی

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
│      ├─ Auth middleware (JWT از cookie یا auth.token)          │
│      ├─ handlers: users, chat, rooms, direct, typing,          │
│      │            notification, webrtc                         │
│      └─ UsersStore (Map ساده در حافظه برای آنلاین‌ها)          │
│                                                                 │
│  Mongoose ──▶ MongoDB   (User, Room, Message, Notification)    │
│  AWS SDK   ──▶ Object Storage (S3 compatible, presigned URLs)  │
└──────────────────────────────────────────────────────────────┘
```

> **نکته:** تمام منطق اتاق‌ها از طریق **Socket.IO events** انجام می‌شود و فایل `routes/rooms.js` صرفاً نسخه‌ی اولیه‌ی کامنت‌شده و غیرفعال است.

---

## ساختار پروژه

```
learning SOCKET.IO/
├── README.md                    ← همین فایل (سطح ریشه)
├── backend/
│   ├── .env                     ← متغیرهای محیطی (نباید در Git باشد)
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
│       │   ├── auth.js          ← register/login/logout/me/profile
│       │   ├── upload.js        ← presign آپلود S3
│       │   └── rooms.js         ← نسخه قدیمی، کامنت‌شده
│       ├── socket/
│       │   ├── index.js         ← initSocket + ثبت همه رویدادها
│       │   ├── call.js          ← اسکلت استفاده از @nhanaka/call (غیرفعال)
│       │   └── handlers/
│       │       ├── users.js     ← join و ساخت لیست اتاق‌ها
│       │       ├── chat.js      ← پیام، حذف، ویرایش، تاریخچه، نوتیف
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
        ├── socket.js            ← نمونه singleton سوکت
        ├── index.css            ← Tailwind + استایل‌های سفارشی
        ├── assets/
        ├── fonts/               ← Vazir (Light/Medium)
        ├── hooks/
        │   ├── useChat.js       ← هسته منطق چت و اتاق‌ها
        │   ├── useSocket.js
        │   └── useWebRTC.js     ← کل منطق تماس و اشتراک صفحه
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
            ├── CallModal.jsx            ← UI تماس
            ├── Avatar.jsx / ContextMenu.jsx
            ├── EmojiPickerPanel.jsx
            ├── ThemeToggle.jsx
            ├── HalloweenBackground.jsx
            ├── InstallButton.jsx        ← نصب PWA
            └── LoadingSpinner.jsx
```

---

## بک‌اند (Backend)

### نقطه ورود و راه‌اندازی

فایل `src/server.js`:

1. یک اپ **Express** و یک **HTTP Server** (با `node:http`) می‌سازد.
2. `express.json()`، `cookieParser()` و **CORS** (origin: `http://localhost:5001` با `credentials: true`) را فعال می‌کند.
3. روت‌های `/auth` و `/upload` را mount می‌کند (روت `/api/rooms` کامنت شده است).
4. پوشه `frontend/dist` را به‌صورت استاتیک سرو می‌کند و برای SPA یک **fallback** به `index.html` دارد (به‌جز مسیرهای API).
5. در `start()` ابتدا به MongoDB وصل می‌شود، سپس Socket.IO را راه‌اندازی می‌کند و روی `PORT` (پیش‌فرض ۳۰۰۰) گوش می‌دهد.

### پیکربندی

- **`config/db.js`**: اتصال به MongoDB از طریق `MONGODB_URI`؛ در صورت خطا `process.exit(1)`.
- **`config/s3.js`**: ساخت `S3Client` با `region`، `endpoint`، credentials و `forcePathStyle: true` (برای سرویس‌های S3 سازگار ضروری است).
- **`utils/users.js`**: کلاس `UsersStore` که نگاشت `socket.id → { id, userId, username }` را در یک `Map` نگه می‌دارد. **در حافظه است** و با ری‌استارت سرور پاک می‌شود.

> ⚠️ نگه‌داشتن لیست آنلاین‌ها در حافظه یعنی راه‌اندازی چند instance بدون **Adapter** (مثلاً Redis) باعث ناسازگاری می‌شود؛ این پروژه برای اجرای تک‌نمونه طراحی شده است.

### مدل‌های داده

#### User
| فیلد | نوع | توضیح |
|------|-----|-------|
| `username` | String | یکتا، trim، حداکثر ۳۰ |
| `password` | String | هش‌شده با bcrypt |
| `createdAt` | Date | |

#### Room
| فیلد | نوع | توضیح |
|------|-----|-------|
| `name` | String | یکتا در عمل، حداکثر ۱۰۰ |
| `createdBy` | ObjectId → User | سازنده |
| `members` | [ObjectId → User] | اعضا |
| `isPrivate` | Boolean | برای DM |
| `createdAt` | Date | |

ایندکس‌ها: `name` (text)، `members`، `isPrivate`

#### Message
| فیلد | نوع | توضیح |
|------|-----|-------|
| `text` | String | حداکثر ۵۰۰ |
| `sender` | String | نام کاربری |
| `senderId` | ObjectId → User | |
| `type` | `message` \| `system` \| `file` | |
| `fileUrl` / `fileName` / `fileType` / `fileSize` | | برای پیام‌های فایل |
| `room` | String | نام اتاق (index دارد) |
| `deletedFor` | [ObjectId] | کاربرانی که پیام را «برای خودم» حذف کرده‌اند |
| `isDeletedForEveryone` | Boolean | |
| `createdAt` | Date | |

ایندکس‌ها: `createdAt`، `(room, createdAt)`

#### Notification
| فیلد | نوع | توضیح |
|------|-----|-------|
| `userId` | ObjectId → User | گیرنده |
| `senderId` | ObjectId → User | فرستنده |
| `senderName` | String | |
| `roomName` | String | |
| `messagePreview` | String | حداکثر ۱۵۰ |
| `isRead` | Boolean | پیش‌فرض false |
| `createdAt` | Date | |

متد استاتیک `markAllAsRead(userId, roomName?)` نیز دارد.

### REST API

همه مسیرها زیر `/auth` و `/upload` هستند (بدون پیشوند `/api`).

| متد | مسیر | توضیح | احراز هویت |
|-----|------|-------|-----------|
| POST | `/auth/register` | ثبت‌نام؛ کوکی `token` ست می‌کند | — |
| POST | `/auth/login` | ورود؛ کوکی `token` ست می‌کند | — |
| POST | `/auth/logout` | پاک کردن کوکی | — |
| GET | `/auth/me` | بازگرداندن کاربر جاری + توکن (برای persistence) | کوکی |
| GET | `/auth/profile` | پروفایل کاربر جاری + تعداد پیام‌ها | ✅ |
| GET | `/auth/profile/:username` | پروفایل عمومی کاربر + تعداد پیام‌ها | — |
| GET | `/auth/call-token` | برگرداندن توکن برای تماس | ✅ |
| POST | `/upload/presign` | ساخت URL امضاشده برای آپلود | — |

پاسخ‌ها در قالب `{ ... }` یا `{ error }` برمی‌گردند. پیام‌های خطا فارسی هستند.

> **کوکی احراز هویت:** `httpOnly: true`، در production `secure` و `sameSite: 'none'`، در توسعه `lax`، با `maxAge` هفت روز و `path: '/'`.

### لایه Socket.IO

- `initSocket(server)` نمونه `Server` را با CORS مشابه REST می‌سازد.
- یک **middleware احراز هویت** توکن را از `socket.handshake.auth.token` یا هدر کوکی `token` می‌خواند و در صورت معتبر بودن `socket.userId` و `socket.username` را ست می‌کند. بدون توکن، اتصال رد می‌شود.
- پس از اتصال، هر سوکت به اتاق شخصی خودش (`socket.id`) join می‌شود تا بتوان مستقیم به آن push کرد.
- تمام هندلرها به شکل **factory function** نوشته شده‌اند: `handleX(socket, io, users) → (payload, callback) => {}` که ثبت آن‌ها را در `socket/index.js` تمیز می‌کند.
- در `disconnect`، کاربر از `UsersStore` حذف و `online users` مجدداً emit می‌شود.

### رویدادهای Socket

#### کلاینت → سرور (با callback)

| رویداد | Payload | توضیح |
|--------|---------|-------|
| `join` | `{}` | ثبت کاربر در UsersStore و دریافت لیست اتاق‌ها |
| `chat message` | `{ text, type, fileUrl, fileName, fileType, fileSize }` | ارسال پیام |
| `get messages` | `{ room, before?, limit? }` | تاریخچه صفحه‌بندی‌شده |
| `edit message` | `{ messageId, newText }` | ویرایش توسط فرستنده |
| `delete message` | `{ messageId, deleteForEveryone }` | حذف |
| `typing` | `boolean` | وضعیت تایپ |
| `list rooms` | — | دریافت اتاق‌های کاربر |
| `search rooms` | `{ query }` یا `string` | جستجوی اتاق/کاربر |
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
|--------|---------|-------|
| `chat message` | آبجکت پیام | در اتاق emit می‌شود |
| `system message` | `{ text, room }` | ورود/خروج اعضا |
| `online users` | آرایه کاربران | |
| `typing` | `{ username, isTyping }` | |
| `room created` | `{ id, name, createdBy }` | به همه |
| `room removed` | `{ roomName }` | |
| `room deleted` | `{ roomName }` | برای اعضای اتاق |
| `room users` | آرایه کاربران اتاق | |
| `message deleted` | `{ messageId, deleteForEveryone }` | |
| `message edited` | آبجکت پیام | |
| `new notification` | آبجکت نوتیف | مستقیم به اتاق شخصی گیرنده |
| `notifications updated` | `{ count }` | |
| `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` | سیگنال‌ها | |
| `webrtc-hangup` / `webrtc-stream-updated` / `webrtc-screen-lock` / `webrtc-screen-unlock` | | |

### احراز هویت

1. کاربر با `POST /auth/login` وارد می‌شود؛ سرور با `bcrypt.compare` رمز را بررسی و با `signToken` یک JWT هفت‌روزه (`{ id, username }`) می‌سازد.
2. توکن در کوکی `httpOnly` ست می‌شود و همزمان در بدنه پاسخ برگردانده می‌شود.
3. فرانت‌اند توکن را با `setSocketToken(token)` در `socket.auth` قرار می‌دهد تا در handshake ارسال شود.
4. هنگام بارگذاری مجدد، `GET /auth/me` با کوکی، کاربر را بازیابی می‌کند (persistence login).

### آپلود فایل با S3

جریان **Presigned URL**:

1. کلاینت `POST /upload/presign` با `{ fileName, fileType }` می‌فرستد.
2. سرور کلید یکتا می‌سازد: `uploads/<uuid>.<ext>`.
3. یک `PutObjectCommand` می‌سازد و با `getSignedUrl` لینک آپلود ۱۰ دقیقه‌ای تولید می‌کند.
4. `uploadUrl` (برای PUT مستقیم) و `publicUrl` (`S3_ENDPOINT/BUCKET/key`) برمی‌گردد.
5. کلاینت فایل را با **PUT** به `uploadUrl` می‌فرستد و سپس پیام نوع `file` با `fileUrl` ارسال می‌کند.

> امنیت این flow به تنظیمات CORS و policy باکت S3 وابسته است؛ کلیدهای S3 در `.env` نگهداری می‌شوند.

### سیستم نوتیفیکیشن

- پس از ارسال پیام در یک اتاق دارای سند `Room`، برای هر عضو **غایب از اتاق** یک `Notification` ساخته می‌شود.
- «حاضر در اتاق» از طریق سوکت‌های join شده به اتاق و نگاشت `UsersStore` تشخیص داده می‌شود.
- به فرستنده نوتیف ارسال نمی‌شود.
- اگر گیرنده آنلاین باشد، رویداد `new notification` مستقیم به اتاق شخصی او (`targetUser.id`) emit می‌شود.
- هنگام ورود به اتاق یا کلیک روی اعلان‌ها، `markAllAsRead` (اختیاری محدود به `roomName`) صدا زده می‌شود.

### سیگنالینگ WebRTC

سرور فقط **relay** است و هیچ مدیایی عبور نمی‌دهد:

- `webrtc-offer` → برای کاربر مقصد (به همراه `renegotiate`)
- `webrtc-answer`، `webrtc-ice-candidate` → relay دوطرفه
- `webrtc-hangup` → پایان تماس
- `webrtc-stream-updated` → اطلاع تغییر ترک (تا کلاینت دوباره sync کند)
- `webrtc-screen-lock/unlock` → اطلاع شروع/پایان اشتراک صفحه

مقصد با `users.findByUserId(targetUserId)` پیدا می‌شود (یعنی تماس فقط با کاربر **آنلاین** ممکن است).

---

## فرانت‌اند (Frontend)

### مسیریابی و احراز هویت

`App.jsx` در ابتدا `GET /auth/me` می‌زند:

- اگر کاربر برگشت، `authUser` ست و سوکت توکن‌دار می‌شود.
- تا پایان بررسی، یک صفحه لودینگ با پس‌زمینه هالووین نمایش داده می‌شود.

مسیرها:

| مسیر | دسترسی | محتوا |
|------|--------|-------|
| `/login` | مهمان | ورود |
| `/register` | مهمان | ثبت‌نام |
| `/chat` | کاربر واردشده | صفحه اصلی چت |
| `/profile` | کاربر واردشده | پروفایل خود |
| `/profile/:username` | کاربر واردشده | پروفایل دیگران |
| `/` | — | redirect هوشمند |

خروج با `POST /auth/logout` + `chat.logout()` (قطع سوکت و پاک‌سازی state).

### مدیریت وضعیت و هوک‌ها

#### `useChat.js` — هسته منطق چت

این هوک تمام state چت را نگه می‌دارد:

- `messages`, `onlineUsers`, `typingUsers`, `rooms`, `currentRoom`
- `notifications`, `unreadCount`, `showNotifications`, `dmPartnerName`
- `connected`, `error`

و توابع زیر را export می‌کند:

- چرخه اتصال: `connectSocket`, `disconnectSocket` / `logout`
- پیام: `sendMessage`, `setTyping`, `deleteMessage`, `editMessage`
- اتاق: `createRoom`, `searchRooms`, `switchRoom`, `leaveRoom`, `deleteRoom`, `refreshRooms`
- DM: `openDM`
- اعلان: `fetchNotifications`, `markNotificationsAsRead`

این هوک تمام listenerهای سوکت (پیام، سیستم، آنلاین‌ها، تایپ، اتاق، حذف/ویرایش، نوتیف) را ثبت و در cleanup حذف می‌کند تا از نشتی جلوگیری شود.

#### `useWebRTC.js` — موتور تماس

بزرگ‌ترین و پیچیده‌ترین بخش فرانت‌اند. مسئول:

- ساخت `RTCPeerConnection` با STUN گوگل
- مدیریت `localStream` / `remoteStream` / `remoteStreamVersion`
- کنترل‌های `toggleMute`, `toggleDeafen`, `toggleVideo`, `toggleScreenShare`
- **Perfect Negotiation** برای جلوگیری از تعارض offer (glare): طرف «polite» با `rollback` و تخصیص دوباره، طرف «impolite» نادیده می‌گیرد.
- فیلتر هوشمند ترک‌های ریموت (ترک‌های `ended` حذف، `muted` موقت حفظ می‌شوند)
- تنظیم بیتری و نگهداری candidateهای ICE معلق

#### `useSocket.js`
نسخه سبک برای نمایش وضعیت اتصال (`isConnected`).

### کامپوننت‌ها

| کامپوننت | نقش |
|----------|-----|
| `Login` / `Register` | فرم‌های احراز هویت با react-hook-form + yup |
| `Chat` | چیدمان اصلی، سایدبار واکنش‌گرا، اتصال `useChat` به UI |
| `ChatHeader` | هدر، وضعیت اتصال، دکمه نوتیف، تماس، پروفایل، خروج |
| `RoomList` | لیست اتاق‌ها، ساخت/حذف/ترک، جستجو، لیست آنلاین، DM |
| `MessageList` | لیست پیام‌ها با اسکرول و رندر `MessageBubble` |
| `MessageBubble` | حباب پیام، منوی context، نمایش فایل، ویرایش/حذف |
| `ChatInput` | ورودی چندخطی، ارسال فایل، ایموجی، تایپینگ |
| `EmojiPickerPanel` | انتخابگر ایموجی |
| `TypingIndicator` | «... در حال تایپ» |
| `OnlineUsersList` | کاربران آنلاین و شروع DM/تماس |
| `NotificationDropdown` | اعلان‌های خوانده‌نشده، پرش به اتاق/فرستنده |
| `CallModal` | UI کامل تماس (ویدیو، کنترل‌ها، وضعیت ringing/connected) |
| `WelcomeScreen` | صفحه خوش‌آمدگویی وقتی اتاقی انتخاب نشده |
| `Avatar` | آواتار تولیدشده از نام کاربری/رنگ |
| `ThemeToggle` | تغییر تم |
| `HalloweenBackground` | پس‌زمینه تزئینی |
| `InstallButton` | دکمه نصب PWA |
| `LoadingSpinner` | لودینگ |
| `ToastProvider` | کانتینر toast کتابخانه sileo |
| `Profile` (page) | پروفایل با بنر گرادیانی، آمار پیام، کلید شناسه |

### استایل و تم

- **Tailwind CSS 4** از طریق `@tailwindcss/vite`.
- طراحی با کلاس‌های سفارشی مانند `glass-morphism-strong`, `btn-primary`, `bg-aurora`, `animate-blob`, `slide-in-left` در `index.css`.
- فونت **Vazir** (Light/Medium) به‌صورت لوکال در `src/fonts`.
- جهت کلی `dir="rtl"` و `lang="fa"`.

### PWA

پیکربندی در `vite.config.js` با `vite-plugin-pwa`:

- `registerType: 'autoUpdate'`
- manifest: نام «BMS Real-time Chat»، شورت‌نیم «BMS Chat»، رنگ تم `#6366f1`، پس‌زمینه `#0f172a`، آیکون‌های ۱۹۲ و ۵۱۲ (maskable)
- Service Worker فقط در **build/preview** فعال است (`devOptions.enabled: false`).

---

## جریان‌های اصلی

### ۱) ورود و اتصال
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

### ۲) ورود به اتاق
```
switchRoom(name) ──emit('join room')──▶
    server: بررسی عضویت/حفظ سند Room → socket.join(name)
            markAllAsRead(userId, name)
            بارگذاری ۱۰۰ پیام آخر
    ◀── { success, room, history }
    socket.to(room).emit('system message', '... وارد اتاق شد.')
    io.to(room).emit('room users', ...)
```

### ۳) ارسال پیام
```
sendMessage({text,...}) ──emit('chat message')──▶
    server: اعتبارسنجی (طول ≤ ۵۰۰) → Message.create
            io.to(room).emit('chat message', message)
            برای اعضای غایب → Notification + emit('new notification')
    ◀── callback({ success, message })
```

### ۴) چت خصوصی
```
openDM(targetUserId) ──emit('open dm')──▶
    اگر target آنلاین: از UsersStore (socket id → userId)
    وگرنه: User.findById
    نام اتاق قطعی: dm_<minId>_<maxId>  (Room با isPrivate=true)
    socket ترک اتاق قبلی → join به DM → بارگذاری تاریخچه
    ◀── { room, history, targetUser:{id, username, isOnline} }
```

### ۵) تماس WebRTC
```
Caller: getUserMedia → createOffer → emit('webrtc-offer', {target, offer})
Callee: receive offer → getUserMedia → createAnswer → emit('webrtc-answer')
هر دو: onicecandidate → emit('webrtc-ice-candidate')
      ontrack → syncRemoteStream
تغییر وسط تماس (ویدیو/صفحه): replaceTrack/addTrack
      → در صورت نیاز renegotiate (Perfect Negotiation)
      → emit('webrtc-stream-updated')
پایان: emit('webrtc-hangup')
```

---

## شروع به کار

### پیش‌نیازها
- **Node.js 18+** (پروژه از ES Modules استفاده می‌کند)
- **MongoDB** (یا Atlas)
- دسترسی به یک سرویس **S3 سازگار** برای آپلود فایل (اختیاری برای سایر قابلیت‌ها)
- مرورگری با پشتیبانی WebRTC (Chrome/Edge/Firefox/Safari)

### نصب

```bash
# 1) بک‌اند
cd backend
npm install
# ساخت فایل .env (نمونه در بخش متغیرهای محیطی)
npm run dev

# 2) فرانت‌اند (در ترمینال دوم)
cd frontend
npm install
npm run dev
```

سپس مرورگر را روی `http://localhost:5001` باز کنید.

### اجرای هم‌زمان (اختیاری)

از داخل `frontend`:

```bash
npm start        # بک‌اند (nodemon) + فرانت (vite) با concurrently
```

یا اجرای حالت تولیدی محلی:

```bash
npm run devi     # build + preview (سرو استاتیک) + بک‌اند
```

> در حالت `preview`، PWA و Service Worker نیز فعال می‌شوند.

---

## متغیرهای محیطی

فایل `backend/.env` باید شامل موارد زیر باشد (مقادیر نمونه — هرگز مقادیر واقعی را در Git قرار ندهید):

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
|-------|--------|-------|
| `MONGODB_URI` | ✅ | رشته اتصال MongoDB |
| `PORT` | — | پیش‌فرض ۳۰۰۰ |
| `JWT_SECRET` | ✅ | کلید امضای توکن |
| `S3_BUCKET_NAME` | برای فایل | نام باکت |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | برای فایل | کلیدهای دسترسی |
| `S3_ENDPOINT` | برای فایل | آدرس سرویس S3 |
| `S3_REGION` | برای فایل | ریجن (برای سرویس‌های سفارشی معمولاً `default`) |

---

## اسکریپت‌ها

### بک‌اند (`backend/package.json`)

| دستور | کار |
|-------|-----|
| `npm run dev` | اجرای `src/server.js` با nodemon |
| `npm start` | اجرای معمولی بدون watch |
| `npm test` | (در حال حاضر پیاده‌سازی نشده) |

### فرانت‌اند (`frontend/package.json`)

| دستور | کار |
|-------|-----|
| `npm run dev` | اجرای Vite روی پورت ۵۰۰۱ |
| `npm run build` | بیلد تولیدی در `frontend/dist` |
| `npm run preview` | پیش‌نمایش بیلد روی پورت ۵۰۰۰ |
| `npm run lint` | اجرای ESLint |
| `npm run backend` | اجرای بک‌اند از داخل پوشه فرانت |
| `npm start` | بک‌اند + فرانت هم‌زمان |
| `npm run devi` | build + preview + بک‌اند |

---

## پورت‌ها و Proxy

| سرویس | پورت |
|-------|------|
| بک‌اند (Express + Socket.IO) | `3000` |
| فرانت‌اند (Vite dev) | `5001` |
| فرانت‌اند (Vite preview) | `5000` |

در `vite.config.js` یک **proxy** برای `/auth`, `/upload`, `/api` به `http://localhost:3000` تنظیم شده است؛ بنابراین درخواست‌های REST فرانت بدون مشکل CORS عبور می‌کنند. سوکت مستقیماً به `http://localhost:3000` وصل می‌شود.

> ⚠️ در بک‌اند، origin هر دو `cors` (Express و Socket.IO) روی `http://localhost:5001` **هاردکد** شده است. برای دامنه واقعی باید این مقدار به‌روزرسانی شود.

---

## استقرار (Deployment)

مسیر پیشنهادی (تک‌نمونه):

1. `cd frontend && npm run build` تا خروجی در `frontend/dist` ساخته شود.
2. بک‌اند از مسیر `../../frontend/dist` به‌صورت استاتیک سرو می‌کند و برای SPA fallback دارد.
3. بک‌اند را با `npm start` روی سرور اجرا کنید.
4. متغیر `NODE_ENV=production` را ست کنید تا کوکی‌ها `secure` و `sameSite: 'none'` شوند.
5. originهای CORS را به دامنه تولید تغییر دهید.
6. از **HTTPS** استفاده کنید؛ WebRTC و کوکی‌های secure بدون HTTPS در محیط واقعی خوب کار نمی‌کنند.
7. برای مقیاس‌پذیری بیشتر به **Socket.IO Redis Adapter** و ذخیره‌سازی آنلاین‌ها در Redis نیاز دارید (چون `UsersStore` در حافظه است).

---

## نکات امنیتی و محدودیت‌های شناخته‌شده

این بخش صادقانه وضعیت فعلی پروژه را (بدون تغییر در کد) توصیف می‌کند:

- **کلیدهای حساس در `.env` وجود دارند.** `.gitignore` بک‌اند `.env*` را نادیده می‌گیرد، اما اگر قبلاً commit شده باشند باید از تاریخچه پاک و **چرخش (rotate)** شوند.
- **CORS هاردکد** روی `http://localhost:5001` است (هم REST و هم Socket.IO)؛ قبل از production باید دامنه واقعی تنظیم شود.
- **`UsersStore` در حافظه** است: با ری‌استارت سرور و در حالت چند instance، لیست آنلاین‌ها و تماس‌ها دچار اختلال می‌شوند.
- **بدون Rate Limiting و اعتبارسنجی ورودی جامع** روی REST/Socket (فقط چند بررسی پایه مثل طول پیام و نام اتاق).
- **`routes/rooms.js` غیرفعال** است؛ منطق اتاق فقط socket-based است.
- **`socket/call.js`** از پکیج `@nhanaka/call` ایمپورت می‌کند که در `package.json` نیست و در `server.js` هم استفاده نمی‌شود؛ به عبارتی **کد مرده/آزمایشی** است.
- **`Profile.jsx`** به `profile.bio` و مسیر `/settings` ارجاع می‌دهد، اما مدل `User` فیلد `bio` ندارد و روت `/settings` تعریف نشده است؛ بنابراین بخش «درباره من» عملاً خالی می‌ماند و دکمه ویرایش پروفایل مقصد ندارد.
- **بدون تست خودکار**؛ اسکریپت `test` بک‌اند placeholder است.
- **نبود اعتبارسنجی عضویت در `join room` برای اتاق‌های عمومی:** کاربر با join شدن به `members` اضافه می‌شود (رفتار مورد انتظار فعلی).
- **حذف اتاق** تمام پیام‌های آن را نیز حذف می‌کند.
- **`GET /auth/me` توکن را در بدنه پاسخ برمی‌گرداند** تا سوکت بتواند استفاده کند؛ از منظر امنیتی کوکی `httpOnly` امن‌تر است، اما این پروژه به‌خاطر معماری سوکت این کار را می‌کند.

---

## ایده‌های توسعه آینده

- افزودن **تست** (Jest/Vitest + Supertest + تست socket.io)
- **Redis Adapter** برای Socket.IO و ذخیره آنلاین‌ها برای مقیاس افقی
- **Rate limiting** و **Zod/Joi** برای اعتبارسنجی
- **Refresh Token** و چرخش توکن
- **چت گروهی WebRTC (SFU)** به‌جای ۱:۱
- **TURN Server** برای عبور از NAT سخت
- اعلان‌های **Push** واقعی در PWA
- پشتیبانی از **Thread/Reply**، واکنش (Reaction) و **Pin**
- جستجوی پیام‌های داخل اتاق
- فیلد `bio`/آواتار سفارشی در مدل `User` و صفحه تنظیمات
- صفحه‌بندی نامتناهی پیام‌ها در UI
- بین‌المللی‌سازی (i18n) و پشتیبانی چندزبانه

---

<div align="center">

**BMS Real-time Chat** — ساخته‌شده برای یادگیری و تجربه‌ی ساخت یک چت بلادرنگ کامل با Node.js و Socket.IO

</div>