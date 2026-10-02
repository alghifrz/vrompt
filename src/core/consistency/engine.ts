import type { ActivationMode, AIRule, ProjectSpec } from "../schema/project-spec";
import {
  capabilitiesFor,
  hasNativeActivation,
  isKnownTarget,
} from "./capabilities";
import {
  type ConsistencyDiagnostic,
  type ConsistencyReport,
  DiagnosticCode,
  buildReport,
  diagnostic,
} from "./diagnostics";
import {
  accidentalTokenPresent,
  combinedContent,
  containsLiteral,
  countLiteral,
  extractRuleRegion,
  firstIndex,
  isRelativeSafePath,
  representsActivation,
  representsPriority,
  ruleMarker,
  type RenderedFile,
} from "./extraction";

export type { ConsistencyDiagnostic, ConsistencyReport } from "./diagnostics";
export { DiagnosticCode } from "./diagnostics";
export type { RendererCapabilities } from "./capabilities";
export { capabilitiesFor } from "./capabilities";

export interface ConsistencyTarget {
  name: string;
  files: RenderedFile[];
}

function hasItems<T>(value: readonly T[] | undefined): value is readonly T[] {
  return value !== undefined && value.length > 0;
}

function specContainsToken(spec: ProjectSpec, token: string): boolean {
  return JSON.stringify(spec).includes(token);
}

function ruleGlobs(rule: AIRule): readonly string[] | undefined {
  return "globs" in rule ? rule.globs : undefined;
}

function checkOutputIntegrity(
  spec: ProjectSpec,
  target: ConsistencyTarget,
): ConsistencyDiagnostic[] {
  const diagnostics: ConsistencyDiagnostic[] = [];
  const seenPaths: string[] = [];

  for (const file of target.files) {
    if (typeof file.content !== "string" || file.content.trim().length === 0) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.OUTPUT_EMPTY,
          severity: "error",
          message: `Target "${target.name}" generated an empty file at "${file.path}".`,
          target: target.name,
          path: String(file.path),
        }),
      );
    }

    if (typeof file.path !== "string" || !isRelativeSafePath(file.path)) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.OUTPUT_INVALID_PATH,
          severity: "error",
          message: `Target "${target.name}" generated an invalid path "${String(file.path)}".`,
          target: target.name,
          path: String(file.path),
        }),
      );
    } else if (seenPaths.includes(file.path)) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.OUTPUT_PATH_DUPLICATE,
          severity: "error",
          message: `Target "${target.name}" generated duplicate path "${file.path}".`,
          target: target.name,
          path: file.path,
        }),
      );
    } else {
      seenPaths.push(file.path);
    }

    if (typeof file.content !== "string") {
      continue;
    }

    if (
      !specContainsToken(spec, "undefined") &&
      accidentalTokenPresent(file.content, "undefined")
    ) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.OUTPUT_UNDEFINED,
          severity: "error",
          message: `Target "${target.name}" leaked "undefined" in "${file.path}".`,
          target: target.name,
          path: file.path,
        }),
      );
    }

    if (
      !specContainsToken(spec, "null") &&
      accidentalTokenPresent(file.content, "null")
    ) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.OUTPUT_NULL,
          severity: "error",
          message: `Target "${target.name}" leaked "null" in "${file.path}".`,
          target: target.name,
          path: file.path,
        }),
      );
    }

    if (
      !specContainsToken(spec, "[object Object]") &&
      accidentalTokenPresent(file.content, "[object Object]")
    ) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.OUTPUT_OBJECT_STRING,
          severity: "error",
          message: `Target "${target.name}" leaked "[object Object]" in "${file.path}".`,
          target: target.name,
          path: file.path,
        }),
      );
    }
  }

  return diagnostics;
}

function missingSection(
  target: string,
  semanticPath: string,
  label: string,
): ConsistencyDiagnostic {
  return diagnostic({
    code: DiagnosticCode.SECTION_MISSING,
    severity: "error",
    message: `Section "${label}" is missing from target "${target}".`,
    target,
    semanticPath,
  });
}

function missingItem(
  target: string,
  semanticPath: string,
  label: string,
): ConsistencyDiagnostic {
  return diagnostic({
    code: DiagnosticCode.ITEM_MISSING,
    severity: "error",
    message: `${label} is missing from target "${target}".`,
    target,
    semanticPath,
  });
}

function checkOrder(
  target: string,
  semanticPath: string,
  labels: readonly string[],
  content: string,
): ConsistencyDiagnostic[] {
  if (labels.length < 2) {
    return [];
  }

  const indexes = labels.map((label) => firstIndex(content, label));
  if (indexes.some((index) => index === -1)) {
    return [];
  }

  for (let index = 1; index < indexes.length; index += 1) {
    const previous = indexes[index - 1];
    const current = indexes[index];
    if (previous === undefined || current === undefined) {
      continue;
    }

    if (previous > current) {
      return [
        diagnostic({
          code: DiagnosticCode.ORDER_MISMATCH,
          severity: "error",
          message: `Target "${target}" changed source order for "${semanticPath}".`,
          target,
          semanticPath,
        }),
      ];
    }
  }

  return [];
}

function checkListedItems(
  target: string,
  semanticPath: string,
  sectionLabel: string,
  items: readonly { id: string; label: string }[],
  content: string,
): ConsistencyDiagnostic[] {
  if (items.length === 0) {
    return [];
  }

  const represented = items.filter((item) => containsLiteral(content, item.id));
  if (represented.length === 0) {
    return [missingSection(target, semanticPath, sectionLabel)];
  }

  const diagnostics: ConsistencyDiagnostic[] = [];
  for (const [index, item] of items.entries()) {
    if (!containsLiteral(content, item.id)) {
      diagnostics.push(
        missingItem(target, `${semanticPath}[${String(index)}]`, item.label),
      );
    }
  }

  diagnostics.push(
    ...checkOrder(
      target,
      semanticPath,
      items.map((item) => item.id),
      content,
    ),
  );

  return diagnostics;
}

function checkSections(
  spec: ProjectSpec,
  target: ConsistencyTarget,
  content: string,
): ConsistencyDiagnostic[] {
  const diagnostics: ConsistencyDiagnostic[] = [];
  const { name } = target;

  if (!containsLiteral(content, spec.project.name)) {
    diagnostics.push(missingSection(name, "project", "project"));
  }

  if (spec.goals) {
    const goalIds = spec.goals.primary.map((goal) => goal.id);
    const criteria = spec.goals.successCriteria;
    const represented =
      goalIds.some((id) => containsLiteral(content, id)) ||
      criteria.some((item) => containsLiteral(content, item));

    if ((goalIds.length > 0 || criteria.length > 0) && !represented) {
      diagnostics.push(missingSection(name, "goals", "goals"));
    } else {
      for (const [index, goal] of spec.goals.primary.entries()) {
        if (!containsLiteral(content, goal.id)) {
          diagnostics.push(
            missingItem(
              name,
              `goals.primary[${String(index)}]`,
              `Goal "${goal.id}"`,
            ),
          );
        }
      }

      diagnostics.push(...checkOrder(name, "goals.primary", goalIds, content));
    }
  }

  if (hasItems(spec.features)) {
    diagnostics.push(
      ...checkListedItems(
        name,
        "features",
        "features",
        spec.features.map((feature) => ({
          id: feature.id,
          label: `Feature "${feature.id}"`,
        })),
        content,
      ),
    );
  }

  if (hasItems(spec.users)) {
    diagnostics.push(
      ...checkListedItems(
        name,
        "users",
        "users",
        spec.users.map((user) => ({
          id: user.id,
          label: `User "${user.id}"`,
        })),
        content,
      ),
    );
  }

  if (spec.stack) {
    const values = [
      spec.stack.frontend,
      spec.stack.backend,
      spec.stack.database,
      spec.stack.authentication,
      spec.stack.hosting,
      ...(spec.stack.additional ?? []),
    ].filter((value): value is string => Boolean(value));

    if (
      values.length > 0 &&
      !values.some((value) => containsLiteral(content, value))
    ) {
      diagnostics.push(missingSection(name, "stack", "stack"));
    }
  }

  if (spec.architecture) {
    const componentIds = (spec.architecture.components ?? []).map(
      (item) => item.id,
    );
    const anchors = [
      spec.architecture.style,
      ...componentIds,
      ...(spec.architecture.externalServices ?? []).map((item) => item.id),
      ...(spec.architecture.constraints ?? []),
    ].filter((value): value is string => Boolean(value));

    if (
      anchors.length > 0 &&
      !anchors.some((anchor) => containsLiteral(content, anchor))
    ) {
      diagnostics.push(missingSection(name, "architecture", "architecture"));
    } else {
      diagnostics.push(
        ...checkOrder(name, "architecture.components", componentIds, content),
      );
    }
  }

  if (spec.database) {
    const entityIds = (spec.database.entities ?? []).map((item) => item.id);
    const anchors = [...entityIds, ...(spec.database.constraints ?? [])];

    if (
      anchors.length > 0 &&
      !anchors.some((anchor) => containsLiteral(content, anchor))
    ) {
      diagnostics.push(missingSection(name, "database", "database"));
    } else {
      diagnostics.push(
        ...checkOrder(name, "database.entities", entityIds, content),
      );
    }
  }

  if (spec.api && hasItems(spec.api.endpoints)) {
    const endpoints = spec.api.endpoints.map(
      (endpoint) => `${endpoint.method} ${endpoint.path}`,
    );
    const represented = endpoints.filter((endpoint) =>
      containsLiteral(content, endpoint),
    );

    if (represented.length === 0) {
      diagnostics.push(missingSection(name, "api", "api"));
    } else {
      for (const [index, endpoint] of spec.api.endpoints.entries()) {
        const label = `${endpoint.method} ${endpoint.path}`;
        if (!containsLiteral(content, label)) {
          diagnostics.push(
            missingItem(
              name,
              `api.endpoints[${String(index)}]`,
              `Endpoint "${label}"`,
            ),
          );
        }
      }

      diagnostics.push(...checkOrder(name, "api.endpoints", endpoints, content));
    }
  }

  if (spec.security) {
    const anchors = [
      ...(spec.security.authentication ?? []),
      ...(spec.security.authorization ?? []),
      ...(spec.security.sensitiveData ?? []),
      ...(spec.security.constraints ?? []),
    ];

    if (
      anchors.length > 0 &&
      !anchors.some((anchor) => containsLiteral(content, anchor))
    ) {
      diagnostics.push(missingSection(name, "security", "security"));
    }
  }

  if (spec.constraints) {
    const anchors = [
      spec.constraints.budget,
      ...(spec.constraints.deployment ?? []),
      ...(spec.constraints.technology ?? []),
      ...(spec.constraints.compliance ?? []),
      ...(spec.constraints.scope ?? []),
    ].filter((value): value is string => Boolean(value));

    if (
      anchors.length > 0 &&
      !anchors.some((anchor) => containsLiteral(content, anchor))
    ) {
      diagnostics.push(missingSection(name, "constraints", "constraints"));
    }
  }

  return diagnostics;
}

function missingRuleMetadata(
  target: string,
  semanticPath: string,
  path: string | undefined,
  message: string,
): ConsistencyDiagnostic {
  return diagnostic({
    code: DiagnosticCode.AI_RULE_METADATA_MISSING,
    severity: "error",
    message,
    target,
    path,
    semanticPath,
  });
}

function checkAiRules(
  spec: ProjectSpec,
  target: ConsistencyTarget,
): ConsistencyDiagnostic[] {
  if (!hasItems(spec.aiRules)) {
    return [];
  }

  const diagnostics: ConsistencyDiagnostic[] = [];
  const ruleIds = spec.aiRules.map((rule) => rule.id);
  const combined = combinedContent(target.files);

  for (const [index, rule] of spec.aiRules.entries()) {
    const semanticPath = `aiRules[${String(index)}]`;
    const region = extractRuleRegion(target.files, rule.id, ruleIds);
    const markerCount = countLiteral(combined, ruleMarker(rule.id));

    if (!region) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.AI_RULE_MISSING,
          severity: "error",
          message: `AI rule "${rule.id}" is missing from target "${target.name}".`,
          target: target.name,
          semanticPath,
        }),
      );
      continue;
    }

    if (markerCount > 1) {
      diagnostics.push(
        diagnostic({
          code: DiagnosticCode.AI_RULE_DUPLICATE,
          severity: "error",
          message: `AI rule "${rule.id}" appears more than once in target "${target.name}".`,
          target: target.name,
          path: region.path,
          semanticPath,
        }),
      );
    }

    if (!containsLiteral(region.content, rule.title)) {
      diagnostics.push(
        missingRuleMetadata(
          target.name,
          `${semanticPath}.title`,
          region.path,
          `AI rule "${rule.id}" is missing its title in target "${target.name}".`,
        ),
      );
    }

    if (!containsLiteral(region.content, rule.body)) {
      diagnostics.push(
        missingRuleMetadata(
          target.name,
          `${semanticPath}.body`,
          region.path,
          `AI rule "${rule.id}" is missing its body in target "${target.name}".`,
        ),
      );
    }

    if (!representsPriority(region.content, rule.priority)) {
      diagnostics.push(
        missingRuleMetadata(
          target.name,
          `${semanticPath}.priority`,
          region.path,
          `AI rule "${rule.id}" is missing priority "${rule.priority}" in target "${target.name}".`,
        ),
      );
    }

    if (!representsActivation(region.content, rule.activationMode)) {
      diagnostics.push(
        missingRuleMetadata(
          target.name,
          `${semanticPath}.activationMode`,
          region.path,
          `AI rule "${rule.id}" is missing activation "${rule.activationMode}" in target "${target.name}".`,
        ),
      );
    }

    if (rule.description && !containsLiteral(region.content, rule.description)) {
      diagnostics.push(
        missingRuleMetadata(
          target.name,
          `${semanticPath}.description`,
          region.path,
          `AI rule "${rule.id}" is missing its description in target "${target.name}".`,
        ),
      );
    }

    if (!containsLiteral(region.content, rule.rationale)) {
      diagnostics.push(
        missingRuleMetadata(
          target.name,
          `${semanticPath}.rationale`,
          region.path,
          `AI rule "${rule.id}" is missing its rationale in target "${target.name}".`,
        ),
      );
    }

    const globs = ruleGlobs(rule);
    if (hasItems(globs)) {
      const missingGlob = globs.find(
        (glob) => !containsLiteral(region.content, glob),
      );
      if (missingGlob) {
        diagnostics.push(
          diagnostic({
            code: DiagnosticCode.AI_RULE_GLOB_MISSING,
            severity: "error",
            message: `AI rule "${rule.id}" is missing glob "${missingGlob}" in target "${target.name}".`,
            target: target.name,
            path: region.path,
            semanticPath: `${semanticPath}.globs`,
          }),
        );
      }
    }
  }

  diagnostics.push(...checkOrder(target.name, "aiRules", ruleIds, combined));

  return diagnostics;
}

function uniqueActivationModes(rules: readonly AIRule[]): ActivationMode[] {
  const modes: ActivationMode[] = [];

  for (const rule of rules) {
    if (!modes.includes(rule.activationMode)) {
      modes.push(rule.activationMode);
    }
  }

  return modes;
}

function checkTargetLimitations(
  spec: ProjectSpec,
  target: ConsistencyTarget,
): ConsistencyDiagnostic[] {
  if (!isKnownTarget(target.name) || !hasItems(spec.aiRules)) {
    return [];
  }

  const diagnostics: ConsistencyDiagnostic[] = [];
  const capabilities = capabilitiesFor(target.name);
  const ruleIds = spec.aiRules.map((rule) => rule.id);
  const representedRules = spec.aiRules.filter((rule) =>
    extractRuleRegion(target.files, rule.id, ruleIds),
  );

  if (representedRules.length === 0) {
    return [];
  }

  if (!capabilities.nativePriority) {
    diagnostics.push(
      diagnostic({
        code: DiagnosticCode.TARGET_LIMITATION,
        severity: "info",
        message: `Target "${target.name}" has no native priority support.`,
        target: target.name,
        semanticPath: "aiRules.priority",
      }),
    );
  }

  for (const mode of uniqueActivationModes(representedRules)) {
    if (hasNativeActivation(target.name, mode)) {
      continue;
    }

    diagnostics.push(
      diagnostic({
        code: DiagnosticCode.TARGET_LIMITATION,
        severity: "warning",
        message: `Target "${target.name}" has no native activation for "${mode}"; it is represented in Markdown.`,
        target: target.name,
        semanticPath: `aiRules.activationMode.${mode}`,
      }),
    );
  }

  return diagnostics;
}

export function checkConsistency(
  spec: ProjectSpec,
  targets: ConsistencyTarget[],
): ConsistencyReport {
  const diagnostics: ConsistencyDiagnostic[] = [];

  for (const target of targets) {
    const content = combinedContent(target.files);
    diagnostics.push(...checkOutputIntegrity(spec, target));
    diagnostics.push(...checkSections(spec, target, content));
    diagnostics.push(...checkAiRules(spec, target));
    diagnostics.push(...checkTargetLimitations(spec, target));
  }

  return buildReport(diagnostics);
}

export function checkRendererConsistency(
  spec: ProjectSpec,
  rendered: Record<string, { files: RenderedFile[] } | string>,
): ConsistencyReport {
  const targets: ConsistencyTarget[] = Object.entries(rendered).map(
    ([name, value]) => ({
      name,
      files:
        typeof value === "string"
          ? [{ path: "AGENTS.md", content: value }]
          : value.files,
    }),
  );

  return checkConsistency(spec, targets);
}

export function checkRenderedEquivalence(
  first: ConsistencyTarget,
  second: ConsistencyTarget,
): ConsistencyReport {
  const same =
    first.name === second.name &&
    first.files.length === second.files.length &&
    first.files.every((file, index) => {
      const other = second.files[index];
      return other?.path === file.path && other.content === file.content;
    });

  if (same) {
    return buildReport([]);
  }

  return buildReport([
    diagnostic({
      code: DiagnosticCode.NON_DETERMINISTIC,
      severity: "error",
      message: `Target "${first.name}" produced different output for the same ProjectSpec.`,
      target: first.name,
    }),
  ]);
}
