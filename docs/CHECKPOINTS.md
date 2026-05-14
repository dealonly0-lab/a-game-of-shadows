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

