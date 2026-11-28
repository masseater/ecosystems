import { Option, Result } from "effect";
import { expect, it } from "vite-plus/test";

import { branchLinkReference, describeReference, parseReference } from "./reference.ts";

const written = (destination: string): string =>
  Result.match(parseReference(destination), {
    onFailure: (message) => `error: ${message}`,
    onSuccess: describeReference,
  });

it("parseReference reads a repository, a path and a symbol", () => {
  expect(written("github:masseater/ecosystems")).toBe("github:masseater/ecosystems");
  expect(written("github:masseater/ecosystems/libs/msch")).toBe(
    "github:masseater/ecosystems/libs/msch",
  );
  expect(written("github:masseater/ecosystems/libs/msch/src/app/runtime.ts#runCli")).toBe(
    "github:masseater/ecosystems/libs/msch/src/app/runtime.ts#runCli",
  );
  expect(written("github:owner/repo/src/a.rs#Config.validate")).toBe(
    "github:owner/repo/src/a.rs#Config.validate",
  );
});

it("parseReference keeps the parts apart", () => {
  const parsed = parseReference("github:owner/repo/dir/file.ts#name");
  expect(Result.getSuccess(parsed)).toStrictEqual(
    Option.some({
      kind: "github",
      owner: "owner",
      repo: "repo",
      path: "dir/file.ts",
      symbol: Option.some("name"),
      ref: Option.none(),
    }),
  );
});

it("parseReference reads an npm package", () => {
  expect(written("npm:effect")).toBe("npm:effect");
  expect(written("npm:@r_masseater/msch")).toBe("npm:@r_masseater/msch");
});

it("parseReference rejects a path that cannot name a file", () => {
  expect(written("github:owner/repo/dir/")).toContain("trailing slash");
  expect(written("github:owner/repo/a//b")).toContain("empty");
  expect(written("github:owner/repo/../b")).toContain("`..`");
});

it("parseReference rejects a line number and a name that is not a declaration", () => {
  expect(written("github:owner/repo/a.ts#L10")).toContain("line number");
  expect(written("github:owner/repo/a.ts#L10-L20")).toContain("line number");
  expect(written("github:owner/repo/a.ts#1abc")).toContain("not a declared name");
  expect(written("github:owner/repo/a.ts#a-b")).toContain("not a declared name");
});

it("parseReference rejects a symbol without a file", () => {
  expect(written("github:owner/repo#Config")).toContain("needs the file");
});

it("parseReference rejects what is not an owner and repository or a package", () => {
  expect(written("github:owner")).toContain("not a repository path");
  expect(written("npm:Not A Package")).toContain("not a package name");
});

const described = (destination: string): Option.Option<string> =>
  Option.map(branchLinkReference(destination), describeReference);

it("branchLinkReference reads a link to a branch and ignores a commit", () => {
  expect(described("https://github.com/o/r/blob/dev/src/a.ts#L10")).toStrictEqual(
    Option.some("github:o/r/src/a.ts on dev"),
  );
  expect(described("https://github.com/o/r/tree/main/libs/msch")).toStrictEqual(
    Option.some("github:o/r/libs/msch on main"),
  );
  expect(described("https://github.com/o/r/tree/main")).toStrictEqual(
    Option.some("github:o/r on main"),
  );
  expect(
    described("https://github.com/o/r/blob/5dbbf4abd9b3a5b1a74bc30c89ca7bd6712bd929/a.ts"),
  ).toStrictEqual(Option.none());
  expect(described("https://github.com/o/r/pull/12")).toStrictEqual(Option.none());
});
