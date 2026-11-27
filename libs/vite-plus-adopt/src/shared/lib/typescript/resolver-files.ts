import { Array as Arr, Option, String as Str, pipe, Function as Fn } from "effect";

import {
  Extension,
  isDeclarationFileName,
  isTSFileExtensionForPackageField,
  removeFileExtension,
  tryExtractTSExtension,
} from "./extensions.ts";
import type { ExtensionKind } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { getBaseFileName, getDirectoryPath } from "./paths.ts";
import type { CandidateRequest, PathAndExtension, ResolutionState } from "./resolution-types.ts";

const DATA_FIRST_ARITY = 2;
const DATA_FIRST_ARITY_3 = 3;

interface ExtensionAttempt {
  readonly kind: ExtensionKind;
  readonly extension: string;
  readonly usingTsExtension: boolean;
}

const attempt = (
  kind: ExtensionKind,
  extension: string,
  usingTsExtension = false,
): ExtensionAttempt => ({
  kind,
  extension,
  usingTsExtension,
});

type Listed = readonly [ExtensionKind, string];

const family =
  (typed: readonly string[], listed: readonly Listed[], plain: readonly Listed[]) =>
  (original: string): readonly ExtensionAttempt[] => {
    const explicit = typed.includes(original);
    return [
      ...pipe(
        listed,
        Arr.map(([kind, extension]) => attempt(kind, extension, explicit)),
      ),
      ...pipe(
        plain,
        Arr.map(([kind, extension]) => attempt(kind, extension)),
      ),
    ];
  };

const esmAttempts = family(
  [Extension.Mts, Extension.Dmts],
  [
    ["TypeScript", Extension.Mts],
    ["Declaration", Extension.Dmts],
  ],
  [["JavaScript", Extension.Mjs]],
);

const cjsAttempts = family(
  [Extension.Cts, Extension.Dcts],
  [
    ["TypeScript", Extension.Cts],
    ["Declaration", Extension.Dcts],
  ],
  [["JavaScript", Extension.Cjs]],
);

const jsonAttempts = (): readonly ExtensionAttempt[] => [
  attempt("Declaration", ".d.json.ts"),
  attempt("Json", Extension.Json),
];

const jsxAttempts = family(
  [Extension.Tsx],
  [
    ["TypeScript", Extension.Tsx],
    ["TypeScript", Extension.Ts],
    ["Declaration", Extension.Dts],
  ],
  [
    ["JavaScript", Extension.Jsx],
    ["JavaScript", Extension.Js],
  ],
);

const defaultAttempts = family(
  [Extension.Ts, Extension.Dts],
  [
    ["TypeScript", Extension.Ts],
    ["TypeScript", Extension.Tsx],
    ["Declaration", Extension.Dts],
  ],
  [
    ["JavaScript", Extension.Js],
    ["JavaScript", Extension.Jsx],
  ],
);

const arbitraryAttempts = (candidate: string, original: string): readonly ExtensionAttempt[] =>
  Option.liftPredicate(`${candidate}${original}`, (path) => !isDeclarationFileName(path)).pipe(
    Option.match({
      onNone: (): readonly ExtensionAttempt[] => [],
      onSome: () => [attempt("Declaration", `.d${original}.ts`)],
    }),
  );

const ATTEMPTS_BY_EXTENSION: Readonly<
  Record<string, (original: string) => readonly ExtensionAttempt[]>
> = {
  [Extension.Mjs]: esmAttempts,
  [Extension.Mts]: esmAttempts,
  [Extension.Dmts]: esmAttempts,
  [Extension.Cjs]: cjsAttempts,
  [Extension.Cts]: cjsAttempts,
  [Extension.Dcts]: cjsAttempts,
  [Extension.Json]: jsonAttempts,
  [Extension.Tsx]: jsxAttempts,
  [Extension.Jsx]: jsxAttempts,
  [Extension.Ts]: defaultAttempts,
  [Extension.Dts]: defaultAttempts,
  [Extension.Js]: defaultAttempts,
  "": defaultAttempts,
};

const attemptsFor = (candidate: string, original: string): readonly ExtensionAttempt[] =>
  Option.fromNullishOr(ATTEMPTS_BY_EXTENSION[original]).pipe(
    Option.match({
      onNone: () => arbitraryAttempts(candidate, original),
      onSome: (attempts) => attempts(original),
    }),
  );

const NONE = 0;

export const tryFile: {
  (
    onlyRecordFailures: boolean,
    state: ResolutionState,
  ): (fileName: string) => Option.Option<string>;
  (fileName: string, onlyRecordFailures: boolean, state: ResolutionState): Option.Option<string>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    fileName: string,
    onlyRecordFailures: boolean,
    state: ResolutionState,
  ): Option.Option<string> => {
    if (onlyRecordFailures) {
      return Option.none();
    }
    if (state.host.fileExists(fileName)) {
      traceMessage(state, Messages.fileExistsUseIt, fileName);
      return Option.some(fileName);
    }
    traceMessage(state, Messages.fileDoesNotExist, fileName);
    return Option.none();
  },
);

const directoryProbablyMissing = (candidate: string, state: ResolutionState): boolean => {
  const directory = getDirectoryPath(candidate);
  return directory.length > NONE && !state.host.directoryExists(directory);
};

interface ExtensionRequest extends CandidateRequest {
  readonly originalExtension: string;
}

const tryAttempt = (
  candidate: string,
  { extension, usingTsExtension }: ExtensionAttempt,
  state: ResolutionState,
): Option.Option<PathAndExtension> =>
  tryFile(`${candidate}${extension}`, false, state).pipe(
    Option.map((path) => ({
      path,
      extension,
      resolvedUsingTsExtension: !state.candidateIsFromPackageJsonField && usingTsExtension,
    })),
  );

const tryAddingExtensions = (
  request: ExtensionRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  if (request.onlyRecordFailures || directoryProbablyMissing(request.candidate, state)) {
    return Option.none();
  }
  const attempts = pipe(
    attemptsFor(request.candidate, request.originalExtension),
    Arr.filter(({ kind }) => request.extensions.includes(kind)),
  );
  return Arr.findFirst(attempts, (current) => tryAttempt(request.candidate, current, state));
};

const resolveBySwappingExtensionWithTrace = (
  request: CandidateRequest,
  state: ResolutionState,
): Option.Option<PathAndExtension> => {
  const { candidate } = request;
  if (!Str.includes(".")(getBaseFileName(candidate))) {
    return Option.none();
  }
  const removed = removeFileExtension(candidate);
  const extensionless = Option.liftPredicate(removed, (path) => path !== candidate).pipe(
    Option.getOrElse(() =>
      Option.match(Str.lastIndexOf(".")(candidate), {
        onNone: () => candidate,
        onSome: (dot) => Str.slice(NONE, dot)(candidate),
      }),
    ),
  );
  const extension = Str.slice(extensionless.length)(candidate);
  traceMessage(state, Messages.fileHasExtensionStripping, candidate, extension);
  return tryAddingExtensions(
    { ...request, candidate: extensionless, originalExtension: extension },
    state,
  );
};

export const loadModuleFromFile: {
  (state: ResolutionState): (request: CandidateRequest) => Option.Option<PathAndExtension>;
  (request: CandidateRequest, state: ResolutionState): Option.Option<PathAndExtension>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (request: CandidateRequest, state: ResolutionState): Option.Option<PathAndExtension> =>
    resolveBySwappingExtensionWithTrace(request, state).pipe(
      Option.orElse(() =>
        Option.liftPredicate(state, ({ features }) => !features.esmMode).pipe(
          Option.flatMap(() => tryAddingExtensions({ ...request, originalExtension: "" }, state)),
        ),
      ),
    ),
);

export const loadFileNameFromPackageJsonField: {
  (state: ResolutionState): (request: CandidateRequest) => Option.Option<PathAndExtension>;
  (request: CandidateRequest, state: ResolutionState): Option.Option<PathAndExtension>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (request: CandidateRequest, state: ResolutionState): Option.Option<PathAndExtension> => {
    const { candidate } = request;
    if (!isTSFileExtensionForPackageField(request.extensions, candidate)) {
      return resolveBySwappingExtensionWithTrace(request, state);
    }
    return tryFile(candidate, request.onlyRecordFailures, state).pipe(
      Option.map(() => ({
        path: candidate,
        extension: Option.getOrElse(tryExtractTSExtension(candidate), () => ""),
        resolvedUsingTsExtension: false,
      })),
    );
  },
);
