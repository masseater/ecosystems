export { agentsMd, agentsMdPlugin } from "./model/agents-md-preset.ts";
export type { AgentsMdOptions } from "./model/agents-md-preset.ts";
export { documents, documentsPlugin } from "./model/documents-preset.ts";
export type { DocumentsOptions } from "./model/documents-preset.ts";
export { readme, readmePlugin } from "./model/readme-preset.ts";
export { agentConfig, markdownStyle, recommended } from "./model/recommended.ts";
export type { RecommendedOptions } from "./model/recommended.ts";
export { skillMd, skillMdPlugin } from "./model/skill-md-preset.ts";
export type { SkillMdOptions } from "./model/skill-md-preset.ts";
export type { SkillNameOptions } from "./lib/preset.ts";
export {
  GRAMMAR as REFERENCE_GRAMMAR,
  NO_PATH,
  branchLinkReference,
  describeReference,
  parseReference,
  referenceOf,
} from "./lib/source-reference.ts";
export type { GithubReference, NpmReference, Reference } from "./lib/source-reference.ts";
