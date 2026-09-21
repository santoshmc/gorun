- website
- Client side only
- Typescript
- Bento grid layout — flat, no hero card 
- Neo-brutalism styling — 2px borders + hard offset box-shadows in the accent color (no blur), rounded corners to soften it per "soft" neo-brutalism
- Palette — Playful style, Pastel colors, three pastel accents (salmon, periwinkle, yellow) plus later additions (green, cyan, lavender, coral, pink) when the activity-type icons needed more colors than three
- Typography — bold, uppercase, system sans-serif (I dropped the original Space Grotesk/Google Fonts plan for the installable version so the whole app stays offline-capable with zero external requests)
- Icons — hand-written inline SVGs rather than a library, again to keep the file fully self-contained for the PWA install 
- Animations
- Sounds for user actions and system reactions
Use only vanilla HTML, CSS, and JavaScript — no frameworks, no TypeScript, no JSX.
Never use npm, package.json, bundlers (Vite, Webpack, Parcel), or any tool that requires Node.js.
Never suggest npm install or terminal commands that assume Node is present.
Write JavaScript that runs directly in the browser via <script> tags. Do not use ES module import/export of npm packages. If splitting JS into multiple files, either use plain <script> tags in order, or note that native ES modules (type="module") require the page to be served over http:// and won't work from a file:// path.
Avoid anything that requires a local server or backend (no fetch to a localhost API, no .env, no server-side code). If data is needed, use hardcoded JS objects/arrays or localStorage.
If a third-party library is genuinely needed, load it from a CDN via a <script> tag rather than installing it.
Keep the project structure flat and simple: index.html, style.css, script.js.
Prefer modern browser-native APIs (the DOM, fetch for public APIs, localStorage, CSS Grid/Flexbox) over libraries.