export const PAGE_STYLES = String.raw`.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 3rem;
}

.pager a {
  display: block;
  padding: 0.7rem 1rem;
  border: 1px solid var(--line);
  border-radius: 0.5rem;
  text-decoration: none;
  color: var(--ink);
}

.pager a:hover {
  border-color: var(--accent);
}

.pager small {
  display: block;
  color: var(--ink-soft);
}

.pager .next {
  grid-column: 2;
  text-align: right;
}

.rows {
  margin: 0.5rem 0 1.5rem;
  padding: 0;
  list-style: none;
}

.rows a {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
}

.rows a:hover .name {
  text-decoration: underline;
}

.rows .name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.rows .desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 0.92rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.overview h2 {
  margin: 2rem 0 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.toc {
  padding: 2rem 1rem 3rem 0.5rem;
}

.toc h2 {
  margin: 0 0 0.6rem;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.toc ul {
  border-left: 1px solid var(--line);
}

.toc a {
  display: block;
  padding: 0.18rem 0 0.18rem 0.8rem;
  margin-left: -1px;
  border-left: 2px solid transparent;
  color: var(--ink-soft);
  text-decoration: none;
}

.toc .depth-3 a {
  padding-left: 1.6rem;
}

.toc a:hover {
  color: var(--ink);
}

.toc a[aria-current="true"] {
  border-left-color: var(--accent);
  color: var(--ink);
  font-weight: 600;
}

dialog.search {
  width: min(36rem, calc(100vw - 2rem));
  margin-top: 10vh;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background: var(--bg);
  color: var(--ink);
}

dialog.search::backdrop {
  background: rgb(0 0 0 / 0.35);
}

.search input {
  width: 100%;
  padding: 0.9rem 1.1rem;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
}

.search ul {
  max-height: 55vh;
  margin: 0;
  padding: 0.4rem;
  overflow-y: auto;
  list-style: none;
}

.search li a {
  display: block;
  padding: 0.55rem 0.7rem;
  border-radius: 0.4rem;
  color: var(--ink);
  text-decoration: none;
}

.search li a:hover,
.search li a[data-active] {
  background: var(--accent-soft);
}

.search li small {
  display: block;
  color: var(--ink-soft);
}

.search .empty {
  padding: 0.9rem 1.1rem;
  color: var(--ink-soft);
}

@media (max-width: 1180px) {
  .shell,
  body[data-nav="closed"] .shell {
    grid-template-columns: var(--sidebar) minmax(0, 1fr);
  }

  body[data-nav="closed"] .shell {
    grid-template-columns: 0 minmax(0, 1fr);
  }

  .toc {
    display: none;
  }
}

@media (max-width: 820px) {
  .shell,
  body[data-nav="closed"] .shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .side {
    position: fixed;
    inset: var(--top) 0 0 0;
    z-index: 15;
    width: min(20rem, 88vw);
    max-height: none;
    background: var(--bg);
    transform: translateX(-100%);
    transition: transform 0.15s;
  }

  body[data-nav="open"] .side {
    transform: none;
  }

  body[data-nav="closed"] .side {
    visibility: visible;
    padding: 1.25rem 0.75rem 3rem 1rem;
    border-right: 1px solid var(--line);
  }

  main {
    padding: 1.5rem 1rem 4rem;
  }

  h1 {
    font-size: 1.8rem;
  }

  .search-open {
    min-width: 0;
  }

  .search-open span {
    display: none;
  }

  .rows a {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
}
`;
