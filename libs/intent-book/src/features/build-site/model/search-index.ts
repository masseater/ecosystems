import { Effect, Schema, String as Str } from "effect";

import type { SiteFile } from "#/shared/lib/site-file.ts";

import { INDEX_PATH } from "./asset-paths.ts";

const SearchEntry = Schema.Struct({
  title: Schema.String,
  name: Schema.String,
  book: Schema.String,
  url: Schema.String,
  text: Schema.String,
});

export type SearchEntryData = typeof SearchEntry.Type;

const SEARCH_TEXT_START = 0;
const SEARCH_TEXT_LIMIT = 6000;

const encodeEntries = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(SearchEntry)));

export const searchText = (input: { readonly lead: string; readonly body: string }): string =>
  Str.slice(SEARCH_TEXT_START, SEARCH_TEXT_LIMIT)(`${input.lead} ${input.body}`);

export const searchIndexFile = (
  entries: readonly SearchEntryData[],
): Effect.Effect<SiteFile, Schema.SchemaError> =>
  Effect.map(encodeEntries(entries), (content) => ({ path: INDEX_PATH, content }));
