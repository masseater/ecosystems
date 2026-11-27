# @masseater.dev/path-kit

This workspace holds the functions that read slash-separated path strings and are used by more than one package in this repository. Published packages bundle it, so it is never published on its own.

- Do not put anything that touches the file system here. It reads strings only.
