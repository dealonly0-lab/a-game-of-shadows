# Checkpoints

## Why Checkpoints Matter

HOLLOW will take many iterations. Early versions will be weak, incomplete, and sometimes wrong. That is normal. Checkpoints make sure we do not lose stable progress while improving the game over months.

Each checkpoint should answer:

- What works now?
- What is still weak?
- What changed since the previous checkpoint?
- Can we return to this version if the next experiment fails?

## Checkpoint Rules

1. Create a checkpoint after every stable milestone.
2. Do not checkpoint broken builds unless the checkpoint is explicitly marked as experimental.
3. Run `npm.cmd run build` before stable checkpoints.
4. Keep checkpoint notes honest. Weaknesses are useful information.
5. Prefer small checkpoints over giant unreviewable jumps.

## Naming

Use this format:

```text
Checkpoint-0.1-foundation
Checkpoint-0.2-core-prototype
Checkpoint-0.3-debug-overlay
Checkpoint-0.4-gameplay-tuning
Checkpoint-1.0-playable-prototype
```

## Current Checkpoint

### Checkpoint-0.1-foundation

Status: stable foundation, weak game feel.

What works:

- Phaser 3 project exists.
- TypeScript and Vite are configured.
- Simulation is separated from Phaser rendering.
- Haunted village map data exists.
- Light sources and bot spawns exist.
- Raycasting module exists.
- Core simulation includes movement, beams, bots, shadows, dawn, and win/loss.
- Production build passes.

What is weak:

- Game feel is not tuned yet.
- Bot AI is very basic.
- No sound.
- No proper debug overlay.
- No polished sprites.
- Browser playtest still needs deeper verification.
- Multiplayer architecture is not started.

Next checkpoint target:

### Checkpoint-0.2-core-prototype

Requirements:

- Browser playtest completed.
- Runtime errors fixed.
- Debug overlay added.
- Player movement and beam values tuned.
- Bot behavior improved enough for testing.
- Build passes.

Progress:

- Debug overlay added behind `F1`.
- Collision, light radius, entity radius, and shadow debug lines added.
- HUD shows exposed state.
- First tuning pass completed for movement, beam, bot speed, and dawn duration.
- Bot target selection now requires line-of-sight instead of seeing exposed targets through walls.
- Prototype map expanded from a small test board into a larger 64x36 haunted village.
- Player spawn moved away from the edge so the camera starts inside the world instead of making the game feel side-aligned.
- Match countdown added.
- Player spawn protection added as `SHADOW VEIL`.
- Danger bar added for exposed-state pressure.
- Minimap added for orientation in the larger village.
- Bot AI now has hunt and investigate behavior with short memory of last known target position.
- Beam fire, beam impact, and kills now emit gameplay events for renderer feedback.
- Camera shake and impact rings added for combat feedback.
- Player and bot dots replaced with directional silhouettes.
- Fixed map generation order so roads no longer carve visual tunnels through building blocks.
- Spawn positions now resolve to the nearest valid open tile if authored spawn data lands inside collision.
- First procedural audio system added using Web Audio.
- Countdown, round start, beam fire, beam impact, kills, exposure warning, and ambience now have sound.
- Match stats added for player shots, hits, kills, and survival time.
- Pause menu added with resume and restart.
- Combat notices added for kills.
- Local progression profile added with XP, levels, Embers, wins, match count, best kills, and best survival.
- Match rewards are granted after game over and persisted in localStorage.
- Daily contracts added with auto-claimed XP/Ember rewards and streak bonuses.
- Match director added so each round can use different player spawns, bot spawns, light tuning, sealed map tiles, bot pressure, and dawn speed.
- Dynamic sealed tiles are real collision and raycast blockers, not only visuals.
- Map system now supports multiple layouts; `Grave Market` adds a larger 84x48 arena.
- Camera, minimap, raycasting, collision, spawns, and lights now read from the selected match layout.
- Title screen upgraded into a home hub with Play, profile progression, daily contracts, and next-hunt map/threat info.
- Home hub visual hierarchy improved with topbar, featured hunt panel, stronger CTA, and cleaner information cards.
- Game-over screen now supports returning to the home hub instead of forcing immediate replay.
- Home hub scale corrected after screenshot review; layout now uses most of the viewport instead of appearing as a tiny centered panel.
- Next-hunt panel now includes a larger map-preview surface for stronger game-menu presentation.
- Medium-width home layout fixed so panels stack before they overlap the hero.
- Wall tiles now render as first-pass haunted house blocks with roof edges, windows, side shadows, and occasional chimneys.
- Shadow skin catalog added with starter, rare, and epic cosmetics.
- Home hub now supports unlocking and equipping shadow skins with Embers.
- Equipped skin changes the player's shadow and silhouette color in matches.
- Spawn resolution now requires open tile clearance around player and bot spawns, preventing bots from appearing inside buildings or tight door pockets.
- Game-over title now uses result-specific typography instead of oversized home-hero typography.
- Game-over stats and rewards now sit in bounded summary panels so long win/loss text cannot overflow the viewport.
- Build passes after these changes.
