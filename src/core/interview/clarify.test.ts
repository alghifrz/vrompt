import { describe, expect, it } from "vitest";
import { createInitialProjectSpec, createInterviewSession } from "./engine";
import {
  clarifyingQuestion,
  needsClarification,
  shouldClarifyPhase,
} from "./clarify";

describe("interview clarify", () => {
  it("asks when the idea is only 'want an app' and the spec is still empty", () => {
    const spec = createInitialProjectSpec();
    const session = createInterviewSession({ id: "clarify-1" });

    expect(needsClarification("discovery", "mau bikin app", spec)).toBe(true);
    expect(needsClarification("discovery", "mau bikin aplikasi", spec)).toBe(true);
    expect(needsClarification("discovery", "gw mau bikin app manage ibadah ramadhan", spec)).toBe(
      true,
    );
    expect(
      shouldClarifyPhase({
        phase: "discovery",
        answer: "mau bikin app",
        spec,
        session: {
          ...session,
          messages: [
            { role: "assistant", content: "What are you building?" },
            { role: "user", content: "mau bikin app" },
          ],
        },
      }),
    ).toBe(true);
    expect(clarifyingQuestion("discovery", "mau bikin app", spec)).toMatch(
      /pekerjaan pertama|first job/i,
    );
  });

  it("does not ask again when a clear bookstore or clinic job is already there", () => {
    const spec = createInitialProjectSpec();

    expect(
      needsClarification(
        "discovery",
        "gw mau bikin app buat pemilik toko buku, catat stok sama penjualan biar ga ribet",
        spec,
      ),
    ).toBe(false);
    expect(
      needsClarification(
        "discovery",
        "gw mau bikin app buat dokter klinik, janji temu pasien biar antriannya ga kacau",
        spec,
      ),
    ).toBe(false);
    expect(
      needsClarification("discovery", "Aplikasi habit tracker namanya Daities", spec),
    ).toBe(false);
    expect(needsClarification("features", "pembayaran lewat rekening tetap aja", spec)).toBe(
      false,
    );
    expect(needsClarification("users", "pemilik toko buku", spec)).toBe(false);
  });

  it("stays when the model says it is still confused", () => {
    const spec = {
      ...createInitialProjectSpec(),
      project: {
        ...createInitialProjectSpec().project,
        name: "FieldKit",
        description: "A field-service toolkit.",
        problem: "Visit details live in separate tools.",
        targetUsers: ["Dispatchers"],
        type: "web application",
      },
    };

    expect(
      shouldClarifyPhase({
        phase: "discovery",
        answer: "FieldKit for dispatchers.",
        spec,
        session: {
          ...createInterviewSession({ id: "clarify-2" }),
          messages: [
            { role: "assistant", content: "What are you building?" },
            { role: "user", content: "FieldKit for dispatchers." },
          ],
        },
        modelClarify: true,
      }),
    ).toBe(true);
  });

  it("does not block oke, lanjut, or gatau", () => {
    const spec = createInitialProjectSpec();
    const session = createInterviewSession({ id: "clarify-3" });

    expect(
      shouldClarifyPhase({
        phase: "discovery",
        answer: "lanjut",
        spec,
        session,
        modelClarify: true,
      }),
    ).toBe(false);
    expect(
      shouldClarifyPhase({
        phase: "features",
        answer: "gatau",
        spec,
        session,
      }),
    ).toBe(false);
  });
});
