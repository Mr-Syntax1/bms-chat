# AI Handoff — "Cozy Forest Campfire" (multiplayer 3D game)

> Date: 2026-11-22 · Branch: `main` · HEAD: `2ceb436 made game better`
> No commit / push / stash / reset was performed. All user changes and this session's changes are preserved.

---

## 0. One-line status

Phases 0–11 are **code-complete**. Prop placement is now per-character and numerically verified. Phase 12 (browser/2-client QA) is the only thing left, plus Phase 14 (keep this doc current).
Production build **compiles** and fails only at the PWA/Workbox precache step (intentionally not fixed). ESLint is **clean**.

---

## 1. Completed work

### 1.1 Phase 0 — Audit
- Audit was performed over all game files (GameCanvas, GameOverlay, Character, PlayerController, RemotePlayers, CozyScene, Forest, Campfire, Ground, Beach, Decorations, CampDecor, Van, QuestItems, AmbientAudio, AudioRoot, GameVoice, hooks, stores, sceneLayout, interactionRegistry, questRegistry, audio, sounds, synth, voiceControl, controls, lib/ably, index.css, vite.config, models, public assets).
- The audit output was **never saved to a file** (it existed only in conversation). There is no audit table in the repo.

### 1.2 Phase 1 — Character facing
Files: `frontend/src/game/models/characterConfig.js`, `components/Character.jsx`, `components/PlayerController.jsx`, `components/RemotePlayers.jsx`

- `characterConfig.js`: added a `facing` field to all 9 characters. `CuteRedDino.glb = Math.PI`, everything else `0`. New exports: `CHARACTER_FACING_OFFSET`, `getFacingOffset(model, overrides)`.
- `Character.jsx`: the model is wrapped in `<group rotation={[0, facingOffset, 0]}>` (inside the scale group, inside the lift group). `facingOffset` is read from `useSettingsStore.facingOverrides` → live adjustment without reload.
- `PlayerController.jsx`: `Ctrl+Shift+F` toggles debug mode; `[` / `]` change the offset by 5° (15° with Shift) and persist it to localStorage; reports 4×/sec via `setFacingDebug({model,yaw,offset,final,dir,speed})`.
- `RemotePlayers.jsx`: rotation is derived from the **actual movement delta** (`Math.atan2(movedX, movedZ)`), not from the payload → remote players never walk backwards. Frame-rate-independent lerp: `1 - Math.pow(1 - L, delta * 60)`.
- UI: `ui/FacingDebug.jsx` renders the debug panel (wired in GameOverlay).

⚠️ **Unverified**: facing offsets for symmetric models (Mushroom, CoolBannana, CuteCharacter) were inferred from GLB geometric analysis. No rendered image could be inspected, so **none of them are visually confirmed**. Fallback: `Ctrl+Shift+F` + `[`/`]`.

### 1.3 Phase 2 — Performance
Files: `GameCanvas.jsx`, `components/Forest.jsx`, `sceneLayout.js`, `activeTrees.js` (new)

- `GameCanvas.jsx`: `shadows={preset.shadows}`, `dpr={[1, preset.dpr]}`, `antialias: preset.dpr >= 1.25`, `alpha:false`, `stencil:false`, `far:400`. `<AdaptiveDpr pixelated />` and `<PerformanceMonitor iterations={8} ms={500} onDecline={handleDecline} />` with hysteresis (`fps > 42` is rejected) and a 12-second `downgradeCooldown`. Downgrade only happens when `controls.autoQuality` is on.
- `sceneLayout.js`: `TREE_MAX = 800`, `densityWeight(x)`, `buildTrees(limit)`, `TREES = buildTrees(TREE_MAX)`, beach-edge gradient, path keepout (`|z|<4.5 && x>6 && x<SAND_START_X`).
- `Forest.jsx`: trees are built from `buildTrees(preset.treeDensity)`; `frustumCulled={false}` removed; calls `setActiveTrees(trees)`; leaf color variation.
- `activeTrees.js` (new): spatial grid `CELL = 4` with `setActiveTrees`, `getActiveTrees`, `getNearbyTrees(x, z, out)`, `getTreeGridSize`.
- `PlayerController.jsx`: tree collision via `getNearbyTrees(nextX, nextZ, treeBuf)` with `treeBuf = useMemo(() => [], [])` (zero per-frame allocation).

### 1.4 Phase 3 — Living forest
Files: `components/CozyScene.jsx`, `GrassField.jsx` (new), `Butterflies.jsx` (new)

- `GrassField.jsx`: InstancedMesh with 6000 base blades, sway in the vertex shader, `count = floor(BASE_COUNT * preset.grassDensity)`. **No wind audio** (per the hard rule).
- `Butterflies.jsx`: instanced, flight path + wing flap in shader, `aPhase`/`aColor` instanced attributes. `count = min(count, preset.butterflies)`; renders nothing when the preset value is 0.
- `CozyScene.jsx`: `Stars`/`Starfield`/`Bloom`/`Vignette` are quality-gated; `NightSky` with `topColor = #171426`; `Fireflies count={preset.fireflies}`.

### 1.5 Phase 4 — Lighting and atmosphere (mostly complete)
- Night sky, moon, low-poly clouds, fog (`fog #101c30, 30→150`), quality-gated bloom/vignette in `CozyScene.jsx`.
- `preset.shadowMapSize` now drives the fire light's shadow map size and `preset.shadows` gates `castShadow` on it.
- `preset.envAnimation` now freezes `Stars` rotation speed, `Starfield`, `LowPolyClouds`, and `Butterflies`.
- **Remaining**: light budgeting (light count) and final interior/ambient lighting tuning.

### 1.6 Phase 5 — Audio (wind fully removed)
Files: `sounds.js`, `components/AmbientAudio.jsx`, `synth.js`, `audio.js`, `public/sounds/wind.mp3` (deleted)

- `WIND_SOUND` removed from `sounds.js`. `makeWindBuffer` and `PROCEDURAL_FACTORIES.wind` removed from `synth.js`. `AmbientAudio.jsx` now plays only fire + crickets. `wind.mp3` was deleted from disk (`D` in git status).
- **Audio channels (Phase 11, done)**: `audio.js` gained a `volumeGains` registry + `setVolumeGains(next)` + `channelRegistry`. `playPositionalOneShot(url, pos, { channel })` and `createPositionalLoop(url, pos, { channel })` now accept `channel` and call `applyGain`. `AmbientAudio` creates sounds with `channel: 'fire'` and `'ambient'` and calls `setVolumeGains(audio)` inside `useEffect([audio])`.
- **Voice slider now works**: `useSpatialVoice` multiplies its distance volume by `volumeGains.voice * volumeGains.master` on every 100 ms tick.

### 1.7 Phase 7 — UI/UX (nearly complete)
New folder `frontend/src/game/ui/`:

| File | Status | Notes |
|---|---|---|
| `primitives.jsx` | ✅ complete, wired | `GlassPanel`, `PrimaryButton`, `GhostButton`, `IconButton`, `Slider`, `SegmentedControl`, `Toggle`, `ProgressBar` |
| `GameHUD.jsx` | ✅ complete, wired | Avatar, username, connection state, `LocalSpeakingIndicator`, `n/9`, mic toggle, `n/4` quests |
| `SettingsPanel.jsx` | ✅ complete, wired | Graphics / audio / controls + key list; ESC closes |
| `QuestLog.jsx` | ✅ complete, wired | Right drawer; locked quest steps + inventory + ProgressBar |
| `PauseMenu.jsx` | ✅ complete, wired | Resume / settings / exit + stats + keys |
| `Toasts.jsx` | ✅ complete, wired | Bottom-center, 4 kinds (success/warn/info/error) |
| `InteractionPrompt.jsx` | ✅ complete, wired | Glowing ring + E/F key + locked state |
| `GameLoadingScreen.jsx` | ✅ written, wired, **untested** | Weighted progress (models 70% / LiveKit 20% / character 10%), stars, "enter anyway" after 30s |
| `FacingDebug.jsx` | ✅ complete, wired | Facing debug panel |

- `index.css`: `--color-cozy-*` tokens (`midnight #171426`, `navy`, `orange #ff9a4d`, `gold #ffc66d`, `cream #f5ebdd`, `forest #5d9b78`, `voice #65f5a0`), keyframes `eq-bounce`/`star-twinkle`/`gentle-float`/`cozy-pop-in`/`cozy-fade-in`/`toast-rise`/`ring-pulse`/`ember-glow`, classes `.eq-bar(-1/2/3)`, `.loading-star`, `.gentle-float`, `.cozy-pop-in`, `.cozy-fade-in`, `.toast-rise`, `.interact-ring`, `.ember-glow`, and a `@media (prefers-reduced-motion: reduce)` guard.
- **`GameOverlay.jsx` was fully rewritten** (332 lines). New structure: loading → enter → Canvas + HUD + Toasts + InteractionPrompt + bottom bar + TouchPad + ControlsHint + FacingDebug + PauseMenu + QuestLog + SettingsPanel.
- **Key `L`** opens/closes the quest log (only while pointer lock is active).
- `ESC`: first releases pointer lock; a second ESC closes the game (deferred to log/settings if either is open).

### 1.8 Phase 5/7 — Real speaking detection (LiveKit)
Files: `voiceActivity.js` (new), `components/VoiceActivityIndicator.jsx` (new), `hooks/useSpeaking.js` (new), `components/GameVoice.jsx`, `stores/usePlayerStore.js`

- `voiceActivity.js`: `attachVoiceActivity(room)` is fed **only** by the real `room.on('activeSpeakersChanged')` event. Plus `detachVoiceActivity()`, `getVoiceActivitySnapshot()`, `subscribeVoiceActivity()`.
- `stores/usePlayerStore.js`: `selfId`, `speakingIds`, `setSelfId`, `setSpeaking` (guarded by set-equality so it never sets unnecessarily).
- `VoiceActivityIndicator.jsx`: `EqualizerBars`, `VoiceBubble` (default), `LocalSpeakingIndicator`.
- `hooks/useSpeaking.js`: `useIsSpeaking(id)`, `useLocalSpeaking()`.
- `GameVoice.jsx`: `attachVoiceActivity(room)` in `VoiceBridge`, `detachVoiceActivity()` in cleanup.
- ✅ Rule respected: `micEnabled` is never used as "is speaking".

### 1.9 Phase 8 — Preloading
New file: `frontend/src/game/preload.js`
- `preloadAllModels()` (idempotent via a `started` flag) and `preloadCharacter(model)`.
- All paths are **real** and were verified against the filesystem: 9 characters + 3 trees + 15 env + 7 beach + 6 mission.
- Called once from `GameOverlay` via `useEffect`.
- ⚠️ **Important risk**: `preload.js` is imported **statically** in `GameOverlay`, which pulls `@react-three/drei` into the main bundle and weakens the `lazy(() => import('./GameCanvas'))` code split. This is a likely contributor to the oversized `index-*.js` (unverified — not investigated, per user instruction).

### 1.10 Phase 6 — Guitar and marshmallow (code complete, visual QA pending)
New file: `frontend/src/game/components/HeldProps.jsx`; changed: `components/Character.jsx`

- `HeldProps.jsx`:
  - `useNormalizedModel(url, length)` — clones the GLB, normalizes around its center, longest dimension = `length`.
  - `HeldGuitar` — from `/game-models/ExtraCozyProps/Guitar.glb`, position `[0.2, 0.98, 0.2]`, rotation `[-0.35,-0.45,-0.5]`, length 1.05.
  - `HeldMarshmallow({ stage })` — wooden stick (cylinder) + marshmallow (box); color/emissive/pointLight updated from `stage` in `useFrame` (`raw #fdf6ec`, `roasting #f3dcae`, `ready #b9793f` + emissive `#ff8a3d`).
  - `HeldProps({ action, marshmallowStage })` — resolves `action` each frame and only flips `visible` on the relevant group (no re-render).
  - `resolve()` supports constant / ref / getter values.
- `Character.jsx`: new prop `marshmallowStage = null`; `<HeldProps action={action} marshmallowStage={marshmallowStage} />` is rendered **inside** the `rotation={[0, facingOffset, 0]}` group → props align with the body and work for both local and remote players.

**Phase 6 status: wired (logic complete), visually unverified.**
1. ✅ `marshmallowStage` is now passed from both parents: `PlayerController.jsx` (`() => usePlayerStore.getState().marshmallow`) and `RemotePlayers.jsx` (`() => remoteMap.get(id)?.marshmallowStage ?? null`).
2. ✅ The duplicate fire-side skewer block was removed from `Campfire.jsx` (old lines 123–139), together with `marshmallowRef`, `marshmallowColor`, the `marshmallow`/`action` store subscriptions, and the skewer sway in `useFrame`. Only the in-hand skewer remains.
3. ✅ Remote stage is synced: `useGameSync.js` `selfPayload()` now sends `marshmallowStage` (and it is part of the send-equality check); `upsertRemote` stores it; the `player-action` handler sets `entry.marshmallowStage = 'roasting'` on `action:marshmallow`, `'ready'` on `marshmallow-ready`, and `null` on `action-end`; `RemotePlayers` clears it when `actionUntil` expires.
4. ⚠️ Guitar and marshmallow positions/rotations are **still visually unverified** (no rendered image inspected). One fixed transform is used for all 9 characters; bone attachment was not done because no `HandL`/`HandR` bone exists in all rigs.
5. ⚠️ `HeldMarshmallow` uses primitives only (does not use `Marshmallows.glb`); the GLB itself is used as a static camp prop in `CampDecor.jsx`.

### 1.12 Phase 9 — Quest/discovery polish (implemented, unverified)
New file `frontend/src/game/questSteps.js` — **single source of truth** for quest steps:
- `QUEST_STEPS` (4 steps: parchments/lanterns/key/chest with icon/title/desc/max).
- `questValue(quests, key)` and `isQuestStepLocked(quests, key)` (order enforcement).
- `getActiveQuestStep(quests)` → `{ step, index, value, max, done, locked }` (first unfinished step).
- `getQuestTarget(quests, collected)` → `{ label, x, z }` of the first un-collected item of the active step (real `QUEST_SPOTS` data only).
- `describeQuestStep(active)` → the HUD string.

Wired changes:
- `ui/QuestLog.jsx` no longer duplicates the step list; imports `QUEST_STEPS`/`questValue`/`isQuestStepLocked`/`getActiveQuestStep`, and highlights the **active** step with a `فعال` badge.
- `hooks/useQuestSystem.js` computes `currentQuest` via `describeQuestStep(getActiveQuestStep(...))` → HUD text can never drift from the log.
- `stores/usePlayerStore.js`: new `questDistance` + `setQuestDistance` (sets only when the rounded value changes → minimal re-renders).
- `components/PlayerController.jsx`: every 0.1 s (and while seated) computes the rounded distance to the active quest target via `getQuestTarget`.
- `GameOverlay.jsx`: new isolated `QuestTracker({ currentQuest })` component subscribes to `questDistance` and shows `N متر`; the rest of the overlay does not re-render on distance changes.
- `components/QuestItems.jsx`: collecting a parchment now plays a short `StarBurst` at its spot (discovery moment), using real collection state (no fake data).

⚠️ Not verified in a browser: badge highlighting, distance number correctness, and the parchment discovery burst.

### 1.13 Action-timer fix (Phase 6 hardening)
`components/PlayerController.jsx` — new local `cancelPendingAction(state)` helper inside the key handler effect:
- Clears `guitarTimer` / `marshmallowTimer` and, if an action was running, calls `endAction()` + publishes `action-end`.
- Called when starting a guitar, starting a marshmallow, or starting an emote.
- **Bug fixed**: previously, pressing G while roasting left the marshmallow timer alive, so a stale `marshmallow-ready` event (and the "yum" sound) fired for other players ~3 s later. Timers are now always mutually exclusive.

### 1.15 QA bug fixes (Phase 12 pass)
- `audio.js` `setVolumeGains`: fixed **double-applied `master`** — the live-update loop used `volumeGains[channel] ?? volumeGains.master` and then multiplied by `master` again, so moving any audio slider (including the voice slider) made fire/crickets jump in volume. It now uses the same `(volumeGains[channel] ?? 1) * master` formula as `applyGain`.
- `GameOverlay.jsx`: the mobile **sit button's `disabled`** read `usePlayerStore.getState().nearFire` during render, so it never updated as the player approached the fire. Now `nearFire` is a store subscription (`const nearFire = usePlayerStore((s) => s.nearFire)`).

### 1.16 Prop placement — per-character anchors (implemented)
`models/characterConfig.js`, `components/HeldProps.jsx`, `components/Character.jsx`
- **Real bug found by measurement**: `HeldGuitar`/`HeldMarshmallow` had a hardcoded X (`0.2`/`0.22`), but actual normalized arm half-spans across the 9 models range **0.25 → 1.06** — so the props sat **inside the torso** for most characters.
- Added `CHARACTER_PROPS` (defaults `x:0.34, y:0.95, z:0.28, scale:1`) and a per-character `prop: { x, y, z, scale }` override in `CHARACTERS`.
- New export `getPropAnchor(model)` → merged anchor; `Character.jsx` computes `propAnchor` and passes it to `<HeldProps anchor={...}>`; `HeldProps` forwards it to both held props (position `[anchor.x, anchor.y, anchor.z]`, `scale={anchor.scale}`).
- Values were derived from **measured GLB arm spans** (`frontend/scripts/inspect-armspan.mjs`, new throwaway script) with the rule `x = max(0.20, armHalf * 0.85)`.

| model | height | arm half-span | final anchor x / y / scale |
|---|---|---|---|
| Cactoro | 3.83 | 0.74 | 0.63 / 0.90 / 1 |
| Citizen | 1.91 | 0.51 | 0.43 / 0.95 / 1 |
| CoolBannanaGuy | 5.73 | ~0.01 (arms tucked) | 0.20 / 1.00 / 1 |
| CubeGuyCharacter | 2.71 | 0.82 | 0.70 / 0.95 / 1 |
| CuteCharacter (chibi) | 1.13 | 0.51 | 0.43 / 0.62 / 0.72 |
| CuteRedDino | 1.54 | 0.59 | 0.50 / 0.74 / 0.85 |
| DORAEMON (chibi) | 0.92 | 0.45 | 0.38 / 0.60 / 0.70 |
| miku | 1389 | ~0.08 (arms tucked) | 0.20 / 0.95 / 1 |
| MushroomCharacter | 5.87 | 0.15 | 0.20 / 0.72 / 0.90 |

- Verified numerically with `frontend/scripts/verify-prop-anchors.mjs` (new): for every model it normalizes the mesh the same way `Character.jsx` does, samples the arm band (35–75 % of height), and asserts the anchor lands at/just outside the measured body half-width. All 9 pass.
- ⚠️ **Still not visually confirmed** — values are geometric estimates from real mesh bounds, not eyeballed renders. If a character looks off, tune `CHARACTERS[model].prop` directly. `Ctrl+Shift+F` + `[`/`]` remains the live fallback for *facing* (props have no live tuner).

### 1.17 GameVoice change (connect after user gesture)
`components/GameVoice.jsx` + `stores/usePlayerStore.js`
- New prop `connect = true`. The LiveKit token is fetched **up front** (for honest loading progress), but `LiveKitRoom` and `useSpatialVoice` only activate when `connect` is true → the mic permission prompt is not raised before the user acts.
- `usePlayerStore`: new field `voiceTokenReady` + `setVoiceTokenReady(ready)`. `setVoiceError` now also sets `voiceTokenReady` to false.
- `GameOverlay` uses `voiceTokenReady` for the loading screen and `voiceReady` for the HUD mic button.
- ⚠️ **Untested**: `LiveKitRoom` behavior when `connect` flips from false to true has not been exercised at runtime.

---

## 2. Incomplete work

| # | Item | File | What remains |
|---|---|---|---|
| 1 | Phase 12 (full QA) | — | Only ESLint + build compile + dev boot were run; no gameplay/device testing |
| 2 | `Marshmallows.glb` only used as a static camp prop | `HeldProps.jsx`, `CampDecor.jsx` | It **is** used (bag of marshmallows at `[-2.6, 0.2, 3.2]`), so it stays in preload; the in-hand skewer intentionally uses primitives |
| 3 | Audit table not in a file | — | Must be rebuilt if needed |
| 4 | Prop placement | `HeldProps.jsx`, `characterConfig.js` | Per-character anchors from measured arm spans (§1.16); numerically verified, not visually |
| 5 | Phase 6 marshmallow stage unverified in browser | `HeldProps.jsx`, `useGameSync.js` | 2-client visual QA |
| 6 | Phase 9 UI unverified in browser | `QuestLog.jsx`, `GameOverlay.jsx` | Badge/distance/burst visual check |
| 7 | Audio slider + mobile sit-button fixes unverified in browser | `audio.js`, `GameOverlay.jsx` | Needs manual check (see §1.15) |

---

## 3. Exact state at stop time

- Last action (previous session): reading `Campfire.jsx` to remove the duplicate skewer.
- **Phase 6 wiring (done)**: `marshmallowStage` passed from `PlayerController` + `RemotePlayers`, duplicate skewer removed from `Campfire.jsx`, and remote stage sync added in `useGameSync.js` + `usePlayerStore.js`.
- **Phase 11 controls (done)**: `usePointerLook.js` sensitivity/invertY, `useSpatialVoice.js` voice gain, `Campfire.jsx` `shadowMapSize`+`shadows`, `preset.envAnimation` in `CozyScene.jsx`/`Butterflies.jsx`.
- **Phase 9 quest polish (done)**: `questSteps.js` (shared step metadata + `getActiveQuestStep` + `getQuestTarget` + `describeQuestStep`), `QuestLog` active-step badge, HUD `questDistance` via isolated `QuestTracker`, parchment `StarBurst` discovery moment.
- **Action-timer hardening (done)**: `PlayerController.jsx` `cancelPendingAction` clears guitar/marshmallow timers on every action/emote start and publishes `action-end`, so no stale `marshmallow-ready` can fire.
- **QA bug fixes (done)**: `audio.js` live volume update no longer double-applies `master`; `GameOverlay.jsx` sit button now subscribes to `nearFire`.
- **Prop anchors (done)**: per-character `prop` in `characterConfig.js`, `getPropAnchor()`, `HeldProps anchor` prop; numerically verified by `scripts/verify-prop-anchors.mjs`.
- **This session's last action**: implemented per-character prop anchors (§1.16) — measured real GLB arm spans with a new script, found the props were inside the torso for most models (hardcoded x=0.2), and replaced with per-model `x/y/z/scale`. Verified numerically with a second new script (all 9 pass), ESLint clean, `vite build` compiles.
- `HeldProps.jsx` is created and wired at `Character.jsx:189` ✅.
- Prop for the local player: **yes, wired** (`PlayerController` → `Character` → `HeldProps` with `action` + `marshmallowStage` getter).
- Prop for remote players: **yes, wired** (`RemotePlayers` → `Character` → `HeldProps` with getters `action` + `marshmallowStage`).
- roasting → ready synchronization: **wired** for both local and remote (via `player-move` payload + `player-action` events). Not yet verified in a live 2-client session.
- `GameOverlay`: rewritten and fully wired to all the new UI.
- Remaining major phases: 12 (full QA) and 14 (keep this doc current). All feature phases (0–11) are code complete but only ESLint/build-compile verified.

---

## 4. Testing and build

### ESLint
```
cd frontend
npx eslint src/game --ext .js,.jsx
```
**Result: clean, 0 errors, 0 warnings** (last run after the Phase 12 bug fixes in §1.15).

> Note: `npx eslint src --ext .js,.jsx` (whole `src`) reports **pre-existing** errors in `src/components/*` (CallModal, ChatInput, InstallButton, Login, Register, VoiceMessage), `src/hooks/useWebRTC.js`, `src/pages/{Profile,Settings}.jsx`, and `src/App.jsx`. These are **not** in the game scope and were **not** touched. The documented command for this project is `src/game` only.

ESLint issues fixed along the way (for reference):
- `react-hooks/immutability`: `seed` reassigned inside `useMemo` → moved to a module-level IIFE.
- `react-hooks/purity`: `useRef(Date.now())` → removed.
- `no-unused-vars`: `mountedAt`, `ablyReady`, `PrimaryButton` removed.

### Production build
```
cd frontend
npm run build
```
**Result: FAIL** (but compilation and bundling succeed; the failure is in the PWA step).

Relevant output:
```
dist/assets/GameCanvas-EycKheo8.js    200.75 kB │ gzip:  65.49 kB
dist/assets/index-DJ94MTMr.js       2,564.34 kB │ gzip: 706.40 kB
✓ built in 4.82s
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification.
error during build:
Error:
  Configure "workbox.maximumFileSizeToCacheInBytes" to change the limit: the default value is 2 MiB.
  Assets exceeding the limit:
  - assets/index-DJ94MTMr.js is 2.56 MB, and won't be precached.
    at logWorkboxResult (.../vite-plugin-pwa/dist/chunk-G4TAN34B.js:44:13)
  code: 'PLUGIN_ERROR',
  plugin: 'vite-plugin-pwa:build',
  hook: 'closeBundle'
```

- **Where**: `vite-plugin-pwa` → `closeBundle` hook → `generateServiceWorker` → `logWorkboxResult`.
- **Direct cause**: the main bundle `index-*.js` is 2.56 MB, exceeding Workbox's default 2 MiB precache limit.
- **Suspected root cause (unverified)**: (a) the static import of `preload.js` in `GameOverlay` that drags `@react-three/drei`/`three` into the main bundle and defeats the lazy `GameCanvas` split; (b) the inherent weight of three.js + LiveKit + Ably. **This was not investigated because the user explicitly said not to.**
- **Files involved**: `frontend/vite.config.js` (the `VitePWA.workbox` block — `globPatterns`, `globIgnores`), `frontend/src/game/preload.js`, `frontend/src/game/GameOverlay.jsx`.
- **What was attempted**: observation and documentation only. **No fix was applied.** `vite.config.js` was not modified.
- **Likely fixes for later (not applied)**: add `maximumFileSizeToCacheInBytes` to `workbox`, or drop `js` from `globPatterns`, or remove the static import in `preload.js`.

> ⚠️ **User instruction**: this error is intentionally left unresolved. Do not investigate or fix it unless the user asks.

### Tests actually performed
- ✅ ESLint over `src/game` (clean). Whole-`src` ESLint has pre-existing errors outside the game scope (see §4).
- ✅ `npx vite build` — compiles and bundles; fails only at the PWA/Workbox precache step.
- ✅ `npx vite --port 5199` dev server boot → HTTP 200 on `/` (no dev-time compile errors).
- ✅ `node scripts/verify-prop-anchors.mjs public/game-models/characters` → all 9 character prop anchors land at/just outside the measured body half-width (this normalizes each GLB exactly like `Character.jsx`).
- ✅ Verified physical existence of every model path in `preload.js` via `Get-ChildItem`.
- ✅ Verified every CSS class used exists (`.loading-star`, `.gentle-float`, `.toast-rise`, `.cozy-pop-in`, `.cozy-fade-in`, `.interact-ring`, `.eq-bar`, `.ember-glow`).
- ✅ Verified `pwa-512x512.png` exists for the loading logo.
- ✅ Verified the signature of every hook/store used in GameOverlay.
- ✅ Verified there is no wind reference anywhere in `src/game`.

### Tests not performed (all)
- ❌ Actually playing the game in a browser (dev server boots, but no gameplay was exercised).
- ❌ Multiplayer entry and player sync.
- ❌ Visual check of character facing.
- ❌ Visual check of guitar/marshmallow placement in hand.
- ❌ LiveKit testing (token, mic, speaking indicator).
- ❌ Loading screen and progress percentage.
- ❌ Mobile / TouchPad.
- ❌ Quality low/medium/high and PerformanceMonitor.
- ❌ A successful `npm run build` (blocked by the PWA error).
- ❌ Phase 9 visuals (active badge, distance counter, parchment burst).
- ❌ Camera sensitivity / invert-Y sliders at runtime.
- ❌ Friends'-voice slider at runtime.

---

## 5. Git and file safety

- **Branch**: `main` · **HEAD**: `2ceb436 made game better`
- No commit / push / stash / reset / checkout / discard was performed.

### Modified
```
 M frontend/public/sounds/water.mp3        ← user change, untouched
 D frontend/public/sounds/wind.mp3         ← intentional deletion per the "no wind" rule
 M frontend/src/game/GameCanvas.jsx
 M frontend/src/game/GameOverlay.jsx
 M frontend/src/game/audio.js
 M frontend/src/game/components/AmbientAudio.jsx
 M frontend/src/game/components/Character.jsx
 M frontend/src/game/components/CozyScene.jsx
 M frontend/src/game/components/Forest.jsx
 M frontend/src/game/components/GameVoice.jsx
 M frontend/src/game/components/PlayerController.jsx
 M frontend/src/game/components/QuestItems.jsx
 M frontend/src/game/components/RemotePlayers.jsx
 M frontend/src/game/hooks/useGameSync.js
 M frontend/src/game/hooks/usePointerLook.js
 M frontend/src/game/hooks/useQuestSystem.js
 M frontend/src/game/hooks/useSpatialVoice.js
 M frontend/src/game/models/characterConfig.js
 M frontend/src/game/sceneLayout.js
 M frontend/src/game/sounds.js
 M frontend/src/game/stores/usePlayerStore.js
 M frontend/src/game/synth.js
 M frontend/src/index.css
```

### Untracked (new)
```
?? docs/                                              ← this handoff
?? frontend/.model-previews/                          ← model-analysis output (19 files)
?? frontend/scripts/                                  ← throwaway GLB analysis scripts (13 .mjs)
?? frontend/src/game/activeTrees.js
?? frontend/src/game/components/Butterflies.jsx
?? frontend/src/game/components/GrassField.jsx
?? frontend/src/game/components/HeldProps.jsx
?? frontend/src/game/components/VoiceActivityIndicator.jsx
?? frontend/src/game/hooks/useSpeaking.js
?? frontend/src/game/preload.js
?? frontend/src/game/questSteps.js
?? frontend/scripts/inspect-armspan.mjs
?? frontend/scripts/verify-prop-anchors.mjs
?? frontend/src/game/stores/useSettingsStore.js
?? frontend/src/game/ui/                              ← 9 components
?? frontend/src/game/voiceActivity.js
```

### User changes that must be preserved
- `frontend/public/sounds/water.mp3` (modified) — **do not touch.**
- `frontend/public/sounds/wind.mp3` (deleted) — intentional; do not restore.

### `_baseline`
- The `../_baseline` folder (outside the repo, at `C:\Users\pc-11\Desktop\this is your story\Node.js\_baseline`) was created by me with `git worktree add`, after which the user said to leave it alone.
- **I made no further changes to `_baseline` after that instruction** — no stash, reset, checkout, or build. (The last command against it was interrupted by the user.)
- `git worktree list` still shows it (`2ceb436 (detached HEAD)`); **removing/cleaning it is the user's call.** No file from it exists inside the main repo.

---

## 6. Architecture and essential context

### 6.1 Ably (single instance — hard rule)
- **Only** `frontend/src/lib/ably.js`. Never construct `new Ably.Realtime(...)` anywhere else.
- Key exports: `ably` (default), `getChannel(name)`, `encodeChannelPart(value)`, `setAblyAuthToken(token)`, `disconnectAbly()`.
- Game channel: `getGameChannelName(roomId)` → `game-state-${encodeChannelPart(roomId)}` in `hooks/useGameSync.js`.
- Sync: `useGameSync` with `SYNC_INTERVAL = 66ms` (15 Hz), `PRUNE_TIMEOUT = 9000ms`, `PRUNE_INTERVAL = 2000ms`. Events: `player-move`, `player-left`, `player-action`; presence for the player count.
- A `sessions` Map + `sessionSeq` guards StrictMode (a stale cleanup must not release the new channel). **Do not break this logic.**

### 6.2 LiveKit
- Token: `POST /api/livekit/token` with `{ roomName, roomId }` → `{ token, url, roomName }`. The server prefixes the room name with `camp-`.
- Frontend: `hooks/useLivekitToken.js` (status: `idle|loading|ready|error`), `components/GameVoice.jsx` (`LiveKitRoom` + `RoomAudioRenderer` + `MicAutoEnable` + `VoiceBridge`).
- **`GameVoice` must remain a sibling of the canvas**, not its parent — otherwise the Canvas remounts when the token resolves.
- Speaking detection: only `room.on('activeSpeakersChanged')` via `voiceActivity.js`. **Never use `micEnabled` as "is speaking".**
- Spatial: `hooks/useSpatialVoice.js` writes position to `participant.attributes` (`x`,`y`,`z`) every 100 ms and sets volume by distance (`HEARING_RADIUS = 26`), multiplied by `volumeGains.voice * volumeGains.master`.
- **Identity matching**: `participant.identity` must be compared to the game player id as `String(identity)`. `setSelfId(user.id)` is called in `GameOverlay`.
- Backend env: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`. `GET /api/livekit/health` reports configuration status.

### 6.3 GameOverlay / Chat.jsx
- `frontend/src/components/Chat.jsx:16` → `import GameOverlay from '../game/GameOverlay'`.
- `Chat.jsx:52` → `const [gameRoomId, setGameRoomId] = useState(null)`; `:155` sets it to `currentRoom`; `:158` is `handleCloseGame`.
- Render: `Chat.jsx:305` → `{gameRoomId && gameRoomId === currentRoom && (<GameOverlay roomId={gameRoomId} user={user} onClose={handleCloseGame} />)}`.
- **Rule**: the game stays inside this modal; preserve the existing LiveKit setup.

### 6.4 Characters and players
- `models/characterConfig.js`: `CHARACTERS` (9 models with `height`/`minY`/`clips`/`prefix`/`facing`/`clipOverrides`), `CHARACTER_FILES`, `DEFAULT_CHARACTER = 'Cactoro.glb'`, `characterUrl(file)`, `CHARACTER_FACING_OFFSET`, `getFacingOffset`, `TARGET_HEIGHT = 1.75`, `CLIP_SUFFIX`.
- Rigged models: `Cactoro.glb` (14 clips, prefix `CharacterArmature|`), `Citizen.glb` (5 clips, `Armature|`, has `HandL`/`HandR` bones), `CubeGuyCharacter.glb` (18 clips, triple prefix). The rest (CoolBannanaGuy, CuteCharacter, CuteRedDino, DORAEMON, miku, MushroomCharacter) are **unrigged** → procedural bob/tilt animation.
- `Character.jsx`: `SkeletonUtils.clone` per instance; clip switching in `useFrame` with a 0.22 s fade; lift from `minY`; scale = `TARGET_HEIGHT / height`; facing-offset group; `HeldProps` inside the facing group.
- `PlayerController.jsx`: camera-relative WASD, tree/van/bounds collision, third-person camera (`CAM_DIST`, `CAM_LERP`), interaction raycast every 0.1 s, facing debug, guitar/marshmallow/emote timers.
- `RemotePlayers.jsx`: `remoteMap` (mutable, no re-render) + `remoteIds` (for rendering). Frame-rate-independent interpolation. `VoiceBubble` in the name tag.
- `stores/usePlayerStore.js`: `local` (mutable x/y/z/rot/seat/moving/emote/action), `remoteMap` (exported), `subscribeSpatial`/`emitSpatialFrame`, quests, toasts, `facingDebug`, `selfId`, `speakingIds`, `voiceTokenReady`.

### 6.5 Settings
- `stores/useSettingsStore.js`: `QUALITY_PRESETS` (low/medium/high with `dpr`, `shadows`, `shadowMapSize`, `bloom`, `vignette`, `particles`, `treeDensity`, `grassDensity`, `butterflies`, `fireflies`, `envAnimation`), `audio {master, ambient, fire, effects, voice}`, `controls {lookSensitivity, invertY, autoQuality}`, `facingOverrides`. Persisted in `localStorage['cozy-forest-settings-v1']`. `suggestQuality()` based on cores/memory/UA. `useQualityPreset()` selector.

### 6.6 Key assets
```
/game-models/characters/{Cactoro,Citizen,CoolBannanaGuy,CubeGuyCharacter,CuteCharacter,CuteRedDino,DORAEMON,miku,MushroomCharacter}.glb
/game-models/opt/{Pine,Bonfire,RV,ChoppedLog,Tent,Rocks,LogFungus,LogAxe,Cactoro}.glb
/game-models/trees/{Pine,Pine2}.glb
/game-models/ExtraCozyProps/{Guitar,Marshmallows,PicnicTable,Backpack,PicnicTable2}.glb
/game-models/Decorations/{BushbyQuaternius,Flowers,Mushrooms,Rocks2,Lantern,ChoppedLog,LogAxe,LogFungus,Rocks,Tent,Tent2,Tent3}.glb
/game-models/beach/{LighthousebyPoly,ClambyPoly,SeashellbyPoly,StarfishbyPoly,RockPathRoundSmall}.glb
/game-models/beach/port/Port.glb · beach/boat/{BoatbyPoly,RowboatbyPoly}.glb · beach/trees/{PalmTree,PalmTree2,CoconutPalmTree}.glb
/game-models/missions/{ParchamentOpen,PostLantern,FishingRod,Key,TreasureChest,WoodenSign,Lantern}.glb
/sounds/{campfire.mp3,crickets.mp3,guitar1.m4a,guitar2.mp3,guitar3.m4a,water.mp3,yum.mp3}
/pwa-512x512.png, /pwa-192x192.png
```
> **`wind.mp3` does not exist and must not come back.**

### 6.7 Backend
- `backend/src/routes/calls.js`: `GAME_CHARACTERS` (9 files), `GAME_CAPACITY = 9`, `CLAIM_TTL = 2h`.
  - `POST /api/calls/game/claim-character` (requireAuth) → `{ character, url, players, capacity }`; full capacity → **409**.
  - `POST /api/calls/game/release-character` (requireAuth).
  - Assignment is stable per user: a second request returns the same character.
- `backend/src/routes/livekit.js`: `POST /token`, `GET /health`.
- `frontend/src/hooks/useChat.js` → `apiRequest` (used by claim/token).

### 6.8 Hard rules (from the original master prompt — do not violate)
1. Only the Ably singleton in `src/lib/ably.js`.
2. The game stays inside the `Chat.jsx` modal; preserve the existing LiveKit setup.
3. **No wind audio anywhere** (no file, no synth, no reference).
4. No Framer Motion — CSS animations only.
5. No fake multiplayer/speaking data.
6. Code comments in Persian.
7. No TODO placeholders or half-finished code.
8. Never claim an untested feature works.
9. LiveKit identity ↔ game player id via `String(identity)`.
10. `micEnabled` ≠ speaking.
11. Commit/push only if the user explicitly asks.

---

## 7. Next steps (in priority order)

### 1) ✅ DONE — Finish Phase 6 (marshmallow stage wiring + duplicate skewer)
- `PlayerController.jsx` / `RemotePlayers.jsx` now pass `marshmallowStage` getters.
- `Campfire.jsx` duplicate skewer removed.
- `useGameSync.js` + `usePlayerStore.js` now sync `marshmallowStage` for remotes.
- **Remaining sub-task**: visual QA — press M near the fire and confirm the in-hand marshmallow goes caramel/glows after ~3 s locally, and a second client sees the same. Tune `HeldProps.jsx` transforms across the 9 characters.

### 2) ✅ DONE — Wire camera controls (Phase 11)
- `usePointerLook.js` reads `controls.lookSensitivity` + `controls.invertY` live from `useSettingsStore.getState()` inside `mousemove` (`BASE_SENSITIVITY = 0.0022` multiplied by the slider).
- ✅ DONE — voice slider: `useSpatialVoice.js` multiplies distance volume (and the no-position fallback `0.55`) by `volumeGains.voice * volumeGains.master`.
- ✅ DONE — `preset.shadowMapSize` now drives the fire light's `shadow-mapSize` and `preset.shadows` gates `castShadow` (`Campfire.jsx`).
- ✅ DONE — `preset.envAnimation` freezes `Stars` speed, `Starfield`, `LowPolyClouds`, and `Butterflies` (`CozyScene.jsx`, `Butterflies.jsx`).

### 3) Phase 9 — quest/discovery polish (implemented)
- **New**: `game/questSteps.js` (single source of truth: `QUEST_STEPS`, `questValue`, `isQuestStepLocked`, `getActiveQuestStep`, `getQuestTarget`, `describeQuestStep`).
- `QuestLog.jsx` uses it and highlights the active step; `useQuestSystem.js` derives the HUD text from it; `PlayerController.jsx` publishes `questDistance`; `GameOverlay.jsx` renders it via the isolated `QuestTracker`; `QuestItems.jsx` shows a `StarBurst` on parchment collection.
- **Remaining**: browser verification only.

### 4) Prop placement tuning (implemented + numerically verified)
- **Done**: per-character `prop { x, y, z, scale }` anchors in `characterConfig.js` + `getPropAnchor()`, wired through `Character` → `HeldProps`. Values derived from measured GLB arm spans; `scripts/verify-prop-anchors.mjs` asserts all 9 anchors land at/just outside the body. See §1.16 for the table.
- **Remaining**: a real render to confirm aesthetically; adjust the numbers in `CHARACTERS[model].prop` if a character looks off.

### 5) Fix the build error (the user will do this — do not start)
- **File**: `frontend/vite.config.js` (`VitePWA.workbox`) and possibly `frontend/src/game/preload.js`
- **Options**: `maximumFileSizeToCacheInBytes`, drop `js` from `globPatterns`, or remove the static import in preload.
- ⚠️ **The user explicitly said not to investigate or fix this.**

### 6) Phase 12 — full QA (in progress)
- Static pass done this session: found and fixed 2 real bugs (§1.15).
- Remaining: `npm run dev` + two browsers; cover every item in section 4 "Tests not performed".
- Re-run ESLint at the end.

### 7) Phase 14 — keep this document current
- `docs/AI_HANDOFF.md` exists; update it after the items above are resolved.

---

## 8. Environment notes (important for the next agent)

- **Shell = PowerShell**. `&&` does not work; use `;`.
- `Select-String -Recurse` is unsupported. Use this pattern instead:
  ```powershell
  Get-ChildItem -Recurse -Include *.js,*.jsx -Path frontend\src\game | Select-String -Pattern 'X'
  ```
- **The `grep` and `glob` tools are broken in this environment** (always return "No files found"). Use `read` or PowerShell.
- Files are UTF-8 with Persian text; `Get-Content` in the console may show mojibake — that is a display issue, not file corruption. Use the `read` tool for correct content.
- Project root: `C:\Users\pc-11\Desktop\this is your story\Node.js\learning SOCKET.IO` (folders `frontend/` and `backend/`).
- `frontend/scripts/*.mjs` and `frontend/.model-previews/` are throwaway model-analysis tooling and are **not part of the product**. They can be removed or `.gitignore`d later.
