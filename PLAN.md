# Deeper Vision — Build Plan

A modern, browser-based site survey and security system design platform.
Drag-and-drop floor plan editor, toggleable 3D walkthrough, threat simulation.

> "Figma for physical security."

---

## 1. Vision

System Surveyor wins on workflow integration but loses on visual delight. Their
3D story is non-existent — every design ends as a flat schematic. Deeper Vision
flips that. The same data model powers a 2D top-down editor *and* a real-time
3D world you can walk through like a video game. Then you can press play on a
threat simulation and watch your camera coverage actually work — or fail.

The product has three moments of wow:

1. **The toggle.** Press a key, your 2D plan inflates into a 3D scene. Smooth,
   cinematic, instant comprehension.
2. **The walkthrough.** First-person controls. Walk the building you just
   designed. See exactly what each camera sees from where it stands.
3. **The simulation.** Drop a threat actor, draw their path, hit play. Watch
   coverage gaps light up in real time. Get an after-action report.

Everything else (device library, properties panel, BoM, PDF export) is table
stakes — necessary but not the reason anyone shows up.

---

## 2. Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Vercel-native. SSR for landing, CSR for editor. |
| Language | **TypeScript** | Mandatory — 3D math + state graph without types is a nightmare. |
| Styling | **Tailwind CSS** | Speed. Pair with `clsx`/`tailwind-merge`. |
| UI primitives | **shadcn/ui** | Radix-based, accessible, you own the source. |
| Icons | **lucide-react** | Clean, consistent, MIT. |
| Motion | **Framer Motion** | The 2D↔3D transition and onboarding micro-animations. |
| 2D canvas | **react-konva** | Battle-tested, fast, easier than raw canvas. |
| 3D engine | **@react-three/fiber + @react-three/drei** | React semantics over Three.js. drei gives us `PointerLockControls`, `OrbitControls`, `useGLTF`, post-processing. |
| 3D physics | **@react-three/rapier** | Wall collision for first-person walkthrough. Lightweight WASM. |
| State | **Zustand** | Single store, no Redux ceremony. Middleware for undo/redo + localStorage persist. |
| Forms | **react-hook-form + zod** | Properties panel validation. |
| PDF export | **@react-pdf/renderer** | Generate BoM and survey report client-side. |
| Persistence (v1) | **localStorage** via Zustand persist | Zero infra, instant. |
| Persistence (v2) | **Vercel Postgres + Blob** | Sharing/collab when ready. |
| Auth (v2) | **Clerk** or **Auth.js** | Defer until needed. |
| Deploy | **Vercel** | Push to main → live. |

> Anything not on this list (Redux, GraphQL, tRPC, S3, Firebase) is out of scope
> for v1. Adding any of them needs a justification, not a vibe.

---

## 3. Data Model

The single source of truth that both the 2D editor and 3D scene read from.

```ts
type DesignDocument = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  floors: Floor[];
  activeFloorId: string;
};

type Floor = {
  id: string;
  name: string;          // "Ground floor", "Level 2"
  index: number;         // stacking order for multi-floor 3D
  planImage: string;     // data URL or Blob URL
  scale: number;         // pixels per meter — set during calibration
  ceilingHeight: number; // meters, default 2.7
  walls: Wall[];
  devices: Device[];
};

type Vec2 = { x: number; y: number }; // in floor-plan pixel space
type Wall = {
  id: string;
  start: Vec2;
  end: Vec2;
  height: number; // meters
};

type Device =
  | CameraDevice
  | AccessReaderDevice
  | SensorDevice
  | NetworkDevice;

type DeviceBase = {
  id: string;
  position: Vec2;
  rotation: number;   // radians, 0 = facing +X
  mountHeight: number; // meters from floor
  label: string;
  notes: string;
};

type CameraDevice = DeviceBase & {
  type: 'camera';
  cameraType: 'fixed' | 'ptz' | 'dome' | 'fisheye';
  model: string;
  fovDegrees: number;       // horizontal FOV
  rangeMeters: number;      // effective detection range
  irRange?: number;         // night range
  resolution?: string;      // "4K", "1080p"
};

type AccessReaderDevice = DeviceBase & {
  type: 'reader';
  readerType: 'card' | 'biometric' | 'keypad';
  controlsDoorId?: string;
};

type SensorDevice = DeviceBase & {
  type: 'sensor';
  sensorType: 'motion' | 'glass-break' | 'door-contact' | 'smoke';
  rangeMeters: number;
};

type NetworkDevice = DeviceBase & {
  type: 'network';
  networkType: 'switch' | 'access-point' | 'nvr';
  coverageMeters?: number; // for APs
  portCount?: number;      // for switches
};

type SimulationScenario = {
  id: string;
  name: string;
  actor: { startPosition: Vec2; speedMs: number };
  path: Vec2[];      // waypoints
  events: SimEvent[];
};

type SimEvent = {
  timestamp: number;        // ms from sim start
  type: 'detected' | 'lost' | 'triggered';
  deviceId: string;
  actorPosition: Vec2;
};
```

Two invariants the whole app depends on:

- **All spatial data lives in floor-plan pixel space.** The 3D scene converts
  to world meters via `floor.scale`. This keeps the 2D editor simple — no unit
  conversions until render time.
- **One source of truth.** The Zustand store holds `DesignDocument`. The 2D
  canvas, 3D scene, properties panel, BoM, and PDF all read from it. No
  duplication.

---

## 4. Feature Breakdown — How Each One Gets Built

### 4.1 Landing page (`/`)

Single-page marketing site. Hero with looping demo video of the 2D↔3D toggle.
Three feature sections (toggle, walkthrough, simulation). CTA: "Open editor".
No signup gate in v1.

Implementation: server component, Tailwind, Framer Motion scroll animations.
~2 hours.

### 4.2 The editor shell (`/design/[id]`)

Three-pane layout:

```
┌────────────────────────────────────────────────────────────┐
│  Top bar: [Logo] [Project name]  [2D│3D│Sim]  [Save][PDF]  │
├──────────┬─────────────────────────────────────┬───────────┤
│ Library  │                                     │ Props     │
│ sidebar  │           Canvas / 3D scene         │ panel     │
│          │                                     │           │
│ Cameras  │                                     │           │
│ Readers  │                                     │           │
│ Sensors  │                                     │           │
│ Network  │                                     │           │
│          │                                     │           │
├──────────┴─────────────────────────────────────┴───────────┤
│ Floor switcher  │  Status bar  │  Sim timeline (when on)   │
└────────────────────────────────────────────────────────────┘
```

- Left pane: collapsible categories, each with searchable device cards.
- Center: the active view. 2D = Konva stage. 3D = R3F canvas.
- Right: contextual — empty if nothing selected, device properties form if a
  device is selected, scene settings if nothing is selected and view is 3D.
- Top bar: mode switcher is the most prominent control.
- Bottom: floor tabs (Ground / L1 / L2 / + Add), and when sim mode is on, a
  full-width timeline scrubber appears.

### 4.3 Floor plan upload & calibration

1. User clicks "Upload floor plan" → file input accepts JPG/PNG/PDF (PDF =
   convert first page to image via pdf.js).
2. Image resized client-side to max 4096px on long edge to keep localStorage
   manageable. Stored as data URL initially.
3. Calibration overlay appears: "Click two points on the plan and tell us the
   real distance between them." Two clicks → input modal → compute pixels/meter
   → save to `floor.scale`. Required before placing devices; show a banner if
   uncalibrated.

### 4.4 2D device placement

- Drag a card from the library → on `dragstart` set a payload; on canvas drop,
  read drop coords, snap to grid if Shift held, create device in store.
- Selected device shows handles: drag body to move, drag rotation handle to
  rotate, scroll-wheel adjusts mount height (with on-canvas tooltip).
- Right-click for context menu: duplicate, delete, send to back, send to front.
- Snap-to-wall: when dragging a wall-mounted device (reader, camera) within 0.5m
  of a wall segment, auto-orient perpendicular to it.

### 4.5 Wall drawing (2D)

- Wall tool in toolbar (`W` shortcut). Click to start, click to add segments,
  Escape to finish, Enter to close polygon.
- Walls render as 2D line segments with thickness.
- In 3D they become extruded boxes from floor to `floor.ceilingHeight`.

### 4.6 Coverage visualization (2D)

- **Cameras**: Konva.Wedge centered at device, rotated to its orientation,
  angle = `fovDegrees`, radius = `rangeMeters * floor.scale`. Translucent fill,
  blend-mode `screen` so overlaps brighten (already a poor-man's heatmap).
- **Sensors**: Konva.Circle with detection radius, dashed stroke.
- **Access points**: gradient radial circle for signal falloff.
- Toggle visibility per category in the library header (eye icon).

### 4.7 The 2D↔3D toggle

When the mode flips:

1. Camera-style transition: Framer Motion animates the top-bar pill, the canvas
   container does an opacity fade (200ms).
2. The R3F canvas mounts and constructs the scene from current `Floor` data:
   - **Floor mesh**: plane sized to floor-plan image bounds; texture = the
     plan image itself (top-down), or a clean architectural floor material in
     "clean view" mode (toggleable).
   - **Walls**: extruded boxes from `wall.start` to `wall.end`, height
     `wall.height`, thickness 0.2m.
   - **Devices**: GLTF models keyed by `device.type` and `cameraType`. v1
     ships with hand-modeled low-poly primitives (a cone + box for cameras, a
     small disc for sensors, etc.) — swap in real GLTFs later.
   - **Coverage**: camera frustum as a transparent cone mesh; sensor radius as
     a sphere; AP coverage as a soft glowing sphere.
3. Default camera position: orbital, looking down at 45°, framed to fit floor
   bounding box. `OrbitControls` from drei.

### 4.8 First-person walkthrough

- Mode switcher inside 3D view: **Orbit** (default) | **Walk** | **Camera POV**.
- Walk mode: `PointerLockControls` from drei. Click canvas → cursor locks,
  WASD moves, mouse rotates. Esc unlocks. Show a brief HUD on entry: "WASD to
  move • Shift to run • Space to jump • Esc to exit".
- Player is a capsule rigid body via Rapier, 1.7m tall, gravity on. Collides
  with walls and floor; gravity prevents floating.
- Floor switching while walking: stairs are out of scope for v1; user picks
  the floor from the bottom switcher and teleports.

**"Roblox but professional"** = clean PBR materials, soft shadows, no neon.
Reference: Twinmotion's free archviz feel, not Minecraft.

### 4.9 Camera POV (picture-in-picture)

- In Walk or Orbit mode, hovering over a camera device shows a "View from
  here" button.
- Click → a small inset (240×135px, top-right corner) renders a second R3F
  scene with a perspective camera placed at the device's position+rotation and
  FOV matching `camera.fovDegrees`.
- Stretch: a "monitoring wall" view — grid of all camera POVs at once,
  CCTV-style.

### 4.10 Simulation mode

The big one. Make it feel like Watch Dogs running on a Figma file.

**Path drawing**
- Switch to Sim mode (top bar). 2D view becomes the path editor.
- Click to drop waypoints; first click = actor start position. Path renders as
  a polyline with arrowheads.
- Configurable: walk speed (default 1.4 m/s), run speed (4 m/s), pause
  duration at each waypoint.

**Detection logic** (per frame, runs at 30Hz max)
For each camera C and the actor A:
1. Compute world position of A in 3D (assume actor height 1.7m).
2. Vector from C to A. Check if within `C.rangeMeters`.
3. Check angle to A is within `C.fovDegrees / 2` of C's facing direction.
4. Raycast through wall meshes — if blocked, no detection.
5. If all pass → detected this frame. Log `SimEvent` if state changed (was
   undetected, now detected).

For each sensor S:
1. Distance to A within `S.rangeMeters`?
2. LoS via raycast (motion sensors are blocked by walls; glass-break is not).
3. Trigger event on first crossing.

**Playback UI**
- Bottom timeline: scrubber + event markers colored by device type. Click an
  event to scrub to it. Spacebar play/pause. Number keys = speed (1 = 1x,
  2 = 2x, 4 = 4x).
- In 3D view, actor is a stylized humanoid (low-poly, no faces — keep it
  abstract so it doesn't feel like a video game character). Cameras visually
  pulse green when detecting, red ring around blind cameras during sim.

**After-action report**
On sim end, modal slides up:
- Total path duration
- Total "covered" time vs "blind" time (e.g. 84% covered)
- First detection latency from start
- Longest blind interval
- Per-camera detection time
- "Coverage gaps" list — segments of the path with zero detection
- Export as PDF or PNG

**Pre-built scenarios** (stretch feature, enabled in v1)
- Active shooter, main entrance → second floor
- After-hours break-in, rear window
- Fire evacuation — reverse the threat lens, are all exits covered by
  emergency notification devices?
- Each is a JSON file shipped with the app; user picks from a dropdown to
  pre-populate path + actor params.

### 4.11 Coverage heatmap

- Toggle in 3D view: "Coverage heatmap".
- Sample a grid of points across the floor (resolution adaptive: 0.5m on small
  floors, 1m on large). For each point at human height (1.7m):
  - Count how many cameras have LoS + within FOV + within range.
- Render as a textured plane just above the floor. Color: black (0 cameras),
  cool blue → green → bright green (3+). Brightness = redundancy.
- Computed in a Web Worker so we don't block the main thread.

### 4.12 AI auto-design (v1 = heuristic, v2 = LLM)

**v1 heuristic** (ship this):
- Detect floor plan corners using a simple algorithm (Harris corners on the
  plan image, or just use the drawn walls if present).
- For each interior corner, place a dome camera angled into the room.
- For each door (placed wall segments shorter than 1.2m, marked as doors),
  place a fixed camera on the wall opposite, facing the door.
- One-click button: "Suggest camera placement". Show as ghost devices the user
  can accept or reject individually.

**v2** (later): send floor-plan image + walls to Claude with vision. Get back
JSON of suggested placements with rationale. Show rationale as tooltips.

### 4.13 PDF export & BoM

`@react-pdf/renderer` template:
- Cover page: project name, floor plan thumbnail
- One page per floor: 2D rendering with all devices labeled
- Device list table: label, type, model, location (e.g. "Floor 1, NE corner")
- Bill of materials: model → quantity → unit price (manual, optional) →
  subtotal
- If simulation ran: include after-action summary

---

## 5. Build Order (Milestones)

Each milestone is a checkpoint: app still runs, deployed to Vercel preview,
feels like progress.

### M0 — Scaffold (½ day)
- `create-next-app`, TypeScript, Tailwind, ESLint
- shadcn/ui init, base components (Button, Dialog, Tooltip, Toast)
- File structure (see §7)
- Empty landing page with hero placeholder
- Vercel project linked, preview URL working
- ✅ **Exit:** `pnpm dev` works, push to main → Vercel deploys

### M1 — 2D editor core (1–2 days)
- Editor shell at `/design/[id]` with three-pane layout
- Zustand store + persistence
- Floor plan upload + display in Konva
- Scale calibration flow
- Cameras only: drag from library, place, select, move, rotate, delete
- Properties panel for cameras
- Save state to localStorage
- ✅ **Exit:** can design a single-floor camera layout end-to-end

### M2 — Full 2D feature set (1–2 days)
- All four device types in the library
- Wall drawing tool
- Coverage visualization (cone, circle, signal falloff)
- Multi-floor support
- Keyboard shortcuts
- Undo/redo
- ✅ **Exit:** full design fidelity in 2D; ready to render in 3D

### M3 — 3D scene (2–3 days)
- R3F canvas with OrbitControls
- Scene generation from store data: floor plane, walls, devices
- Camera frustum geometry for FOV cones in 3D
- 2D↔3D mode toggle with smooth transition
- Material/lighting pass — make it look good
- ✅ **Exit:** the headline screenshot demo

### M4 — First-person walkthrough (1–2 days)
- Walk mode with PointerLockControls + Rapier
- HUD overlay, mode switcher
- Camera POV picture-in-picture
- ✅ **Exit:** can walk through a building you designed

### M5 — Simulation (2–3 days)
- Path drawing
- Actor model + animation
- Detection logic (cameras + sensors)
- Timeline UI with scrubber + events
- After-action report modal
- Pre-built scenario templates
- ✅ **Exit:** the "show your board" moment

### M6 — Stretch features (1–2 days)
- Coverage heatmap (with Web Worker)
- AI auto-design (heuristic v1)
- More polished GLTF device models
- ✅ **Exit:** feature-complete v1

### M7 — Polish & launch (1 day)
- Landing page final pass with looping demo video
- Empty states, loading skeletons, error boundaries
- Toast notifications for all mutations
- Keyboard shortcut overlay (`?` key)
- PDF export + BoM
- README, screenshots
- Custom Vercel domain
- ✅ **Exit:** shippable

**Realistic total: ~12–18 focused days. Anyone telling you faster is lying.**

---

## 6. UI/UX Principles

We are competing with screenshot-laden, mid-2010s SaaS aesthetics. We win by
looking like a 2025 product.

### Visual language
- **Dark canvas, light chrome.** The drawing surface is dark slate; UI chrome
  (sidebars, top bar) is light or vice versa, but the contrast lets the work
  pop.
- **One accent color.** Emerald (`emerald-500`) for primary actions, success,
  detection-positive. Red (`rose-500`) sparingly for destructive and
  detection-negative. Everything else is `slate` shades.
- **Type:** Inter for UI, JetBrains Mono for measurements/coords. Variable
  weight, generous letter-spacing on small UI text.
- **Spacing:** 4/8/16/24 px rhythm. No magic numbers in CSS.
- **Borders are subtle.** `border-slate-800/50` on dark, `border-slate-200`
  on light. Never harsh.
- **Radius:** 8px default, 12px on cards, 16px on modals.
- **Shadows:** soft and large. `shadow-[0_8px_30px_rgba(0,0,0,0.12)]` not
  default Tailwind.

### Interaction
- **Everything keyboard-accessible.** Shortcut overlay via `?`. Tab order
  always sensible.
- **No modal popups for routine actions.** Use inline editing, side panels,
  contextual menus.
- **Motion is meaningful, never decorative.** Spring physics on the 2D↔3D
  toggle. 200ms ease for hover/focus. 0ms for state that should feel instant
  (selection).
- **Cursor changes telegraph affordance.** Grab cursor on draggable, crosshair
  on canvas, pointer on buttons.
- **Drag previews.** When dragging a device from the library, show a
  semi-transparent preview at cursor.

### Onboarding
- First-time visitor to `/design`: empty state with a 30-second guided tour
  (Floyd-style spotlight + tooltip steps). Skippable.
- Sample project loadable in one click ("Load demo office").
- Tooltips on every icon-only button until the user has used it once.

### Empty states
- Library category with no matching search: friendly illustration, "No
  matches. Try a different term."
- No devices placed: ghost card on the canvas with arrow pointing to library.
- No floor uploaded: large dropzone "Drag a floor plan here to start."

### Error handling
- Toast for non-blocking errors (failed PDF export, etc.).
- Inline error in modal for blocking errors (invalid scale calibration).
- Never show a stack trace. Always show what to do next.

---

## 7. File Structure

```
deeper-vision/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # landing
│   │   └── layout.tsx
│   ├── design/
│   │   ├── [id]/
│   │   │   ├── page.tsx          # editor shell
│   │   │   └── loading.tsx
│   │   └── new/route.ts          # creates new design, redirects
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── editor/
│   │   ├── EditorShell.tsx
│   │   ├── TopBar.tsx
│   │   ├── LibraryPanel.tsx
│   │   ├── PropertiesPanel.tsx
│   │   ├── FloorSwitcher.tsx
│   │   ├── ModeSwitcher.tsx
│   │   └── ShortcutOverlay.tsx
│   ├── canvas2d/
│   │   ├── Canvas2D.tsx
│   │   ├── FloorPlanLayer.tsx
│   │   ├── WallLayer.tsx
│   │   ├── DeviceLayer.tsx
│   │   ├── CoverageLayer.tsx
│   │   ├── CalibrationOverlay.tsx
│   │   └── tools/                # wall, select, rotate, etc.
│   ├── scene3d/
│   │   ├── Scene3D.tsx
│   │   ├── Floor.tsx
│   │   ├── Walls.tsx
│   │   ├── Device3D.tsx
│   │   ├── CameraFrustum.tsx
│   │   ├── WalkController.tsx
│   │   ├── PovInset.tsx
│   │   └── HeatmapLayer.tsx
│   ├── simulation/
│   │   ├── PathEditor.tsx
│   │   ├── Actor.tsx
│   │   ├── Timeline.tsx
│   │   ├── AfterActionReport.tsx
│   │   └── scenarios/            # JSON templates
│   ├── ui/                       # shadcn output lives here
│   └── marketing/
│       ├── Hero.tsx
│       └── FeatureGrid.tsx
├── lib/
│   ├── store.ts                  # Zustand
│   ├── geometry.ts               # vector math, FOV checks, raycasts
│   ├── detection.ts              # sim detection logic
│   ├── heatmap.worker.ts         # web worker for coverage sampling
│   ├── pdf.tsx                   # @react-pdf templates
│   └── persistence.ts            # localStorage + future server sync
├── public/
│   ├── models/                   # GLTFs
│   └── demo/                     # sample floor plans
├── types/
│   └── design.ts                 # all DesignDocument types
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── PLAN.md
```

---

## 8. Edge Cases & Things to Be Careful Of

### Data integrity
- **Lost work.** Persist Zustand store to localStorage on every mutation,
  debounced 300ms. Hydrate on mount. Add a Cmd+Z history of last 50 states.
- **localStorage size cap (~5MB).** Floor plan images are the offender.
  Compress to JPEG @ 0.85 quality, max 4096px, before storing. Show a warning
  if a design exceeds 4MB; offer cloud save (v2).
- **Orphan references.** If a device references a non-existent floor or
  wall, the load step should clean it up silently.

### 3D scene generation
- **No walls drawn yet.** Fall back to a bounding box matching floor-plan
  image dimensions. Show a hint: "Draw walls in 2D to see them here."
- **Walls that don't form a closed polygon.** That's fine — walls are
  extruded segments, not extruded surfaces. No need to require closure.
- **Devices placed in floor-image areas with no walls.** OK in 3D; they hover
  in space at their mount height. Floor mesh is always present.

### First-person controls
- **Pointer lock is disorienting.** Show a "Press Esc to exit" tooltip
  the first three times someone enters Walk mode.
- **Walking through walls.** Rapier collision is the answer. Test rigorously
  — TWP (thin walls problem) is real. Use 0.2m wall thickness minimum.
- **Falling off the floor.** Bound the floor with invisible walls 50m past
  any device or wall.
- **Mobile.** PointerLock doesn't exist on iOS Safari. Show a "Touch
  controls" overlay on mobile (virtual joystick) — but mobile is read-only in
  v1; designing on a phone is out of scope.

### Detection / simulation
- **Floating-point drift in raycast.** Use a small epsilon (0.01m) when
  comparing distances.
- **Camera "sees through" a thin wall.** Make sure raycasts use the actual
  wall meshes, not bounding boxes.
- **Actor at exact FOV boundary jitters between detected/lost.** Hysteresis:
  detect if angle < FOV/2 - 1°, lose if angle > FOV/2 + 1°.
- **Simulation FPS variance.** Run sim on a fixed timestep (e.g. 30Hz) and
  interpolate visuals; don't tie detection to render loop.

### Heatmap
- **Compute cost.** A 50m × 50m floor at 0.5m resolution = 10,000 samples ×
  N cameras × raycast each = potentially seconds. Always run in a Web Worker.
  Show a progress bar.
- **Stale heatmap.** Invalidate when any device or wall changes; debounce
  recompute by 500ms.

### Calibration
- **User skips calibration.** Block coverage visualization, but let them
  place devices. Show banner: "Set scale to enable coverage cones."
- **Bad calibration.** Sanity-check: pixels-per-meter must be in [5, 500].
  Anything outside, show "Are you sure?" confirmation.

### PDF export
- **Cross-origin floor plan images.** If using a remote URL, set `crossOrigin
  = "anonymous"` and load via fetch to base64 first. Otherwise canvas-tainted
  errors break PDF generation.
- **Large designs.** A 50-device, 5-floor PDF could be huge. Render
  thumbnails at canvas-size 1200px max, not native resolution.

### Browser compatibility
- **R3F + Rapier.** Requires WebGL2 + WASM. Detect and show a
  "Browser-not-supported" page for IE/old Edge.
- **Konva on Safari.** Specifically test pinch-zoom — Safari's gesture events
  fight with Konva's wheel handler.

### Accessibility
- **Canvas is invisible to screen readers.** Provide a parallel data
  table of "what's in this design" as an aria-hidden=false sibling. Not
  perfect, but a baseline.
- **Color is not the only signal.** Detection events also have an icon and
  text label, not just green/red.

### Performance gotchas
- **Re-rendering Konva on every state change.** Memoize device components,
  use Konva's `listening={false}` for non-interactive layers.
- **R3F scene rebuilds.** Don't recreate device meshes on every render — key
  them by `device.id` and let R3F reconcile.
- **Too many cameras with FOV cones.** Cap visible cones at 50; show only
  selected device's cone above that threshold.
- **localStorage sync.** Don't write on every keystroke in the properties
  panel; debounce.

---

## 9. What I'll Build First

Plan adopted, I start at **M0**. Concretely, the first session:

1. Initialize Next.js with TypeScript and Tailwind.
2. Install dependencies from §2.
3. Initialize shadcn/ui, add Button, Card, Dialog, Tooltip, Sonner (toasts).
4. Create the file structure from §7 (with placeholder components).
5. Build the landing page hero (no looping video yet; just the headline,
   subhead, and a button to `/design/new`).
6. Build the `/design/[id]` shell with the three-pane layout and the top bar.
7. Push to GitHub, link Vercel, confirm deploy works.

Then **M1** begins: floor plan upload, scale calibration, drag-drop cameras.

I will work milestone by milestone, deploying after each, and we look at the
preview together before moving on.

---

## 10. Open Questions / Decisions Deferred

- **Domain.** `deepervision.app`? `deeper.vision`? `deepervision.io`? Cheapest
  is probably `.app`. Skip until M7.
- **Logo.** Placeholder until we have something to look at.
- **Pricing / monetization.** Not in v1.
- **Multi-user collaboration.** v2.
- **Mobile editing.** v2. v1 is desktop-first, mobile read-only viewer at
  best.
- **GLTF models for devices.** Ship with primitives in v1; commission or
  source real models in v2.

---

**End of plan.** Ready to start at M0 whenever you give the word.
