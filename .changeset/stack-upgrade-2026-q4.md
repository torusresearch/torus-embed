---
"@toruslabs/torus-embed": major
---

Move to the 2026 Q4 stack.

- `engines` now require Node `>=24.22.0` and npm `>=12`.
- The `types` entry moves from `dist/lib.cjs/types/index.d.ts` to `dist/lib.cjs/index.d.ts`.
- `@web3auth/ws-embed` is raised to `^6.1.0`.
- The build now uses Vite+ (`vp pack`). The ESM and CJS output no longer imports `@babel/runtime`.
- `dist/torus.umd.min.js` is built again, so the `unpkg` and `jsdelivr` entries resolve. It bundles `@web3auth/ws-embed` and exposes the `Torus` global.
