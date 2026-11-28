import type { Option } from "effect/Option";
import {
  Record as RecordSchema,
  String as StringSchema,
  Unknown,
  decodeOption,
  fromJsonString,
  is,
} from "effect/Schema";

export const isRecord = is(RecordSchema(StringSchema, Unknown));

export const parseJson = (text: string): Option<unknown> =>
  decodeOption(fromJsonString(Unknown))(text);
