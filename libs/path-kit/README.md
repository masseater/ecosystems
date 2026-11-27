# @masseater.dev/path-kit

Reads slash-separated path strings.

```ts
import { baseName, below, isInside } from "@masseater.dev/path-kit";

baseName("libs/msch/package.json");
below("libs/msch")("libs/msch/src/index.ts");
isInside("libs")("libs/msch");
```
