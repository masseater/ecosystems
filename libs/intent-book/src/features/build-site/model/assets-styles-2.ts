export const COMPONENT_STYLES = String.raw`.side details[open] > summary::after {
  transform: rotate(45deg);
}

.side .children {
  margin-left: 0.9rem;
  border-left: 1px solid var(--line);
}

.side .book-switch > summary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  font-weight: 600;
}

.side .book-switch ul {
  margin: 0.25rem 0 0.5rem;
}

.side .book-switch summary strong {
  margin-right: auto;
  overflow-wrap: anywhere;
}

main {
  min-width: 0;
  padding: 2rem 2.5rem 5rem;
}

article {
  max-width: var(--measure);
  margin: 0 auto;
}

.crumbs {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.crumbs a {
  color: inherit;
}

h1 {
  margin: 0 0 0.4rem;
  font-size: 2.25rem;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.lead {
  margin: 0 0 1rem;
  font-size: 1rem;
  line-height: 1.65;
  color: var(--ink-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1.25rem;
}

.chips span,
.chips a {
  display: inline-block;
  padding: 0.05rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--ink-soft);
  text-decoration: none;
}

.chips a:hover {
  background: var(--bg-soft);
}

.need {
  margin: 0 0 1.75rem;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--accent);
  background: var(--bg-soft);
  border-radius: 0 0.4rem 0.4rem 0;
  font-size: 0.92rem;
}

.need strong {
  display: block;
  margin-bottom: 0.15rem;
}

.need span + span::before {
  content: "·";
  margin: 0 0.5rem;
  color: var(--ink-soft);
}

.prose h2 {
  margin: 2.5rem 0 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
  font-size: 1.5rem;
  line-height: 1.3;
}

.prose h3 {
  margin: 1.75rem 0 0.5rem;
  font-size: 1.15rem;
}

.prose h3[data-severity] {
  padding-left: 0.75rem;
  border-left: 3px solid var(--line);
}

.prose h3[data-severity="critical"] {
  border-color: var(--critical);
}

.prose h3[data-severity="high"] {
  border-color: var(--high);
}

.prose :is(h2, h3, h4) > a {
  color: inherit;
  text-decoration: none;
}

.prose p,
.prose ul,
.prose ol {
  margin: 0.85rem 0;
}

.prose code {
  padding: 0.1rem 0.3rem;
  border-radius: 0.3rem;
  background: var(--code-bg);
  font: 0.88em ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}

.prose pre {
  margin: 1.1rem 0;
  padding: 0.9rem 1.1rem;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  background: var(--code-bg);
  font-size: 0.86rem;
  line-height: 1.6;
}

.prose pre code {
  padding: 0;
  background: none;
  font-size: inherit;
}

.shiki,
.shiki span {
  color: var(--shiki-light);
}

:root[data-theme="dark"] .shiki,
:root[data-theme="dark"] .shiki span {
  color: var(--shiki-dark);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .shiki,
  :root:not([data-theme="light"]) .shiki span {
    color: var(--shiki-dark);
  }
}

.shiki {
  background: transparent !important;
}

.prose table {
  width: 100%;
  margin: 1.1rem 0;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.prose th,
.prose td {
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--line);
  text-align: left;
}

.prose th {
  background: var(--bg-soft);
}

.prose blockquote {
  margin: 1rem 0;
  padding: 0.1rem 1rem;
  border-left: 3px solid var(--line);
  color: var(--ink-soft);
}

.sources {
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
  font-size: 0.9rem;
}

.sources h2 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.sources ul {
  margin: 0;
  padding-left: 1.1rem;
}

.sources code {
  font: 0.85em ui-monospace, monospace;
}
`;
