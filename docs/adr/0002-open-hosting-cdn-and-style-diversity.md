# 0002. Open Hosting, Permissive CDN Inclusion, and Aesthetic Sovereignty

**Status**: Accepted (Supersedes ADR 0001)

## Context
ADR 0001 previously mandated that all catalog projects must be standalone single-file documents with zero external CDN dependencies and aligned with the host's Zinc dark-mode aesthetic. 

This conflicted with Pagepod's fundamental identity: Pagepod is an **open Web application hosting and showcase platform**, not a monolithic UI component library. Real-world user applications and community open-source projects are diverse in visual styling (retro, skeuomorphic, colorful, editorial, academic) and routinely rely on standard external CDN resources (Google Fonts, Three.js, KaTeX, FontAwesome, etc.).

## Decision
1. **Aesthetic Sovereignty**: Hosted guest applications have complete visual independence. They are not constrained to the host platform's Zinc/monochrome design language.
2. **Permissive CDN & Framework Support**: External CDNs are fully supported. The host platform's CSP response headers and sandboxed iframes ensure that guest code runs in an isolated context without access to the host's parent cookies, sessions, or storage.
3. **Automated Serverless Screenshot Lifecycle**: Automated poster generation must be resilient and asynchronous post-commit, decoupling client upload experience from headless rendering overhead and supporting arbitrary complex HTML5/Canvas/WebGL applications.
