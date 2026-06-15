import type { Analyzer } from "../core/types.js";
import { architectureAnalyzer } from "./architecture.js";
import { modularityAnalyzer } from "./modularity.js";
import { folderStructureAnalyzer } from "./folderStructure.js";
import { testingAnalyzer } from "./testing.js";
import { configAnalyzer } from "./config.js";
import { errorHandlingAnalyzer } from "./errorHandling.js";
import { containerizationAnalyzer } from "./containerization.js";
import { observabilityAnalyzer } from "./observability.js";
import { securityAnalyzer } from "./security.js";
import { documentationAnalyzer } from "./documentation.js";

/** The universal-tier analyzer registry, in display order. */
export const ANALYZERS: Analyzer[] = [
  architectureAnalyzer,
  modularityAnalyzer,
  folderStructureAnalyzer,
  testingAnalyzer,
  configAnalyzer,
  errorHandlingAnalyzer,
  containerizationAnalyzer,
  observabilityAnalyzer,
  securityAnalyzer,
  documentationAnalyzer,
];

export {
  architectureAnalyzer,
  modularityAnalyzer,
  folderStructureAnalyzer,
  testingAnalyzer,
  configAnalyzer,
  errorHandlingAnalyzer,
  containerizationAnalyzer,
  observabilityAnalyzer,
  securityAnalyzer,
  documentationAnalyzer,
};
