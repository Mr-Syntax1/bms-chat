# ROLE
You are a senior game engineer + technical artist working inside an existing React Three Fiber
project called "Cozy Forest Campfire". Your goal: transform it into a premium cozy multiplayer
camping hangout in the spirit of "Cozy Campfire Club" (Kitbash Games) and then go beyond it —
cuter, livelier, deeper, and with a much better-used map.

Work in PHASES. After each phase: run the app/build, fix errors, update frontend/src/game/README.md
(in Persian, like the current one) and dock/AI_HANDOFF.md (see HANDOFF PROTOCOL), and summarize what
changed. Never break existing features (multiplayer sync, LiveKit spatial voice, quest chain,
settings, quality presets). Do not rewrite what works — extend it. Start with PHASE 0, then PHASE 1,
then stop and report for my review.

# HANDOFF PROTOCOL (MANDATORY, applies to every session and every phase)
All progress notes live OUTSIDE the frontend/ and backend/ folders, in `dock/AI_HANDOFF.md` at the
repository root (sibling of frontend/ and backend/). Create the `dock/` folder and the file if they do
not exist. Do not create other progress/notes files elsewhere (the Persian game README stays in
frontend/src/game/README.md as the architecture doc).
1. FIRST ACTION of every session: read dock/AI_HANDOFF.md (if present) and continue from it. It is the
   source of truth for what is done and what is not. If it contradicts the code, trust the code, then
   fix the file.
2. UPDATE IT after every meaningful progress step: each finished sub-feature, each phase start/end,
   each important decision, and always before you stop for any reason (error, blocker, end of turn).
   Never leave work un-logged.
3. BE HONEST. Mark an item Done only if you ran the build/app and verified it. Otherwise mark it
   "unverified" and say why. Never list something as done that is only planned or partly coded.
4. Write prose in Persian (I read it); keep file paths, identifiers and commands in English.
5. Required structure (keep it tidy, edit in place, do not just append forever):
   - Title, last-updated date/time, current phase and one-line status
   - 1. Summary (what the game can do right now)
   - 2. DONE ✅ — each item with the files touched and how it was verified
   - 3. IN PROGRESS 🔄 — what is half-built and exactly where you stopped
   - 4. NOT DONE ⬜ — remaining work grouped by phase, in priority order
   - 5. PLACEHOLDERS STILL IN USE — asset key → what real file is still needed
   - 6. Decisions and deviations from this prompt (and why)
   - 7. Known issues / risks / things to test manually
   - 8. How to run and verify (commands, URLs, debug flags)
   - 9. New env vars, backend endpoints, store keys, localStorage keys
   - 10. Changelog — newest first, dated, one line per entry
6. Keep it concise enough that a fresh AI session (with no memory of this chat) can resume in minutes.

# EXISTING ARCHITECTURE (do not violate)
- Layers: 2D React (GameOverlay, ui/) · 3D R3F (GameCanvas, components/) · Zustand stores (stores/)
  · Network/Voice (useGameSync via Ably, GameVoice via LiveKit).
- HARD RULES already used across the codebase:
  1. Per-frame/hot data (transforms) lives OUTSIDE React: `local` and `remoteMap` in usePlayerStore.js,
     refs, and registries. React re-renders only when UI needs it.
  2. `questSteps.js` is the single source of truth for quests; HUD, QuestLog and store all read it.
  3. Audio/quality/distance values are read live from useSettingsStore, never snapshotted at mount.
  4. Heavy repeated meshes use InstancedMesh (see Forest, Decorations, InstancedGLB, useModelParts).
  5. Quality presets (low/medium/high in useSettingsStore) gate dpr, shadows, particles, densities.
     Every new feature MUST have low/medium/high behavior and must respect PerformanceMonitor.
  6. Models are GLB under public/game-models, preloaded via preload.js; Fitted.jsx normalizes bad bboxes;
     characterConfig.js is the character config. Sounds go through audio.js (positional + channels:
     master/ambient/fire/effects/voice) with synth fallback if a file is missing.
  7. Network: position sync on Ably channel `game-state-<roomId>` (player-move every 66ms, player-action
     events). Backend: routes/calls.js (claim-character, capacity 9), routes/livekit.js.
  8. Wind sound was intentionally removed. Do not add a wind loop.
- Key files: sceneLayout.js (all map data, seed-based generation), PlayerController.jsx (movement,
  camera, collisions via activeTrees spatial hash, actions), CozyScene.jsx, Forest.jsx, Ground.jsx,
  Beach.jsx, QuestItems.jsx, useQuestSystem.js, interactionRegistry.js, questRegistry.js.

# GROUND TRUTH: ASSETS ALREADY IN THE REPO (frontend/public)
Paths are relative to public/game-models/ (models) and public/sounds/ (sounds). They are exact and
case-sensitive. Production is likely Linux, so e.g. `beachball.glb` (lowercase) and
`npc/WIzardGnome.glb` must be referenced with exactly that casing. Many models sit loose in the
game-models root. Do NOT rename or move my files; abstract them through the manifest (Phase 0).

## Models I HAVE
| Role | File(s) | Notes |
|---|---|---|
| Player characters | characters/Cactoro, Citizen, CoolBannanaGuy, CubeGuyCharacter, CuteCharacter, CuteRedDino, DORAEMON, miku, MushroomCharacter | already in characterConfig.js |
| NPC candidates | npc/Grandpa, Adventurer, Littlegirl, Witch, CowCharacter, WIzardGnome | inspect rigs + clip names first |
| Conifers | trees/Pine, trees/Pine2 (heavy ~2.2 MB each), opt/Pine (light, use for instancing/LOD) | |
| Other trees | trees/BirchTrees (plural: inspect single vs grove), beach/trees/PalmTree, PalmTree2, CoconutPalmTree | palms = beach only |
| Undergrowth | trees/Fern, Decorations/BushbyQuaternius, Flowers, Mushrooms, LogFungus, opt/Cattail, Lilypad.glb (root) | |
| Edible mushroom | MushroomLaetiporus.glb (root) | forage item + cooked-mushroom ingredient |
| Rocks/logs | Decorations/Rocks, Rocks2, RockMedium, opt/Rocks, Treestump, ChoppedLog, LogAxe | Treestump doubles as a seat/stool |
| Bridges/paths | Woodbridge.glb, Bridge.glb (root), beach/RockPathRoundSmall | inspect scale/pivot/orientation |
| Animals | animals/Easterrabbit (rabbit), Muledeer (deer), Mallardduck (duck), Frog, Owl, Porcupine, Goldfish | Porcupine stands in for hedgehog |
| Fishing | missions/FishingRod, opt/Bucket | |
| Cooking stations | Pot.glb, Cauldron.glb, Fryingpan.glb (root) | pot = tripod-style pot, cauldron = big stew pot |
| Food models | Steak, EggFried, Corn, Potato, PancakesStack, Pie, Stew, SushiNigiri, SkewerVegetables (all root .glb) | map recipes onto these |
| Camp comfort | Bedroll.glb (sleeping bag), Hammock.glb, Icebox.glb (cooler), Thermos.glb, Mug.glb, Holidaylights.glb (string lights), Modernrug.glb, Flag.glb | |
| Beach fun | beachball.glb, Umbrella.glb, Umbrellaandchairs.glb (root); beach/LighthousebyPoly, port/Port, boat/BoatbyPoly, RowboatbyPoly, ClambyPoly (3.5 MB), SeashellbyPoly (1.8 MB), StarfishbyPoly (3.4 MB) | |
| Camp structures | Decorations/Tent, Tent2, Tent3, Lantern (duplicate also in missions/), missions/PostLantern, missions/WoodenSign, ExtraCozyProps/PicnicTable, PicnicTable2, Backpack, Guitar, Marshmallows, fire/Bonfire, opt/Bonfire, cars/RV, opt/RV | |
| Quest | missions/Key, ParchamentOpen, TreasureChest (1 MB) | |

## Sounds I HAVE
| Logical use | File |
|---|---|
| fire / crickets / lake ambience / eat / guitar | campfire.mp3, crickets.mp3, ocean.mp3 (check how sounds.js references it today), yum.mp3, guitar1.m4a, guitar2.mp3, guitar3.m4a |
| owl / stream / waterfall (loops) | Ambient/owl-hooting.mp3, Ambient/stream-loop.mp3, Ambient/waterfall-in-the-rainforest.mp3 (verify seamless loop; crossfade if needed) |
| fish_cast / fish_reel / fish_catch | casting-fishing-rod-for-game-fishing.mp3, fishing-reel-winding.mp3, item-get-cheerful.mp3 |
| water plink / skipping stones | water-drop-stone.mp3 (make rock_skip_1..5 via random playbackRate 0.85–1.2 + gain) |
| frying (real) | coocking/bacon-frying-sizzle-pop.mp3 (folder name is a typo; do not rename; use manifest) |
| soft synthesized set (27 files, mono, quiet by design) | other/: ui_click, ui_hover, pickup, bug_catch, bug_net, berry_pick, emote_pop, quest_accept, quest_complete, cook_done, burn, flip, eat_crunch, eat_gulp, ball_bounce, ball_kick, place_item, equip_cloth, tent_zip, fire_ignite, marshmallow_toast, fry_sizzle (loop), pot_bubble (loop), npc_blip_1..4 |

## STILL MISSING (build graceful placeholders; a later drop-in must be "add file + flip manifest flag")
- Models: oak/broadleaf tree, dead tree, berry bush, cliff rock/boulder, giant tree (stretch Pine),
  fox, squirrel, hedgehog, all bugs, bobber, bug net, more fish species, old shoe/boot, tripod,
  sausage, soup bowl, berries, honey, camping chair (check inside Umbrellaandchairs, else use
  Treestump/log stools), notice board (build from WoodenSign or a procedural board), ALL hats/glasses.
- Sounds: footsteps (grass/sand/wood/stone), jump, land_soft, splash_small, swim_loop, water_enter,
  fish_bite, frog, nightbirds, leaves_rustle, music_evening.
- Placeholder policy: models → simple procedural primitives; sounds → procedural synth in synth.js
  (filtered-noise footsteps/splashes, etc.). Nothing may be silent or invisible because a file is
  missing, and nothing may throw. Every placeholder is flagged in the manifest and listed in
  dock/AI_HANDOFF.md section 5.

# PHASE 0 — ASSET AUDIT, MANIFEST, OPTIMIZATION (do this before any feature)
1. Create dock/AI_HANDOFF.md from the template in HANDOFF PROTOCOL and log Phase 0 as started.
2. `game/assetManifest.js`: single source of truth mapping logical keys → URL + metadata (kind,
   placeholder flag, heavy flag). All new code uses logical keys (MODELS.npc.fisherman,
   SOUNDS.fish_cast), never raw paths. preload.js, characterConfig.js and sounds.js read from it.
   Missing file → placeholder/synth. Dedupe the duplicated Lantern.glb.
3. `frontend/scripts/verify-assets.mjs` (+ npm script): verifies every manifest path exists with exact
   case, lists files in public/ that nothing references, prints a summary table.
4. `frontend/scripts/inspect-glb.mjs` (same spirit as inspect-armspan.mjs): for every GLB report bbox
   height, minY, triangles, texture sizes, skinned or not, bone names (head/neck/hands), animation clip
   names + durations. Write `game/assetReport.json` and use it to fill configs. Never guess clip or
   bone names. Resolve the open questions: BirchTrees (tree or grove), Bridge vs Woodbridge (which fits
   the river, pivot/scale), RockPathRoundSmall (stone or strip), Umbrellaandchairs (does it contain
   usable chairs), Pot vs Cauldron (sizes/pivots), which npc/ and animals/ models are rigged/animated.
5. Optimization with @gltf-transform/cli: dedup, prune, weld, simplify where needed, textures resized
   (≤1024 large props, ≤512 small), meshopt or Draco compression. Write optimized copies into
   game-models/opt/ and point the manifest at them; keep originals untouched. Priority: Clamby,
   Starfish, Seashell, CoconutPalmTree, PalmTree2, Pine, Pine2, TreasureChest, RockPathRoundSmall,
   CoolBannanaGuy, MushroomCharacter, plus anything the report shows above ~500 KB. Goal: initial load
   well under ~12 MB of GLB; lazy-load NPCs, animals, beach, cooking and food models after entering.
6. Report what loads at start vs lazily and total payload before/after, and log it in AI_HANDOFF.md.

# CORE PRINCIPLE: ONE HEIGHT FUNCTION
Introduce `getGroundHeight(x, z)` (new file game/terrain.js) as the single source of truth for terrain.
Everything that touches the ground (player, remote players, trees, rocks, items, NPCs, animals, camera,
fish/water level, props, grass) must use it. Build the terrain mesh from the same function so visuals
and physics never disagree. Deterministic (seeded noise) so all clients generate identical terrain.

# PHASE 1 — LIVING TERRAIN, TALL FOREST, WATERFALL
1. Terrain
   - Replace flat ground with a heightmap mesh driven by getGroundHeight: gentle rolling meadows around
     the camp (flat within CAMP_RADIUS), hills/ridges toward the north/west forest, a raised cliff
     plateau in the north where a waterfall flows, a river valley carved from the waterfall to the
     lake/beach, beach sloping smoothly into the water. Vertex-color or shader blending: grass → dirt
     path → sand → rock on steep slopes. Soft hand-painted look, no harsh tiling.
   - Walkable dirt paths (camp → lighthouse, camp → waterfall, camp → fishing river) with subtle decals
     and slightly flattened height. River crossings: Woodbridge (or Bridge, per the Phase 0 report) and
     stepping stones from RockPathRoundSmall.
2. Player physics
   - Jump (Space): gravity, coyote time (~0.12s), jump buffering (~0.1s), variable height (release early
     = lower), optional double-jump behind a setting. Ground snapping via getGroundHeight, slope
     limiting (too steep = slide), smooth step-up for small ledges.
   - Landing squash/stretch, dust puff particles. Jump/land sounds via synth fallback until files exist.
   - Swimming below water level: slower, bobbing, ripple rings, splash particles; allowed in the lake
     and the waterfall pool. Moonlight sparkle on water.
   - Footsteps by surface (grass/sand/wood/stone) from a terrain mask, spatial and quiet; synth fallback.
   - Camera: keep the current lerp; add terrain-aware collision, FOV kick when running, jump smoothing.
   - Multiplayer: add y / vy / grounded / swim flag to player-move only if needed; remote players
     interpolate on terrain height.
3. Tall, dense, varied forest (no more sparse short trees)
   - Redesign buildTrees in sceneLayout.js: biome-aware placement driven by terrain (denser on hills,
     sparse in meadows, none on paths/camp clearing/river bed/beach), noise clusters, glades, clearings.
   - Species pool from what I have: trees/Pine, trees/Pine2 (use opt/Pine for far instances), BirchTrees
     (after inspection). No oak/dead tree files exist yet; do not fake them.
   - HEIGHT through code: per-instance Y-biased scale. Understory 4–7 units, mid 8–14, tall canopy
     15–28, a few giant landmark trees 30+ near the waterfall and behind the camp. scaleY > scaleXZ,
     slight random lean (±3°) and Y rotation. Collision radii follow trunk width, not height.
   - Depth: foreground tall trees, mid-ground, and a dense dark low-poly backdrop ring at the map edge
     (no collision) so the world has no visible end; edge fog tint.
   - Undergrowth (instanced, clustered near trunks and paths): Fern, BushbyQuaternius, Flowers,
     Mushrooms, MushroomLaetiporus (harvestable), LogFungus, Treestump, Rocks/Rocks2/RockMedium, fallen
     logs (ChoppedLog laid horizontally with moss tint), Cattail at river edges, Lilypad on ponds. Berry
     bush = tinted Bush + instanced red berry spheres (harvestable in Phase 3).
   - Cliff/waterfall rocks: build ledges from RockMedium/Rocks scaled up plus procedural cliff terrain
     (no cliff GLB exists).
   - Canopy feel: cheap light shafts near the fire clearing and waterfall, drifting pollen, falling
     leaves, firefly clusters in glades.
   - Performance: chunked spatial-hash culling, 2–3 LOD levels (full / simplified / billboard), full
     instancing, density from the quality preset. activeTrees.js uses only nearby trees for collision.
4. Waterfall + river + pond
   - Waterfall on the northern cliff: layered animated shader sheets (scrolling noise + foam), mist and
     splash particles, rock ledges, positional audio from Ambient/waterfall-in-the-rainforest.mp3 via
     createPositionalLoop with distance rolloff. Swimmable pool with ripples.
   - River flows from the pool to the lake (flow-direction shader), positional Ambient/stream-loop.mp3,
     shallow edges (wading splash) and a deeper middle. Side pond with Lilypad + Frog.
   - Fishing spots registered in interactionRegistry along the river and the lake pier.
5. Atmosphere
   - Optional day cycle (setting + lobby-host option): default stays moonlit night; add golden hour and
     dawn (sky gradient, fog, light color, stars, ambient mix), smooth transitions, cheap, preset-aware.
   - Optional light rain (particles + wet-ground darkening; rain sound via synth until a file exists)
     and fog banks.
   - Bloom/vignette tuned for warmth: warm fire oranges vs cool teal/violet night shadows.

# PHASE 2 — CHARACTER LIFE, CUSTOMIZATION, SOCIAL
1. Character feel
   - Squash/stretch on jump/land, walk head-bob, blink and look-at, idle variations (stretch, look
     around, yawn), happy hop on quest completion, breathing idle for procedural-fallback characters.
   - Emote wheel (hold Q): wave, dance, cheer, laugh, sit-cross-legged, sleep, hug (two nearby players
     sync), high-five. Network via existing player-action events. Use emote_pop.mp3.
   - Cute floating name tags and chat bubbles.
   - Rest spots: Hammock (lie down / sleep emote), Bedroll (sleep emote, stargaze), Treestump stools and
     the PicnicTable (sit). Register them in interactionRegistry, using the existing sit system.
2. Wardrobe (like Cozy Campfire Club)
   - ui/Wardrobe.jsx with slots: Hat, Face, Shirt color/pattern, Accessory (Backpack.glb exists; scarf
     procedural), Character choice. Live 3D preview. Persist to localStorage and broadcast through
     presence/player-move metadata so peers see it.
   - I have NO hat/glasses GLBs. Build the first set procedurally from primitives: party hat (cone),
     wizard hat (cone + brim), chef hat, beanie, straw hat, baseball cap, flower crown (torus + small
     spheres), cat ears, round glasses, sunglasses. Structure the catalog so a GLB can replace any
     entry by adding a file and a manifest key.
   - Attach to the head bone found in assetReport.json via a per-character anchor config in
     characterConfig.js (like getPropAnchor); fallback = root + measured offset when no head bone.
     Shirt = cloned-material tint/pattern on the torso mesh. Mug and Thermos can be held props.
   - Unlockables earned by quests/fishing/cooking/bug-catching, shown as locked silhouettes with a hint.
     equip_cloth.mp3 on equip.
3. Social
   - Chat bubbles above heads (reuse the existing chat; small corner log too).
   - Public/private lobbies: private room code/invite link; public "browse campsites" list with player
     counts (backend endpoint built on gameAssignments).
   - Keep proximity voice. Add pat/hug/wave-at-player interaction.
   - Camp ambience reacts to group size (more fireflies, warmer fire glow with 3+ campers).

# PHASE 3 — ACTIVITIES (the "plenty to do" loop)
All activities use interactionRegistry + a generic ActivityManager + new store slices. Progress unlocks
cosmetics and recipes, shown in one tabbed Journal (extend QuestLog): Quests · Recipes · Fish · Bugs ·
Forage · Wardrobe.
1. Cooking (50+ recipes)
   - Stations: campfire grill, hanging pot (Pot.glb on a procedural tripod), Cauldron.glb for stews,
     Fryingpan.glb for pan dishes. Hold-to-cook mini-game with timing zones (raw → perfect → burnt),
     color change (reuse STAGE_COLORS idea), flip prompt for pan, stir prompt for pot/cauldron.
     Audio: coocking/bacon-frying-sizzle-pop.mp3 for the pan, other/pot_bubble for pots, flip,
     cook_done, burn, fire_ignite.
   - Dish visuals from my food models: Steak, EggFried, Corn, Potato, PancakesStack, Pie, Stew,
     SushiNigiri, SkewerVegetables, MushroomLaetiporus. Recipes with no matching model use a generic
     plate/bowl + tinted procedural blob so all 50+ recipes still look distinct. Sausage, berries, honey,
     soup bowl are procedural until real files arrive.
   - recipes.js data-driven: ingredient combos → dish with quality tiers (burnt/ok/perfect), flavor
     text, icon/emoji, silly recipes (old shoe → "Crispy Shoe"). At least 50 recipes from ~25
     ingredients. Recipe Book tab with discovered/undiscovered silhouettes.
   - Eating: sit by the fire, bite/cheek-puff animation, crumb particles, yum.mp3 + eat_crunch/eat_gulp.
     Optional shared dish on the PicnicTable. Keep and extend marshmallow roasting (Marshmallows.glb,
     marshmallow_toast.mp3).
   - Icebox.glb = shared camp cooler: per-room ingredient stash that campers can put into/take from
     (synced via Ably, with per-player limits). Mug/Thermos: "hot drink" recipes.
2. Fishing
   - Use missions/FishingRod.glb and opt/Bucket.glb. Cast (hold E to charge) → bobber on water
     (procedural red/white float) → wait → bite splash + rod shake → reel mini-game → cute catch pop-up.
   - Audio: casting-fishing-rod-for-game-fishing.mp3 (cast), fishing-reel-winding.mp3 (reel),
     item-get-cheerful.mp3 (catch); fish_bite via synth until a file exists.
   - Only Goldfish.glb exists: create ~20 species as data (name, size/weight, zone, time, rarity) rendered
     with Goldfish scaled/tinted per species; plus procedural junk (old boot, can). Fish log; fish are
     cookable.
3. Bugs and wildlife
   - Bugs (butterflies, beetles, ladybugs, dragonflies, bees, night glow-worms) are procedural (no GLBs):
     wander AI, cheap, instanced. Net (procedural) with swing animation, catch radius, bug log; make the
     existing Butterflies.jsx catchable. Audio: bug_net, bug_catch.
   - Wildlife from my models: Easterrabbit (hops away), Muledeer (grazes, flees), Mallardduck (on the
     lake), Frog (near water, croak via synth until a file exists), Owl (perched, head turn,
     Ambient/owl-hooting.mp3), Porcupine (shy ambient animal, stand-in for hedgehog). Squirrel and fox
     have no models: skip, do not fake. Cheap steering (wander/flee) on terrain height; throttled
     10–15 Hz. Petting a rabbit when the player stands still.
4. Foraging
   - Berries, mushrooms (Mushrooms.glb, MushroomLaetiporus.glb), herbs, honey, pinecones, flowers,
     corn/potatoes in a small garden patch: respawning nodes by biome with sparkle hints. Small grid
     inventory in Zustand + localStorage. Items feed cooking, quests, decor. Audio: berry_pick, pickup.
5. Beach and fun
   - beachball.glb: anyone can kick; network via Ably, authority = last kicker; ball_bounce/ball_kick.
     Umbrella.glb / Umbrellaandchairs.glb set up as a beach lounge area with sit spots. Stone skipping:
     flat stone, hold-to-aim, N bounces counted with ripples, rock_skip variants from
     water-drop-stone.mp3. Digging spots using Clamby/Seashell/Starfish (optimized copies only) and the
     10 shells. Moonlit swim spot with glow particles. ocean.mp3 near the shore.
   - Fireside: guitar (G) with guitar1–3 and a sing-along emote, marshmallow contest, ghost-story timer
     that dims the fire.
6. Camp decorating
   - Placement mode (B): terrain-snapped placement/rotation/scale/delete. Catalog from models I have:
     Tent/Tent2/Tent3, Lantern, PostLantern, WoodenSign, PicnicTable(2), Backpack, Bedroll, Hammock,
     Icebox, Thermos, Mug, Holidaylights (string lights; emissive glow at night, plays well with bloom),
     Modernrug, Flag (cloth-wave vertex shader, no wind sound), Umbrella, Flowers, Mushrooms, Rocks,
     ChoppedLog, Bonfire. Procedural placeholders: notice board, stool/chair. Persist per room (backend
     by roomId) and sync via Ably (place/move/remove). Per-player limit and cooldown.
     place_item.mp3, tent_zip.mp3.

# PHASE 4 — NPCs AND QUESTS
1. NPC system (components/NPC.jsx + npcData.js + NPC_CONFIG like characterConfig.js)
   - NPCs idle/wander near a home spot, look at the player when close, speech bubble with typewriter
     text and animalese blips (other/npc_blip_1..4, pitch per NPC), 2–3 dialogue choices, name plates,
     "!" / "?" markers. Dialogue trees are data-driven, can check the quest store and grant rewards
     (items, recipes, hats), plus ambient barks.
   - Register NPCs in interactionRegistry (E to talk). NPC positions are deterministic per client;
     quest progress is per player. Use real clip names from assetReport.json; fallback bob if unrigged.
2. NPC roster mapped to my models
   - npc/Grandpa → Old Fisherman (fishing tutorial, "catch X fish", rod lore, unlocks bobbers)
   - npc/CowCharacter → Camp Cook (recipe quests, "bring 3 berries + 1 mushroom"; procedural chef hat)
   - npc/Adventurer → Ranger (existing treasure chain: maps → lanterns → key → chest, now narrated;
     introduces waterfall exploration and a trail map)
   - npc/Littlegirl → Bug Kid (bug-collecting quests, bug-log rewards)
   - npc/Witch → Mystic (night-only: moonlit swim, firefly jar, secret hat rewards; owns the Cauldron
     stew quest)
   - npc/WIzardGnome → Forest Gnome (hidden deep in the forest; decor/hat rewards; hidden-collectible
     hints)
3. Quest system
   - Keep questSteps.js as the single source of truth; generalize to parallel questlines (main + side)
     with types collect, deliver, catch, cook, find, visit, social. Update HUD, Journal, QuestTracker
     (multi-target arrows) and the store. Rewards go to the wardrobe, recipe book, decor catalog.
   - Daily/rotating camp challenges via simple generators.
   - Hidden collectables (golden acorns/stars) on hard-to-reach terrain for parkour-lite around the
     waterfall ledges. quest_accept / quest_complete sounds.

# PHASE 5 — POLISH, JUICE, PERFORMANCE
- Juice: pickup arcs to inventory, pop animations, UI springs, screen shake on big catches, sparkle
  bursts, soft camera zoom in dialogue, ui_click/ui_hover everywhere.
- Style: warm fire vs cool moonlight, painted ground variation, gentle toon rim light, optional
  outlines, soft shadows, colored fog. Keep it cute.
- Audio: layered ambience (fire, crickets, owl, frogs, stream, waterfall by distance, ocean at the
  shore), cheap low-pass in dense forest, new "music" channel (live volume) for music_evening when it
  exists. The soft synthesized set in sounds/other is intentionally quiet; balance with channel gains
  rather than editing files.
- Performance: 60 fps on mid laptops. Chunked culling, instancing, LOD, shader animation, pooled
  particles, throttled AI, compressed GLBs, lazy zones. Extend PerformanceMonitor to scale particles,
  tree LOD, shadow distance, AI radius.
- Mobile: jump button, action button, radial emote button.
- Settings: music volume, jump/double-jump toggle, day-cycle toggle, weather toggle, outlines,
  reduce-motion. Persist via useSettingsStore (bump storage key version with migration).
- Tools: `?debug` overlay (fps, draw calls, terrain height at player, tree count); extend
  verify-prop-anchors.mjs to hats and held items; keep verify-assets.mjs green.

# RULES FOR YOU
- Follow the HANDOFF PROTOCOL at all times: read dock/AI_HANDOFF.md first, update it after every
  meaningful step and before stopping, and be honest about what is done vs not done.
- Ask at most ONE clarifying question per phase, only if truly blocking; otherwise decide and note the
  decision in AI_HANDOFF.md section 6.
- Keep file sizes sane: PlayerController.jsx is already ~450 lines. Extract jump/swim/footsteps/camera
  into hooks or helpers instead of growing it.
- Keep everything deterministic where clients must agree (terrain, tree layout, NPC positions).
- Never block the main thread: no heavy sync generation on mount; chunk across frames.
- Document architecture in frontend/src/game/README.md (Persian) and list new env vars/endpoints there
  and in AI_HANDOFF.md section 9.
- Every placeholder must be flagged in the manifest and listed in AI_HANDOFF.md section 5.
- At the end of each phase report: done, partially done, known issues, next-phase plan.