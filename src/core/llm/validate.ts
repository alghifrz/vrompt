import { LLMError, LLMErrorCode } from "./errors";
import type { LLMMessage, LLMRequest, LLMRole } from "./types";

const ROLES: readonly LLMRole[] = ["system", "user", "assistant"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLLMRole(value: unknown): value is LLMRole {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function invalidRequest(message: string): LLMError {
  return new LLMError(LLMErrorCode.INVALID_REQUEST, message, {
    retryable: false,
  });
}

function assertMessage(message: unknown, index: number): asserts message is LLMMessage {
  if (!isRecord(message)) {
    throw invalidRequest(`Message at index ${String(index)} is malformed.`);
  }

  if (!isLLMRole(message.role)) {
    throw invalidRequest(`Message at index ${String(index)} has an invalid role.`);
  }

  if (typeof message.content !== "string") {
    throw invalidRequest(
      `Message at index ${String(index)} must have string content.`,
    );
  }
}

export function validateLLMRequest(request: LLMRequest): void {
  if (!Array.isArray(request.messages) || request.messages.length === 0) {
    throw invalidRequest("Request messages cannot be empty.");
  }

  for (const [index, message] of request.messages.entries()) {
    assertMessage(message, index);
  }

  if (request.system !== undefined && typeof request.system !== "string") {
    throw invalidRequest("Request system prompt must be a string.");
  }

  if (request.model !== undefined) {
    if (typeof request.model !== "string" || request.model.trim().length === 0) {
      throw invalidRequest("Request model must be a non-empty string.");
    }
  }

  if (request.temperature !== undefined) {
    if (
      typeof request.temperature !== "number" ||
      !Number.isFinite(request.temperature) ||
      request.temperature < 0 ||
      request.temperature > 2
    ) {
      throw invalidRequest("Request temperature must be a number between 0 and 2.");
    }
  }

  if (request.maxTokens !== undefined) {
    if (
      typeof request.maxTokens !== "number" ||
      !Number.isInteger(request.maxTokens) ||
      request.maxTokens <= 0
    ) {
      throw invalidRequest("Request maxTokens must be a positive integer.");
    }
  }

  if (request.timeoutMs !== undefined) {
    if (
      typeof request.timeoutMs !== "number" ||
      !Number.isInteger(request.timeoutMs) ||
      request.timeoutMs <= 0
    ) {
      throw invalidRequest("Request timeoutMs must be a positive integer.");
    }
  }

  if (request.metadata !== undefined) {
    if (!isRecord(request.metadata)) {
      throw invalidRequest("Request metadata must be a string record.");
    }

    for (const value of Object.values(request.metadata)) {
      if (typeof value !== "string") {
        throw invalidRequest("Request metadata values must be strings.");
      }
    }
  }
}
