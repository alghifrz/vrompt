import { describe, expect, it } from "vitest";
import { buildGenerationJobs } from "../../core/generation/jobs";
import type { InterviewPhase } from "../../core/interview/types";
import { createRequireAuth } from "../auth/require-auth";
import { createDevelopmentLLMProvider } from "../llm/development-provider";
import {
  createMemoryInterviewRepository,
  createMemoryProjectRepository,
  createMemoryStore,
} from "../repositories/memory";
import { createInterviewFlow } from "./interview-flow";
import { createReviewFlow } from "./review-flow";

const scenarios: Array<{
  name: string;
  answers: Partial<Record<InterviewPhase, string>>;
}> = [
  {
    name: "clinic",
    answers: {
      discovery: "gw mau bikin app buat dokter klinik, janji temu pasien biar antriannya ga kacau",
      goals: "biar jadwal pasien rapi, ga telat lagi",
      features: "ingetin pasien via wa aja kali ya",
      users: "dokter klinik",
      stack: "gatau",
      architecture: "gatau",
      database: "terserah",
      api: "gatau",
      security: "gatau",
      ai_rules: "yang simple aja",
      review: "oke",
    },
  },
  {
    name: "habits",
    answers: {
      discovery: "Aplikasi habit tracker namanya Daities",
      goals: "bangun pagi, olahraga, baca buku",
      features: "streak sama reminder",
      users: "orang yang mau disiplin",
      stack: "next js",
      architecture: "gatau",
      database: "gatau",
      api: "gatau",
      security: "gatau",
      ai_rules: "gatau",
      review: "oke",
    },
  },
  {
    name: "assignments",
    answers: {
      discovery: "mau bikin app buat nyatet tugas kuliah biar ga kelewat",
      goals: "semua deadline keliatan",
      features: "kasih prioritas aja",
      users: "mahasiswa",
      stack: "gatau",
      architecture: "gatau",
      database: "gatau",
      api: "gatau",
      security: "gatau",
      ai_rules: "gatau",
      review: "oke",
    },
  },
];

describe("generated artifact quality samples", () => {
  it("keeps names, features, tables, and AI rules clean across different ideas", async () => {
    const summaries = [];

    for (const scenario of scenarios) {
      const store = createMemoryStore();
      const projects = createMemoryProjectRepository(store);
      const interviews = createMemoryInterviewRepository(store);
      const requireAuth = createRequireAuth(async () => ({ userId: `user-${scenario.name}` }));
      let nextId = 0;
      const interview = createInterviewFlow({
        requireAuth,
        projects,
        interviews,
        createProvider: () => createDevelopmentLLMProvider(),
        ids: { next: () => `${scenario.name}-${String((nextId += 1))}` },
      });
      const review = createReviewFlow({
        requireAuth,
        projects,
        createProvider: () => createDevelopmentLLMProvider(),
      });

      const started = await interview.startProject();
      if (!started.ok) {
        throw new Error(started.error?.message ?? "start failed");
      }
      let view = started.view;
      for (let turn = 0; turn < 16 && !view.completed; turn += 1) {
        const next = await interview.submitAnswer({
          projectId: view.projectId,
          sessionId: view.sessionId,
          answer: scenario.answers[view.phase] ?? "lanjut",
        });
        if (!next.ok) {
          throw new Error(next.error?.message ?? "answer failed");
        }
        view = next.view;
      }

      const loaded = await review.load(view.projectId);
      if (!loaded.ok) {
        throw new Error(loaded.error.message);
      }
      const spec = loaded.view.spec;
      const labels = [
        spec.project.name,
        ...(spec.features ?? []).map((feature) => feature.name),
        ...(spec.database?.entities?.map((entity) => entity.name) ?? []),
      ].join(" ");
      const entities = (spec.database?.entities?.map((entity) => entity.name) ?? []).join(" ");
      expect(view.completed).toBe(true);
      expect(labels).not.toMatch(
        /\bmudah\b|\bkelewat\b|\bnyatet\b|orang yang|\bdaitie\b|\btuga\b|\bsemua\b|\bantrian\b|(?<!pengguna )utama/i,
      );
      expect(entities).not.toMatch(/^(ingatkan|catat|kelola)$/i);
      expect(entities.split(" ").every((name) => !/^(ingatkan|catat|kelola)$/i.test(name))).toBe(true);
      expect((spec.aiRules?.length ?? 0) >= 2).toBe(true);
      expect(spec.aiRules?.some((rule) => /pekerjaan|jobs|tabel|tables/i.test(`${rule.title} ${rule.body}`))).toBe(
        true,
      );
      expect(buildGenerationJobs(spec).length).toBeGreaterThanOrEqual(3);
      summaries.push(spec.project.name);
    }

    expect(summaries).toHaveLength(3);
  });
});
