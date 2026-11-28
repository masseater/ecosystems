import { Array as Arr, Function as Fn, Option, pipe, Record as Rec, String as Str } from "effect";

import { routeOf } from "#/entities/book/index.ts";
import type { Book, Skill } from "#/entities/book/index.ts";
import type { LinkResolver } from "#/shared/lib/render-markdown.ts";

type Target = readonly [string, string];

const LEADING_SLASH = /^\//u;
const ORIGIN = "https://intent-book.invalid/";
const SKILLS_ROOT = "skills/";
const GITHUB = "https://github.com/";
const SKILL_FILE = "SKILL.md";

export const withBase =
  (base: string) =>
  (route: string): string =>
    `${base}${Str.replace(LEADING_SLASH, "")(route)}`;

export const fileOf = (route: string): string => Str.replace(LEADING_SLASH, "")(route);

export const sourcePath = (skill: Skill): string => `${skill.name}/${SKILL_FILE}`;

export const referencePath = (input: { readonly skill: Skill; readonly file: string }): string =>
  `${input.skill.name}/${input.file}`;

const targetsOf =
  (slug: string, base: string) =>
  (skill: Skill): readonly Target[] => {
    const own: Target = [
      sourcePath(skill),
      withBase(base)(routeOf(slug, { kind: "skill", name: skill.name })),
    ];
    const referenced = pipe(
      skill.references,
      Arr.map((reference): Target => [
        referencePath({ skill, file: reference.file }),
        withBase(base)(
          routeOf(slug, { kind: "reference", name: skill.name, file: reference.file }),
        ),
      ]),
    );
    return Arr.prepend(referenced, own);
  };

const pageTarget = (targets: Readonly<Record<string, string>>, url: URL): Option.Option<string> =>
  pipe(
    fileOf(url.pathname),
    Option.liftPredicate(Str.startsWith(SKILLS_ROOT)),
    Option.map(Str.slice(SKILLS_ROOT.length)),
    Option.flatMap((file) => Rec.get(targets, file)),
    Option.map((target) => `${target}${url.hash}`),
  );

const repositoryFile = (book: Book, url: URL): Option.Option<string> =>
  pipe(
    book.repository,
    Option.filter(Str.startsWith(GITHUB)),
    Option.map((repository) => {
      const directory = pipe(
        book.directory,
        Option.map((value) => `/${value}`),
        Option.getOrElse(Fn.constant("")),
      );
      return `${repository}/blob/HEAD${directory}${url.pathname}${url.hash}`;
    }),
  );

const resolveAgainst =
  (input: { readonly book: Book; readonly targets: Readonly<Record<string, string>> }) =>
  (document: string): LinkResolver =>
  (href) =>
    pipe(
      Option.liftThrowable(() => new URL(href, `${ORIGIN}${SKILLS_ROOT}${document}`))(),
      Option.flatMap((url) =>
        pipe(
          pageTarget(input.targets, url),
          Option.orElse(() => repositoryFile(input.book, url)),
        ),
      ),
    );

export const linkResolver = (input: {
  readonly slug: string;
  readonly book: Book;
  readonly base: string;
}): ((document: string) => LinkResolver) => {
  const targets = pipe(
    input.book.skills,
    Arr.flatMap(targetsOf(input.slug, input.base)),
    Rec.fromEntries,
  );
  return resolveAgainst({ book: input.book, targets });
};
