import { describe, expect, it } from "vitest";
import { renderErd, renderPrd } from "../../core/generation/docs";
import { buildGenerationJobs } from "../../core/generation/jobs";
import type { InterviewPhase } from "../../core/interview/types";
import { createRequireAuth } from "../auth/require-auth";
import { createDevelopmentLLMProvider } from "../llm/development-provider";
import {
  createMemoryInterviewRepository,
  createMemoryProjectRepository,
  createMemoryStore,
} from "../repositories/memory";
import { createGenerationFlow } from "./generation-flow";
import { createInterviewFlow } from "./interview-flow";
import { createReviewFlow } from "./review-flow";

const answers: Partial<Record<InterviewPhase, string>> = {
  discovery:
    "gw mau bikin app buat pemilik toko buku, catat stok sama penjualan biar ga ribet",
  goals: "biar penjualan dan stoknya rapi, ga manual lagi",
  features: "pembayaran lewat rekening tetap aja kali ya",
  users: "pemilik toko buku",
  stack: "fe react, be golang",
  architecture: "gatau",
  database: "terserah",
  api: "gatau",
  security: "gatau",
  ai_rules: "yang simple aja",
  review: "oke",
};

describe("end-to-end product flow", () => {
  it("interprets a casual interview into spec, docs, jobs, and a ZIP", async () => {
    const store = createMemoryStore();
    const projects = createMemoryProjectRepository(store);
    const interviews = createMemoryInterviewRepository(store);
    const requireAuth = createRequireAuth(async () => ({ userId: "user_e2e" }));
    let nextId = 0;

    const interview = createInterviewFlow({
      requireAuth,
      projects,
      interviews,
      createProvider: () => createDevelopmentLLMProvider(),
      ids: { next: () => `sess-${String((nextId += 1))}` },
    });
    const review = createReviewFlow({
      requireAuth,
      projects,
      createProvider: () => createDevelopmentLLMProvider(),
    });
    const generation = createGenerationFlow({
      requireAuth,
      projects,
      now: () => new Date("2026-10-04T00:00:00.000Z"),
    });

    const started = await interview.startProject();
    expect(started.ok).toBe(true);
    if (!started.ok) {
      throw new Error(started.error?.message ?? "start failed");
    }

    let view = started.view;
    for (let turn = 0; turn < 16 && !view.completed; turn += 1) {
      const answer = answers[view.phase] ?? "lanjut";
      const next = await interview.submitAnswer({
        projectId: view.projectId,
        sessionId: view.sessionId,
        answer,
      });
      expect(next.ok).toBe(true);
      if (!next.ok) {
        throw new Error(next.error?.message ?? "answer failed");
      }
      view = next.view;
    }

    expect(view.completed).toBe(true);
    expect(view.phase).toBe("complete");

    const loaded = await review.load(view.projectId);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      throw new Error(loaded.error.message);
    }

    const spec = {
      ...loaded.view.spec,
      project: { ...loaded.view.spec.project, status: "ready" as const },
    };
    const saved = await review.save({ projectId: view.projectId, spec });
    expect(saved.ok).toBe(true);

    expect(spec.project.name).not.toMatch(/\bgw\b|mau bikin|namanya|pemilik/i);
    expect(spec.project.name.split(/\s+/).length).toBeLessThanOrEqual(4);
    expect(spec.project.description).toMatch(/stok/i);
    expect(spec.project.description).toMatch(/penjualan/i);
    expect(spec.project.description).not.toMatch(/\bgw\b|aja kali/i);
    expect(spec.project.problem).not.toBe(spec.project.description);
    expect(spec.project.problem).not.toMatch(/\bgw\b/i);
    expect(spec.goals?.primary[0]?.statement).not.toMatch(/manual lagi|aja kali/i);

    expect((spec.features?.length ?? 0) >= 3).toBe(true);
    expect(spec.features?.some((feature) => /stok|penjualan|pembayaran|buku/i.test(feature.name))).toBe(
      true,
    );
    expect(spec.features?.every((feature) => feature.name !== feature.description)).toBe(true);
    expect(spec.features?.every((feature) => !/lewat|aja kali|via rekening/i.test(feature.name))).toBe(
      true,
    );
    expect(spec.features?.map((feature) => `${feature.name} ${feature.description}`).join(" ")).not.toMatch(
      /aja kali ya/i,
    );

    const entityNames = spec.database?.entities?.map((entity) => entity.name) ?? [];
    expect(entityNames.length).toBeGreaterThanOrEqual(3);
    expect(entityNames).not.toContain("Item");
    expect(entityNames).not.toContain("Catat");
    expect(entityNames).not.toContain("Kelola");
    expect(entityNames.some((name) => /stok|penjualan|pembayaran|buku/i.test(name))).toBe(true);
    expect(entityNames).not.toContain("Pembayaran Via Rekening Tetap");

    expect(spec.stack?.frontend).toBe("React");
    expect(spec.stack?.backend).toBe("Go");
    expect((spec.aiRules?.length ?? 0) >= 2).toBe(true);
    expect(spec.aiRules?.map((rule) => `${rule.title} ${rule.body}`).join(" ")).toMatch(
      /stok|penjualan|pembayaran|buku/i,
    );

    const generated = await generation.generate({
      projectId: view.projectId,
      targets: ["cursor", "agents-md"],
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) {
      throw new Error(generated.error.message);
    }
    expect(generated.view.docs.some((file) => file.path.endsWith("PRD.md"))).toBe(true);
    expect(generated.view.docs.some((file) => file.path.endsWith("ERD.md"))).toBe(true);
    expect(generated.view.jobs.length).toBeGreaterThanOrEqual(3);

    const prd = renderPrd(spec);
    const erd = renderErd(spec);
    expect(prd).toContain(spec.project.name);
    expect(prd).not.toMatch(/\bgw mau bikin\b/i);
    expect(spec.api?.endpoints.every((endpoint) => !/^\/api\/items?$/i.test(endpoint.path))).toBe(
      true,
    );
    expect(prd).toMatch(/\/api\/(buku|pembayaran|penjualan|stok)/i);
    expect(erd).not.toMatch(/\| Item \|/);
    expect(erd).toMatch(/stok|penjualan|pembayaran|buku/i);

    const jobs = buildGenerationJobs(spec);
    expect(jobs.some((job) => /item/i.test(job.title))).toBe(false);

    const zip = await generation.exportZip({
      projectId: view.projectId,
      targets: ["cursor", "agents-md"],
    });
    expect(zip.filename).toMatch(/^vrompt-.+\.zip$/);
    expect(zip.bytes.byteLength).toBeGreaterThan(256);
  });
});
