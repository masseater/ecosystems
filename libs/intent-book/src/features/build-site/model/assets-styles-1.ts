export const BASE_STYLES = String.raw`:root {
  --bg: #ffffff;
  --bg-soft: #f7f7f5;
  --ink: #1b1d1f;
  --ink-soft: #5c6166;
  --line: #e4e4e0;
  --accent: #0b6b5d;
  --accent-soft: #e3f1ee;
  --critical: #b42318;
  --high: #b54708;
  --code-bg: #f6f6f3;
  --sidebar: 17rem;
  --toc: 14.5rem;
  --measure: 46rem;
  --top: 3.5rem;
  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #15171a;
  --bg-soft: #1b1e22;
  --ink: #e8e9ea;
  --ink-soft: #a0a5ab;
  --line: #2c3036;
  --accent: #4fc3ae;
  --accent-soft: #1d2f2c;
  --critical: #ff8a80;
  --high: #f5b361;
  --code-bg: #1b1e22;
  color-scheme: dark;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #15171a;
    --bg-soft: #1b1e22;
    --ink: #e8e9ea;
    --ink-soft: #a0a5ab;
    --line: #2c3036;
    --accent: #4fc3ae;
    --accent-soft: #1d2f2c;
    --critical: #ff8a80;
    --high: #f5b361;
    --code-bg: #1b1e22;
    color-scheme: dark;
  }
}

* {
  box-sizing: border-box;
}

html {
  scroll-padding-top: calc(var(--top) + 1rem);
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 16px/1.7 system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--accent);
  text-underline-offset: 0.18em;
}

button {
  font: inherit;
  color: inherit;
}

.top {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: var(--top);
  padding: 0 1rem;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}

.brand {
  font-weight: 650;
  color: var(--ink);
  text-decoration: none;
}

.brand small {
  margin-left: 0.5rem;
  font-weight: 400;
  color: var(--ink-soft);
}

.top .grow {
  flex: 1;
}

.icon-button,
.search-open {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  background: var(--bg);
  cursor: pointer;
}

.icon-button:hover,
.search-open:hover {
  background: var(--bg-soft);
}

.search-open {
  min-width: 15rem;
  color: var(--ink-soft);
  justify-content: space-between;
}

.search-open kbd {
  font: 0.75rem ui-monospace, monospace;
  padding: 0.05rem 0.4rem;
  border: 1px solid var(--line);
  border-radius: 0.3rem;
}

.shell {
  display: grid;
  grid-template-columns: var(--sidebar) minmax(0, 1fr) var(--toc);
  min-height: calc(100vh - var(--top));
}

body[data-nav="closed"] .shell {
  grid-template-columns: 0 minmax(0, 1fr) var(--toc);
}

body[data-nav="closed"] .side {
  visibility: hidden;
  padding: 0;
  border: 0;
}

.side,
.toc {
  position: sticky;
  top: var(--top);
  align-self: start;
  max-height: calc(100vh - var(--top));
  overflow-y: auto;
  font-size: 0.9rem;
}

.side {
  padding: 1.25rem 0.75rem 3rem 1rem;
  border-right: 1px solid var(--line);
}

.side ul,
.toc ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.side a {
  display: block;
  padding: 0.28rem 0.6rem;
  border-radius: 0.4rem;
  color: var(--ink-soft);
  text-decoration: none;
}

.side a:hover {
  background: var(--bg-soft);
  color: var(--ink);
}

.side a[aria-current="page"] {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.side details > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  list-style: none;
}

.side details > summary > a {
  flex: 1;
}

.side details > summary::-webkit-details-marker {
  display: none;
}

.side .group > summary {
  margin-top: 0.9rem;
  padding: 0.25rem 0.6rem;
  color: var(--ink-soft);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.side summary::after {
  content: "";
  flex: none;
  width: 0.4rem;
  height: 0.4rem;
  margin: 0 0.6rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.12s;
}
`;
