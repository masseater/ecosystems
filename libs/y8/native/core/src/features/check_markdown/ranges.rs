use std::collections::HashMap;
use std::collections::hash_map::Entry;

use super::config::{Directive, Names};
use super::rule::RuleMeta;
use crate::shared::source::{Source, utf16_len};

pub const UNUSED_RULE: usize = usize::MAX;

pub static UNUSED_DIRECTIVE: RuleMeta = RuleMeta {
    names: &["y8-unused-directive"],
    description: "A y8 comment disables a rule that reports nothing in its range",
    tags: &[],
};

pub struct Name {
    pub text: String,
    indices: Vec<usize>,
}

pub struct Owner {
    pub line: usize,
    pub column: usize,
    pub length: usize,
    pub names: Vec<Name>,
}

struct Span {
    rule: usize,
    start: usize,
    end: usize,
    owner: usize,
    name: usize,
}

#[derive(Default)]
pub struct Ranges {
    spans: Vec<Span>,
    pub owners: Vec<Owner>,
}

fn names_of(parameter: &str, names: &Names, rule_count: usize) -> Vec<Name> {
    let mut found: Vec<Name> = parameter
        .split_whitespace()
        .map(|token| Name {
            text: token.to_owned(),
            indices: names.resolve(token).to_vec(),
        })
        .collect();
    if found.is_empty() {
        found.push(Name {
            text: String::new(),
            indices: (0..rule_count).collect(),
        });
    }
    found
}

fn owner_of(source: &Source, directive: &Directive, names: Vec<Name>) -> Owner {
    let line_start = source.line_starts[directive.line];
    let text = &source.text;
    Owner {
        line: directive.line,
        column: utf16_len(&text[line_start..directive.start]) + 1,
        length: utf16_len(&text[directive.start..directive.end]),
        names,
    }
}

impl Ranges {
    #[must_use]
    pub fn build(
        source: &Source,
        directives: &[Directive],
        names: &Names,
        rule_count: usize,
    ) -> Self {
        let mut ranges = Self::default();
        let mut open: HashMap<usize, usize> = HashMap::new();
        for directive in directives.iter().filter(|d| d.y8) {
            match directive.action.as_str() {
                "DISABLE" => {
                    let owner = ranges.owners.len();
                    let named = names_of(&directive.parameter, names, rule_count);
                    for (name, entry) in named.iter().enumerate() {
                        for &rule in &entry.indices {
                            if let Entry::Vacant(slot) = open.entry(rule) {
                                slot.insert(ranges.spans.len());
                                ranges.spans.push(Span {
                                    rule,
                                    start: directive.end,
                                    end: usize::MAX,
                                    owner,
                                    name,
                                });
                            }
                        }
                    }
                    ranges.owners.push(owner_of(source, directive, named));
                }
                "ENABLE" => {
                    for entry in names_of(&directive.parameter, names, rule_count) {
                        for rule in entry.indices {
                            if let Some(span) = open.remove(&rule) {
                                ranges.spans[span].end = directive.start;
                            }
                        }
                    }
                }
                "DISABLE-LINE" | "DISABLE-NEXT-LINE" => {
                    let line = if directive.action == "DISABLE-LINE" {
                        directive.line
                    } else {
                        directive.line + 1
                    };
                    if line >= source.line_count() {
                        continue;
                    }
                    let owner = ranges.owners.len();
                    let named = names_of(&directive.parameter, names, rule_count);
                    let (start, end) = source.line_range(line);
                    for (name, entry) in named.iter().enumerate() {
                        for &rule in &entry.indices {
                            ranges.spans.push(Span {
                                rule,
                                start,
                                end: end + 1,
                                owner,
                                name,
                            });
                        }
                    }
                    ranges.owners.push(owner_of(source, directive, named));
                }
                _ => {}
            }
        }
        ranges
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.spans.is_empty()
    }

    #[must_use]
    pub fn covering(&self, rule: usize, offset: usize) -> Vec<(usize, usize)> {
        self.spans
            .iter()
            .filter(|span| span.rule == rule && span.start <= offset && offset < span.end)
            .map(|span| (span.owner, span.name))
            .collect()
    }
}

#[must_use]
pub fn offset_of(source: &Source, line: usize, column: Option<usize>) -> usize {
    let start = source.line_starts[line];
    let Some(column) = column else {
        return start;
    };
    let mut remaining = column.saturating_sub(1);
    let mut offset = start;
    for character in source.line(line).chars() {
        let width = character.len_utf16();
        if remaining < width {
            break;
        }
        remaining -= width;
        offset += character.len_utf8();
    }
    offset
}

#[cfg(test)]
mod tests {
    use serde_json::{Map, Value};

    use super::super::{Input, Linter, Transfer};

    const STRICT: &str = r#"{ "MD013": { "line_length": 40 } }"#;
    const LOOSE: &str = r#"{ "MD013": false }"#;

    type Found = Vec<(String, usize, Option<usize>)>;

    fn found(text: &str, config: &str, unused: bool) -> Found {
        let config: Map<String, Value> = serde_json::from_str::<Value>(config)
            .expect("config")
            .as_object()
            .expect("object")
            .clone();
        let linter = Linter::new(config, true).reporting_unused_directives(unused);
        let result = linter.lint_all(
            &[Input {
                path: "a.md".to_owned(),
                text: text.to_owned(),
            }],
            Transfer::Nothing,
        );
        result[0]
            .diagnostics
            .iter()
            .map(|d| {
                (
                    d.rule_names[0].to_owned(),
                    d.line,
                    d.range.map(|(column, _)| column),
                )
            })
            .collect()
    }

    #[test]
    fn stops_only_the_characters_between_the_comments() {
        let text =
            "# T\n\nx <!-- y8-disable MD037 --> a * b * c <!-- y8-enable MD037 --> d * e * f\n";
        let rules = found(text, LOOSE, false);
        assert!(
            rules
                .iter()
                .all(|(rule, line, _)| rule == "MD037" && *line == 3)
        );
        assert_ne!(rules.len(), 0);
        let after = text.find("d * e").expect("tail") - text.find("x <!--").expect("line") + 1;
        assert!(
            rules
                .iter()
                .all(|(_, _, column)| column.is_some_and(|c| c >= after))
        );
    }

    #[test]
    fn markdownlint_comments_still_stop_the_whole_line() {
        let text = "# T\n\nx <!-- markdownlint-disable-line MD037 --> a * b * c d * e * f\n";
        assert_eq!(found(text, LOOSE, false), Found::new());
    }

    #[test]
    fn a_range_covers_whole_lines_between_comments() {
        let text = "# T\n\n<!-- y8-disable MD013 -->\na line that is much longer than forty chars with many words in it\n<!-- y8-enable MD013 -->\nanother line that is much longer than forty chars with many words\n";
        let rules = found(text, STRICT, false);
        assert_eq!(rules.len(), 1);
        assert_eq!((rules[0].0.as_str(), rules[0].1), ("MD013", 6));
    }

    #[test]
    fn an_unclosed_comment_runs_to_the_end_of_the_file() {
        let text = "# T\n\n<!-- y8-disable MD013 -->\na line that is much longer than forty chars with many words in it\nand one more line that is much longer than forty chars with many words\n";
        assert_eq!(found(text, STRICT, false), Found::new());
    }

    #[test]
    fn reports_a_comment_that_stops_nothing() {
        let text = "# T\n\nshort\n\n<!-- y8-disable MD013 MD037 -->\na line that is much longer than forty chars with many words in it\n<!-- y8-enable MD013 MD037 -->\n";
        let unused: Vec<_> = found(text, STRICT, true)
            .into_iter()
            .filter(|(rule, _, _)| rule == "y8-unused-directive")
            .collect();
        assert_eq!(unused.len(), 1);
        assert_eq!(unused[0].1, 5);
    }

    #[test]
    fn line_comments_with_the_y8_prefix_report_when_unused() {
        let text = "# T\n\n<!-- y8-disable-next-line MD013 -->\nshort\n";
        let rules = found(text, STRICT, true);
        assert_eq!(rules.len(), 1);
        assert_eq!(
            (rules[0].0.as_str(), rules[0].1),
            ("y8-unused-directive", 3)
        );
        assert_eq!(found(text, STRICT, false), Found::new());
    }

    #[test]
    fn the_y8_prefix_works_without_any_markdownlint_comment() {
        let text = "# T\n\n<!-- y8-disable-next-line MD013 -->\na line that is much longer than forty chars with many words in it\n";
        assert_eq!(found(text, STRICT, true), Found::new());
    }

    #[test]
    fn a_name_that_matches_no_rule_is_reported() {
        let text = "# T\n\n<!-- y8-disable-next-line docs/none -->\nshort\n";
        let rules = found(text, STRICT, true);
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].0, "y8-unused-directive");
    }
}
