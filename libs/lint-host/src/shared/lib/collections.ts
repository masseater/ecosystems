import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

const byKey = Order.mapInput(Str.Order, ([key]: readonly [string, unknown]) => key);

export const sortedRecord = <Value>(
  entries: readonly (readonly [string, Value])[],
): Readonly<Record<string, Value>> => Rec.fromEntries(Arr.sort(entries, byKey));

const NEXT = 1;

export interface Grouped<Head, Item> {
  readonly head: Head;
  readonly items: readonly Item[];
}

export const groupedUnder =
  <Item, Head>(asHead: (item: Item) => Option.Option<Head>) =>
  (closes: (head: Head, item: Item) => boolean) =>
  (items: readonly Item[]): readonly Grouped<Head, Item>[] =>
    pipe(
      items,
      Arr.flatMap((item, index) =>
        pipe(
          asHead(item),
          Option.map((head): Grouped<Head, Item> => ({
            head,
            items: pipe(
              items,
              Arr.drop(index + NEXT),
              Arr.takeWhile((next) => !closes(head, next)),
            ),
          })),
          Option.toArray,
        ),
      ),
    );
