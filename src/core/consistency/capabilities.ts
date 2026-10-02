import type { ActivationMode } from "../schema/project-spec";

export interface RendererCapabilities {
  nativePriority: boolean;
  nativeActivationModes: readonly ActivationMode[];
  nativeScopedRules: boolean;
}

const DEFAULT_CAPABILITIES: RendererCapabilities = {
  nativePriority: false,
  nativeActivationModes: [],
  nativeScopedRules: false,
};

const KNOWN_CAPABILITIES: Record<string, RendererCapabilities> = {
  "agents-md": {
    nativePriority: false,
    nativeActivationModes: [],
    nativeScopedRules: false,
  },
  cursor: {
    nativePriority: false,
    nativeActivationModes: ["always", "scoped"],
    nativeScopedRules: true,
  },
  qoder: {
    nativePriority: false,
    nativeActivationModes: ["always", "scoped", "agent_decides", "manual"],
    nativeScopedRules: true,
  },
  "claude-code": {
    nativePriority: false,
    nativeActivationModes: ["always", "scoped"],
    nativeScopedRules: true,
  },
};

export function capabilitiesFor(targetName: string): RendererCapabilities {
  return KNOWN_CAPABILITIES[targetName] ?? DEFAULT_CAPABILITIES;
}

export function isKnownTarget(targetName: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWN_CAPABILITIES, targetName);
}

export function hasNativeActivation(
  targetName: string,
  mode: ActivationMode,
): boolean {
  return capabilitiesFor(targetName).nativeActivationModes.includes(mode);
}
