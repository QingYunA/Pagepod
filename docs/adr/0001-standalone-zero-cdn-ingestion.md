# 0001. Standalone Zero-CDN Ingestion Standard

All catalog showcase projects uploaded to Pagepod must be 100% self-contained single-file HTML documents with inlined CSS, JavaScript, and SVG assets, strictly prohibiting external third-party CDN script tags (`unpkg`, `cdnjs`, etc.). 

This architectural constraint guarantees instant preview bootstrapping in `HoverSandboxPreview` and full-screen runner `/p/[slug]`, prevents runtime iframe crashes caused by firewall/network blocks or CDN deprecations, and eliminates latency jitter across cross-border hosting environments.
