export const SCRIPT = String.raw`const root = document.documentElement;
const body = document.body;
const narrow = window.matchMedia("(max-width: 820px)");

const remember = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const recall = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const savedTheme = recall("intent-book-theme");
if (savedTheme) {
  root.dataset.theme = savedTheme;
}

if (recall("intent-book-nav") === "closed" && !narrow.matches) {
  body.dataset.nav = "closed";
}

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
  const dark =
    root.dataset.theme === "dark" ||
    (root.dataset.theme === undefined && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  remember("intent-book-theme", root.dataset.theme);
});

document.querySelector("[data-nav-toggle]")?.addEventListener("click", () => {
  if (narrow.matches) {
    body.dataset.nav = body.dataset.nav === "open" ? "" : "open";
    return;
  }
  body.dataset.nav = body.dataset.nav === "closed" ? "" : "closed";
  remember("intent-book-nav", body.dataset.nav);
});

const headings = [...document.querySelectorAll(".prose :is(h2, h3)[id]")];
const links = new Map(
  [...document.querySelectorAll(".toc a")].map((link) => [link.getAttribute("href").slice(1), link]),
);
if (headings.length > 0 && links.size > 0) {
  const mark = () => {
    const passed = headings.filter((heading) => heading.getBoundingClientRect().top < 120);
    const current = passed.at(-1) ?? headings[0];
    for (const [id, link] of links) {
      if (id === current.id) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  };
  window.addEventListener("scroll", mark, { passive: true });
  mark();
}

const dialog = document.querySelector("dialog.search");
if (dialog) {
  const input = dialog.querySelector("input");
  const list = dialog.querySelector("ul");
  const base = document.querySelector("meta[name='intent-book-base']").content;
  let index;

  const load = async () => {
    if (!index) {
      index = await (await fetch(base + "assets/search.json")).json();
    }
    return index;
  };

  const show = (entries) => {
    list.replaceChildren(
      ...entries.map((entry) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = entry.url;
        link.textContent = entry.title;
        const detail = document.createElement("small");
        detail.textContent = entry.book + " · " + entry.name;
        link.append(detail);
        item.append(link);
        return item;
      }),
    );
    if (entries.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = input.value ? "No matches" : "";
      list.append(empty);
    }
  };

  const search = async () => {
    const words = input.value.toLowerCase().split(/\s+/u).filter(Boolean);
    const entries = await load();
    if (words.length === 0) {
      show([]);
      return;
    }
    const scored = entries
      .map((entry) => {
        const haystack = entry.text.toLowerCase();
        const title = (entry.title + " " + entry.name).toLowerCase();
        if (!words.every((word) => haystack.includes(word))) {
          return undefined;
        }
        return { entry, score: words.filter((word) => title.includes(word)).length };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score);
    show(scored.slice(0, 30).map((match) => match.entry));
  };

  const open = () => {
    dialog.showModal();
    input.focus();
    input.select();
  };

  document.querySelector("[data-search-open]")?.addEventListener("click", open);
  input.addEventListener("input", search);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      list.querySelector("a")?.click();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open();
    }
  });
}
`;
