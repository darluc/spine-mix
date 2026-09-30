# Spine Mix & Match – final minimal demo

Uses the official Esoteric Software Spine 4.3 Mix-and-Match export with PixiJS 8.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally http://127.0.0.1:5173).

## What was fixed

The Mix-and-Match project is modular: its setup/default skin is not a complete visible character. This version explicitly selects `full-skins/girl` before bounds/positioning, then plays `idle` and centers the rendered bounds. It also uses `Spine.from()` for already-loaded Pixi asset aliases.

## Custom action: pet the cat

The page starts with **蹲下抚摸小猫**, an eight-second loop: crouch,
reach out, gently stroke the cat, then stand. `src/pet-cat.js` adds a
`pet-cat` animation to the loaded skeleton at runtime. The legs use the
existing foot IK; the reaching arm is solved against the cat's head.
The cat is drawn with Pixi graphics and responds with a head lift and tail sway.
Switching to an original animation hides the cat. All full skins remain selectable.
