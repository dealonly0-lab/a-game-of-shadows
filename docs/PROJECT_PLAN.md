# HOLLOW Project Plan

## Working Rule

We do not jump straight into random features. The order is:

1. Plan the game foundation.
2. Build the architecture and core logic.
3. Implement features in planned milestones.
4. Verify each milestone before moving on.

## Game Vision

HOLLOW is a top-down 2D survival game set in a haunted village.

Players are safest in darkness, but darkness also limits information. Light exposes shadows. A player can only be eliminated when their shadow is visible, and the main weapon is a beam of light. Dawn slowly makes hiding harder until the final fight is forced.

Core hook:

> Don't step in the light.

## Engine And Stack

- Engine: Phaser 3
- Language: TypeScript
- Build tool: Vite
- UI: DOM overlay for HUD, menus, game-over, settings
- Current mode: single-player prototype with bots
- Future multiplayer: Node.js plus Socket.io or Colyseus

## Architecture Rules

- Simulation owns game rules.
- Phaser owns rendering, camera, input plumbing, and effects.
- DOM owns HUD and menu UI.
- Map, lights, spawn points, and tuning values live as data.
- Match variants own per-round map seals, spawn rotation, light tuning, and difficulty scaling.
- No gameplay rule should depend on sprite lifetime.
- No major feature is added before the related system boundary is clear.

## Current Project Structure

```text
src/
  game/
    content/
      matchDirector.ts
      villageMap.ts
    input/
      actions.ts
    progression/
      cosmetics.ts
      profile.ts
    simulation/
      constants.ts
      GameSimulation.ts
      raycast.ts
      types.ts
  phaser/
    scenes/
      GameScene.ts
  main.ts
  styles.css
```

## Core Systems

### 1. Simulation

Owns:

- player and bot state
- movement
- collision checks
- beam cooldowns
- projectile updates
- hit detection
- shadow exposure state
- dawn progression
- win/loss state

Main file:

- `src/game/simulation/GameSimulation.ts`

### 2. Map And Content Data

Owns:

- haunted village tile map
- multiple map layouts, including larger arenas
- wall/floor/grave/tree tile definitions
- light source positions
- bot spawn positions
- match director variants for changing map pressure and spawns

Main file:

- `src/game/content/villageMap.ts`
- `src/game/content/matchDirector.ts`

### 3. Raycasting

Owns:

- wall segment generation
- visibility polygons for light sources
- blocking light behind walls

Main file:

- `src/game/simulation/raycast.ts`

### 4. Phaser Scene

Owns:

- render layers
- camera
- input reading
- map drawing
- shadow rendering
- beam rendering
- particle rendering
- darkness overlay

Main file:

- `src/phaser/scenes/GameScene.ts`

### 5. DOM UI

Owns:

- title screen
- HUD
- dawn bar
- beam cooldown text
- game-over screen

Main file:

- `src/styles.css`

### 6. Progression And Content

Owns:

- local player profile
- XP, Embers, daily contracts, and streaks
- cosmetic catalog and equipped shadow skin

Main files:

- `src/game/progression/profile.ts`
- `src/game/progression/cosmetics.ts`

## Milestone Plan

### Milestone 0: Foundation

Status: done

- Create Vite + TypeScript + Phaser project.
- Separate simulation from rendering.
- Add map data.
- Add input action model.
- Add DOM HUD.
- Add production build.

Exit check:

- `npm.cmd run build` passes.

### Milestone 1: Core Prototype

Status: in progress

Goal:

Make the basic HOLLOW loop feel playable.

Tasks:

- Verify light and darkness rendering in browser.
- Tune player movement speed.
- Tune beam speed, range, cooldown, and hit radius.
- Improve bot behavior enough for prototype testing.
- Add debug toggles for shadows, collision, light radius, and FPS.
- Fix any runtime rendering issues.

Exit check:

- Player can move, aim, shoot, hide, expose shadows, kill bots, and lose.
- Build passes.
- Browser playtest has no console errors.

### Milestone 2: Real Gameplay Loop

Status: planned

Goal:

Make matches feel tense instead of just technically working.

Tasks:

- Add proper match start countdown.
- Add spawn safety.
- Add round timer and clearer dawn phases.
- Add minimap for larger-map orientation.
- Add better bot AI states: patrol, investigate shadow, chase, retreat.
- Add event-based renderer feedback for beam fire, impacts, and kills.
- Replace placeholder dots with readable directional silhouettes.
- Add line-of-sight checks for bot target selection.
- Add map hazards and risky shortcuts.
- Add match director so each round changes spawns, blocked paths, lighting, bot pressure, and dawn speed.
- Add larger map layouts and route the camera, raycaster, minimap, and collision through the selected layout.
- Add clearer feedback when the player is exposed.

Exit check:

- A full match has readable tension and a clear beginning, middle, and end.

### Milestone 3: Feel And Presentation

Status: planned

Goal:

Make the game feel professional.

Tasks:

- Add sound effects.
- Add ambient haunted village loop.
- Add screen shake and hit-stop for kills.
- Add first-pass procedural audio for core feedback.
- Add stronger light beam animation.
- Add better shadow shapes.
- Add player/bot silhouettes or sprite placeholders.
- Add settings menu.

Exit check:

- The prototype feels good even before multiplayer.

### Milestone 4: Multiplayer Architecture

Status: planned

Goal:

Prepare the game for real online play.

Tasks:

- Decide multiplayer framework: Socket.io or Colyseus.
- Move authoritative simulation to server.
- Define client prediction boundaries.
- Define network messages.
- Add lobby flow.
- Add room lifecycle.
- Add disconnect handling.

Exit check:

- Two browser clients can join the same match.

### Milestone 5: Content And Monetization Base

Status: planned

Goal:

Prepare for retention and future business features without ruining the prototype.

Tasks:

- Add player profiles.
- Add local XP, level, and match reward progression.
- Add daily contracts and streak bonuses to give each session clear goals.
- Add cosmetic shadow skins.
- Add unlockable cosmetics.
- Add home-hub cosmetic list with local unlock/equip actions using Embers.
- Add match stats.
- Add pause and resume flow.
- Add leaderboard stub.
- Add local inventory model before payments.
- Upgrade the title screen into a home hub with play, profile, daily goals, and next-match info.
- Add home navigation after match end so players can inspect progress before starting another hunt.
- Keep the home hub scaled like a real game menu across large desktop viewports.
- Add medium-width layout rules so the home hub cannot overlap on tablet or narrow desktop screens.
- Replace plain wall blocks with first-pass haunted house rendering before the sprite pipeline.
- Validate spawns with open-area clearance so bots and players never start inside buildings or door pockets.
- Keep game-over result typography separate from homepage hero typography.

Exit check:

- Cosmetic system works without changing core gameplay rules.

## Immediate Next Steps

1. Fix the economy so rewards, prices, and unlock gates create long-term goals.
2. Expand cosmetic/content inventory so Embers have enough sinks.
3. Rework the home hub into proper Play, Loadout, Contracts, and Shop sections.
4. Add more match content: hazards, bot archetypes, and map modifiers.
5. Keep Phaser for now; the current problems are content, design, economy, and art direction, not engine capability.

## Next Execution Plan: Economy And Content Overhaul

This is the near-term plan we follow next. The goal is to stop players from buying everything too early and make the game feel like it has progression depth.

### Step 1: Economy Rebalance

Status: in progress

Problem:

- Current rewards are too high.
- Current cosmetic prices are too low.
- Players can unlock too much too early.

Implementation:

- Reduce base match XP and Ember payout.
- Cap low-performance match rewards.
- Separate XP rewards from Ember rewards more clearly.
- Add level gates to cosmetics.
- Add requirement gates to premium cosmetics, such as wins, total kills, or contract completions.
- Make starter cosmetics cheap, rare cosmetics medium-term goals, and epic cosmetics long-term goals.

Target values:

- Weak match: 4-8 Embers.
- Good match: 10-18 Embers.
- Win with kills/contracts: 20-35 Embers.
- Rare skins: 600-1,200 Embers plus level gate.
- Epic skins: 2,000-5,000 Embers plus achievement gate.

Exit check:

- A player cannot buy all cosmetics after a few matches.
- A new player has one obvious first unlock goal.
- Epic cosmetics feel aspirational.

Checkpoint 2026-05-17:

- Match XP and Ember payout were reduced.
- Daily contracts now pay smaller Ember amounts.
- Cosmetic prices were raised into rare and epic target ranges.
- Shadow skins now support level, win, kill, best-kill, and contract gates.
- Prototype save data migrates to the new economy version and resets old cosmetic ownership to the starter skin.

### Step 2: Content Inventory Expansion

Status: in progress

Goal:

- Give players more things to chase before multiplayer exists.

Add content types:

- 12-20 shadow skins.
- Beam colors.
- Spawn effects.
- Kill effects.
- Player silhouette variants.
- Titles and badges.
- Map-themed unlocks tied to specific achievements.

Implementation rules:

- Cosmetics are data-driven in `src/game/progression/cosmetics.ts`.
- Profile stores ownership and equipped item IDs.
- Renderer reads equipped cosmetic IDs but does not own progression rules.
- No payment logic until local inventory is stable.

Exit check:

- Home hub shows enough locked and unlocked items to feel like a real progression system.
- Equipped items visibly affect the match without changing gameplay balance.

Checkpoint 2026-05-17:

- Added Beam Colors as a second local cosmetic category.
- Profile now stores owned and equipped beam cosmetic IDs.
- Loadout panel now groups Shadow Forms and Beam Colors.
- Equipped beam cosmetic changes player projectile trail, glow, and core color.

### Step 3: Home Hub Rework Into Sections

Problem:

- The current home hub is still too compressed and visually weak.
- Everything is shown at once instead of organized like a game menu.

New home sections:

- Play: selected map, threat, mode, and start button.
- Loadout: equipped shadow, beam, spawn, kill effect.
- Contracts: daily and weekly objectives.
- Shop: unlockable cosmetics.
- Profile: stats, level, title, badges.

Implementation:

- Add DOM tab navigation.
- Keep game canvas free of menu complexity.
- Keep text readable on large desktop and narrow desktop.
- Use preview swatches and item cards instead of raw text lists.

Exit check:

- No overlapping containers at 1024px, 1366px, 1920px, and ultrawide.
- Player can understand what to do from the home screen within 5 seconds.

### Step 4: Gameplay Content Depth

Goal:

- Matches should differ beyond spawn points and light radius.

Add:

- Map hazards: fog patches, moonlight cones, cursed ground, broken lantern zones.
- Bot archetypes: Hunter, Scout, Stalker, Charger.
- Match modifiers: Low Moon, Lantern Outage, Fast Dawn, Dense Fog.
- More map layouts with smaller houses, alleys, courtyards, and readable landmarks.

Implementation:

- MatchDirector chooses modifiers.
- Simulation owns hazard logic.
- Phaser owns hazard rendering and feedback.
- Content stays data-driven.

Exit check:

- A match has at least one memorable modifier or hazard.
- Bots feel behaviorally different, not just faster/slower.

### Step 5: Visual Direction Pass

Problem:

- Current visual style is a functional prototype, not a professional game look.

Direction:

- Keep spooky top-down 2D.
- Move away from plain dark blocks and gold text everywhere.
- Use stronger silhouettes, cleaner UI hierarchy, and purpose-built item previews.
- Create a simple sprite/asset pipeline before adding many final assets.

Implementation:

- Replace procedural houses with sprite-like house components or generated sprites.
- Add tile variation for roads, roofs, windows, fences, graves, and trees.
- Reduce overuse of Cinzel for small UI.
- Use a readable UI font for dense text and reserve Cinzel for headings.

Exit check:

- Screenshots read as a game, not a debug prototype.
- Houses, roads, lights, and characters are identifiable at a glance.

### Engine Decision

Decision for now:

- Stay on Phaser 3.

Reason:

- HOLLOW is still a 2D browser-first game.
- The current weaknesses are economy, UI, content, and art direction.
- Unity would not automatically fix those weaknesses and would slow down iteration.

Re-evaluate Unity/Godot only if:

- We decide to make the game 3D.
- Browser-first instant play stops being the priority.
- We need a native app-focused production pipeline.
- Phaser rendering or tooling becomes the actual blocker.
