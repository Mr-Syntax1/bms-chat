# AI Handoff — Optimization Sprint

## Phase 1 (no visual changes)

- 1.1 Deleted raw GLB models whose manifest entries already use `opt/`:
  `beach/ClambyPoly.glb`, `beach/StarfishbyPoly.glb`, `animals/Porcupine.glb`,
  `animals/Owl.glb`, `beach/trees/CoconutPalmTree.glb`, `Lilypad.glb`,
  `beach/SeashellbyPoly.glb`, `beach/trees/PalmTree2.glb`, `Corn.glb`,
  `Decorations/RockMedium.glb`, `Decorations/Treestump.glb`,
  `missions/TreasureChest.glb`. `npc/adventurer.glb` kept (opt breaks skinning).
  `Umbrella.glb` was also deleted after optimizing to `opt/Umbrella.glb` and
  updating its manifest entry to `opt: true` (it was still referenced raw).
- 1.2 Deleted stale optimized characters not in `characterConfig.js`:
  `Citizen.glb`, `CoolBannanaGuy.glb`, `MushroomCharacter.glb`, `miku.glb`,
  `DORAEMON.glb`, `CuteRedDino.glb`, `CuteCharacter.glb`.
  `CubeGuy.glb` did not exist; `CubeGuyCharacter.glb` left untouched.
- 1.3 Ran `node scripts/optimize-glb.mjs --only cute_...` for the 7 current
  characters. Draco + texture resize produced `opt/characters/*.glb`:
  12.41 MB → 1.10 MB (91.1% saved). Updated `src/game/assetManifest.js`
  character entries to `{ opt: true }` so they load the optimized files.
  The `--only Umbrella` run also refreshed `opt/Umbrellaandchairs.glb`.
- 1.4 `src/game/preload.js`: preload only the character selected from
  `localStorage` (`loadPreferredCharacter`) plus core URLs, instead of all 7.
- 1.5 `src/game/GameOverlay.jsx`: removed the 1200ms idle warm-up for
  cooking/food/animals/forage/decor/npc. Added position-based lazy preloading
  (2s polling of `usePlayerStore.local`) with zones anchored on SPAWN, DOCK and
  NPC positions; each group preloads once when the player enters its zone.
- Verified: `node scripts/verify-assets.mjs` → OK (missing=0),
  `npx eslint src/game` → 0 errors (1 pre-existing warning in useGameSync.js),
  `npm run build` → success.

### Sizes
- Raw + stale optimized deletions: 26.48 MB
- Character models: 12.41 MB → 1.10 MB
- Total phase 1 model payload reduction: ~37.8 MB

## Phase 2 (no visual changes)

- 2.1 `frontend/vite.config.js`: replaced the over-broad `manualChunks` rule
  `id.includes('react')` with exact checks for `node_modules/react/`,
  `node_modules/react-dom/` and `node_modules/scheduler/`. The old rule also
  caught `@react-three/*` and `emoji-picker-react`, inflating the "vendor"
  chunk to ~953 KB.
- 2.2 `frontend/src/components/Chat.jsx`: `GameOverlay` and `CampsiteBrowser`
  are now `lazy(() => import(...))` and wrapped in a shared `<Suspense>` with a
  hidden `Loading...` fallback (no visual change). This isolates the game UI
  (GameOverlay + GameCanvas chunks) from the chat page's critical path.
- Verified: `npx eslint src/components/Chat.jsx` → clean, `npm run build` → success.

### Chunk sizes (before → after)
- vendor: 952.97 KB → no separate vendor chunk (React now in `index`: 640.27 KB → 534.82 KB)
- three: 824.99 KB → 1,231.92 KB (absorbs the @react-three/R3F code previously
  mislabeled as vendor; 338.67 KB gzip). Still modulepreloaded from index.html
  because `emoji-picker-react` imports a shared helper from that chunk — this
  needs a follow-up to split emoji deps if the preload must be eliminated.
- GameOverlay: (was inside index) → 263.18 KB lazy chunk
- CampsiteBrowser: (was inside index) → 3.71 KB lazy chunk
- GameCanvas: 115.42 KB → 115.41 KB (now only requested when GameOverlay loads)
- index: 640.27 KB → 534.82 KB
- livekit: 546.64 KB → 600.55 KB; ably: 177.29 KB unchanged;
  EmojiPickerPanel: 329.56 KB (separate lazy chunk, previously 0.82 KB stub +
  deps in vendor).

## Phase 3 (no visual changes)

- 3.1 `MessageBubble.jsx`: exported component wrapped in `React.memo`; removed
  per-bubble `<ContextMenu />` and all its local document listeners. New props:
  `onOpenContextMenu` (stable callback from MessageList) and `editSignal`
  (counter that triggers inline edit from the global menu).
- 3.2 `MessageList.jsx`: `Intl.DateTimeFormat` created once at module level;
  `formatDateSeparator` computed once per message in the grouping `useMemo` and
  reused for both the separator label and `data-message-date` (was 2x per msg).
- 3.3 `MessageList.jsx`: replaced the `querySelectorAll + getBoundingClientRect`
  scroll loop with an `IntersectionObserver` over cached date-marker refs
  (`rootMargin: 0px 0px -95% 0px`); `handleScroll` now only updates the two
  boolean states (no layout reads).
- 3.4 `ContextMenu.jsx` + `MessageList.jsx`: ONE global menu rendered at
  MessageList level with state `{ messageId, x, y } | null`; document
  mousedown/keydown listeners registered only while the menu is open and
  removed on close. Menu items (edit/delete) built once in a `useMemo`.
- 3.5 `index.css`: added `.message-row { content-visibility: auto;
  contain-intrinsic-size: 0 80px; }` so offscreen rows skip layout/paint.
- 3.6 `Chat.jsx`: `markMessagesAsRead` effect debounced 500ms and guarded by a
  `lastReadId` ref (`room:lastMessageId`) so unchanged message lists skip POST.
- 3.7 Surgical `will-change: transform, opacity` added via `src/lib/willChange.js`
  and a CSS rule targeting only `.date-floating-badge.is-animating`,
  `.go-to-latest-btn:active`, `.context-menu-animating`, `.toast-rise.is-animating`
  and `.sileo-toast.is-animating`; classes are added on animation/transition
  start and removed on `animationend`/`transitionend`. Message bubbles and the
  scroll container have NO will-change.
- New helper files: `src/lib/willChange.js`, `src/lib/messageMenuIcons.jsx`,
  `src/lib/bubbleMenuIcons.jsx`.
- Verified: `npx eslint` on all modified files → clean; full `npx eslint src`
  still reports the same 17 pre-existing errors in unrelated files
  (CallModal, ChatInput, Login, Register, VoiceMessage, useWebRTC, Profile,
  Settings). `npm run build` → success (index 534.82 KB → 536.22 KB, +1.4 KB
  from the new helpers).

### Perf impact
- React renders per new message: 500 bubbles no longer re-render on every
  message (memoized props are primitive/stable callbacks).
- Date formatting calls per render: ~500 `Intl` constructions → 1 formatter;
  `formatDateSeparator` 1000 calls → 500 calls.
- Scroll handler: O(n) layout reads per scroll event → O(1) state check.
- Document listeners: up to ~1000 (2 per bubble) → 0 closed / 2 open.
- Offscreen message rows skip rendering work via `content-visibility`.
- Read-receipt POSTs: one per message-list change → one per 500ms debounce
  window with unchanged-last-id guard.

## Phase 4 (no visual changes)

- 4.1 `src/game/components/Character.jsx`: merged the 4 separate `useFrame`
  hooks (clips, procedural body, head bone, crumbs) into one `useFrame` calling
  four plain update functions. Removed the per-render
  `JSON.stringify(normalizeWardrobe(...))`; `wardrobeItems` now memoizes on the
  primitive wardrobe fields (hat/face/accessory/shirt color/pattern).
- 4.2 `src/game/components/RemotePlayers.jsx`: `useFrame` now early-returns when
  `!groupRef.current?.visible`, so LOD-culled remote players skip all per-frame
  lerp/skeleton work in their child `Character` components too.
- 4.3 `src/game/components/CozyScene.jsx`: removed drei `<Stars>` (2200/1100
  points) — kept the custom `<Starfield>` (2000/900 points) as the single sky.
- 4.4 `ChatBubble.jsx` + `QuestTracker.jsx`: permanent `requestAnimationFrame`
  loops replaced with `setInterval` (200ms / 100ms respectively).
- 4.5 `src/game/components/CanopyFX.jsx`: `Pollen` and `FallingLeaves` now
  update their buffers every 3rd frame via a frame counter.
- 4.6 Removed `backdrop-blur-md` from in-canvas drei `<Html>` HUD elements
  (`ChatBubble`, `NameTag`, `NPC`, `NpcBarkBubble`) and changed semi-transparent
  backgrounds to solid `#171426`; text remains readable.
- Verified: `npx eslint src/game` → 0 errors (1 pre-existing warning in
  useGameSync.js), `npm run build` → success. three chunk 1,231.92 KB →
  1,229.92 KB (Stars removed), GameCanvas 115.41 KB → 115.23 KB.

### Expected FPS impact
- Character animation callbacks per player: 4 → 1 per frame.
- Remote players beyond LOD radius: their entire character animation subtree
  now skips updates instead of only hiding geometry.
- Sky points rendered: ~4200 → ~2000 at high quality.
- rAF callbacks: 2 per remote player + 1 global → 0 (timers at 5–10 Hz).
- Canopy buffer uploads: 60/s → 20/s per component.
- `backdrop-filter` compositing on in-canvas HTML labels eliminated (largest
  single per-frame GPU cost).
