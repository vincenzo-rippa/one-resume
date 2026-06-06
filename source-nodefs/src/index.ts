export { FileSystemSource } from "./fileSystemSource.ts";
export {
  loadConfig,
  loadEnv,
  envDir,
  REPO_ROOT,
  type PipelineConfig,
} from "./config.ts";
// Re-export the resolver-based loaders so node consumers have a single import
// site for "build a FileSystemSource and parse through it".
export { loadParsedCv, loadParsedProjects } from "core-parser/source";
export type { SourceResolver } from "core-parser/source";
