use std::path::{Path, PathBuf};

use agnix_core::{Diagnostic, DiagnosticLevel, LintConfig, ValidatorRegistry, validate_content};
use serde::Serialize;
use tracing::info_span;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDiagnostic {
    pub line: usize,
    pub column: usize,
    pub rule: String,
    pub message: String,
    pub suggestion: Option<String>,
    pub level: AgentLevel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AgentLevel {
    Error,
    Warning,
    Info,
}

const BROKEN_LINK_RULE: &str = "REF-002";
const BROKEN_LINK_PREFIX: &str = "Broken markdown link: '";
const SOURCE_POINTER_SCHEMES: [&str; 2] = ["github:", "npm:"];

fn points_at_source(diagnostic: &Diagnostic) -> bool {
    diagnostic.rule == BROKEN_LINK_RULE
        && diagnostic
            .message
            .strip_prefix(BROKEN_LINK_PREFIX)
            .is_some_and(|link| {
                SOURCE_POINTER_SCHEMES
                    .iter()
                    .any(|scheme| link.starts_with(scheme))
            })
}

pub struct AgentChecker {
    root: PathBuf,
    config: LintConfig,
    registry: ValidatorRegistry,
}

impl AgentChecker {
    #[must_use]
    pub fn new(root: PathBuf, disabled: &[String]) -> Option<Self> {
        let mut builder = LintConfig::builder();
        builder.root_dir(root.clone());
        for rule in disabled {
            builder.disable_rule(rule.clone());
        }
        let config = builder.build_lenient().ok()?;
        Some(Self {
            root,
            config,
            registry: ValidatorRegistry::with_defaults(),
        })
    }

    #[must_use]
    pub fn check(&self, path: &str, text: &str) -> Vec<AgentDiagnostic> {
        let _span = info_span!("y8.agnix", "code.file.path" = path).entered();
        let absolute = self.root.join(Path::new(path));
        validate_content(&absolute, text, &self.config, &self.registry)
            .into_iter()
            .filter(|diagnostic| !points_at_source(diagnostic))
            .map(|diagnostic| AgentDiagnostic {
                line: diagnostic.line.max(1),
                column: diagnostic.column.max(1),
                rule: diagnostic.rule,
                message: diagnostic.message,
                suggestion: diagnostic.suggestion,
                level: match diagnostic.level {
                    DiagnosticLevel::Error => AgentLevel::Error,
                    DiagnosticLevel::Warning => AgentLevel::Warning,
                    DiagnosticLevel::Info => AgentLevel::Info,
                },
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::AgentChecker;

    fn broken_links(text: &str) -> Vec<String> {
        let checker = AgentChecker::new(PathBuf::from(env!("CARGO_MANIFEST_DIR")), &[])
            .expect("the checker builds");
        checker
            .check("AGENTS.md", text)
            .into_iter()
            .filter(|diagnostic| diagnostic.rule == "REF-002")
            .map(|diagnostic| diagnostic.message)
            .collect()
    }

    #[test]
    fn a_link_to_a_missing_file_is_broken() {
        assert_eq!(broken_links("[a](missing.md)\n").len(), 1);
    }

    #[test]
    fn a_github_pointer_is_not_a_file() {
        assert_eq!(
            broken_links("[a](github:masseater/ecosystems/libs/msch)\n").len(),
            0
        );
    }

    #[test]
    fn an_npm_pointer_is_not_a_file() {
        assert_eq!(broken_links("[a](npm:effect)\n").len(), 0);
    }
}
