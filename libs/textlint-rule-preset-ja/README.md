# @r_masseater/textlint-rule-preset-ja

A textlint preset for Japanese prose.

- `yomiyasu` flags Japanese that is hard to read, the kind AI tends to write.
- `no-taigendome` flags a sentence that puts a comma and then ends in a bare noun phrase instead of a predicate.
- `no-ni-aru-file` flags 「詳細は [foo.md](foo.md) にある」, which says where a topic is written with 「にある」. It suggests 「に書いてある」 or 「を読む」.

`no-taigendome` reads morphemes from [@r_masseater/y8](https://www.npmjs.com/package/@r_masseater/y8), which is a peer dependency.

```sh
npm install --save-dev textlint @r_masseater/textlint-rule-preset-ja @r_masseater/y8
```

```json
{
  "rules": {
    "@r_masseater/preset-ja": true
  }
}
```

## Agent skills

The package ships agent skills in `skills/`. Add `permissions: { "@r_masseater/textlint-rule-preset-ja": { skills: true } }` to `pnpm-workspace.yaml` and `vp install` links them into the skill directories of your agents.
