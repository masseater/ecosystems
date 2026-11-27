import { Array as Arr } from "effect";

import type { Layers } from "./types.ts";

const listed =
  (pick: (layers: Layers) => readonly string[] | undefined) =>
  (layers: Layers) =>
  (layer: string): boolean =>
    Arr.contains(pick(layers) ?? [], layer);

export const isSliced = listed((layers) => layers.sliced);

const isSegmented = listed((layers) => layers.segmented);

export const isParted =
  (layers: Layers) =>
  (layer: string): boolean =>
    isSliced(layers)(layer) || isSegmented(layers)(layer);

export const isLayer = listed((layers) => layers.order);
