# @r_masseater/node-main

This workspace runs Effect programs as Node.js entry points. It provides the Node services, an HTTP client and OTLP tracing, and stops a child program when its parent process exits.

- Assume Node.js 26 or later and Effect 4. Add no branches for other runtimes.
- Keep `effect` a peer dependency so the program and this package share one copy of Effect.
