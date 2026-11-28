---
name: check-japanese-writing
description: >
  Use when enabling @r_masseater/textlint-rule-preset-ja in textlint, or when fixing Japanese text it
  reports: yomiyasu findings on hard-to-read Japanese written by AI, no-taigendome findings on
  sentences that end in a noun after a comma, and no-ni-aru-file findings on 「〜は [file] にある」. Covers turning a rule off and disabling it for one
  passage.
metadata:
  type: core
  library: "@r_masseater/textlint-rule-preset-ja"
sources:
  - src/app/index.ts
  - src/features/**
  - upstream/lint.ts
---

# check-japanese-writing

The preset holds three textlint rules for masseater's Japanese writing.

| Rule             | Reports                                                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yomiyasu`       | Japanese that AI tends to write and people find hard to read, ported from yomiyasu                                                                                                                                |
| `no-taigendome`  | A sentence that ends in a noun after a comma, such as 「ボトルネック、人のやり取り」. In JSX it also reports a comma right after a short topic, such as 「人は、」                                                |
| `no-ni-aru-file` | A sentence that says where a topic is written with 「にある」 after a file, such as `詳細は foo.md にある`. A sentence whose subject is the file itself, such as `foo.ts の定義は bar.ts にある`, is not reported |

All three are on when the preset is enabled.

## Setup

```sh
npm i -D textlint @r_masseater/textlint-rule-preset-ja
```

```json
{
  "rules": {
    "@r_masseater/preset-ja": true
  }
}
```

In a repository that uses @r_masseater/msch, `repositoryConfig` already enables the preset. Pass rule settings through its `textlint.rules` option instead.

## Turn a rule off

```json
{
  "rules": {
    "@r_masseater/preset-ja": { "no-taigendome": false }
  }
}
```

To disable a rule for one passage in Markdown, name it with the preset prefix as below.

```md
<!-- textlint-disable @r_masseater/ja/no-taigendome -->

Quoted text that must stay as written.
<!-- textlint-enable @r_masseater/ja/no-taigendome -->
```

## Fix a finding

- `no-taigendome`: rewrite the passage as a sentence with a subject and a predicate. 「ボトルネック、人のやり取り」 becomes 「ボトルネックは人のやり取りだった」.
- `no-ni-aru-file`: say what the file does with a verb. `詳細は foo.md にある` becomes `詳細は foo.md に書いてある` or `詳細は foo.md を読む`.
- `yomiyasu`: the message names the pattern. Rewrite the sentence so it keeps its meaning and conditions without that pattern.

In a README, `yomiyasu` skips the check on long lists, because a manual is often a list.
