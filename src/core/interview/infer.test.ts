import { describe, expect, it } from "vitest";
import { createInitialProjectSpec } from "./engine";
import {
  inferPhasePatch,
  isAcceptanceAnswer,
  isExplicitSkipAnswer,
  isUnsureAnswer,
  recommendPhasePatch,
} from "./infer";

describe("interview infer", () => {
  it("treats 'I do not know' as unsure, not an empty skip", () => {
    expect(isUnsureAnswer("gatau")).toBe(true);
    expect(isUnsureAnswer("idk")).toBe(true);
    expect(isUnsureAnswer("terserah")).toBe(true);
    expect(isUnsureAnswer("ga ada")).toBe(true);
    expect(isExplicitSkipAnswer("tidak perlu")).toBe(true);
    expect(isExplicitSkipAnswer("gatau")).toBe(false);
    expect(isUnsureAnswer("bangun pagi dan olahraga")).toBe(false);
    expect(isAcceptanceAnswer("oke boleh")).toBe(true);
    expect(isAcceptanceAnswer("iya")).toBe(true);
    expect(isAcceptanceAnswer("lanjutkan")).toBe(true);
    expect(isAcceptanceAnswer("ia lanjutkan")).toBe(true);
    expect(isAcceptanceAnswer("iiya setuju")).toBe(true);
    expect(isAcceptanceAnswer("iiya boleh")).toBe(true);
    expect(isAcceptanceAnswer("iya pakai yang rekomendasi aja")).toBe(true);
    expect(isAcceptanceAnswer("yang anda rekomendasikan saja")).toBe(true);
    expect(isAcceptanceAnswer("ok hosted auth")).toBe(true);
  });

  it("still recommends security when the spec only has an empty security object", () => {
    const patch = recommendPhasePatch("security", {
      ...createInitialProjectSpec(),
      security: {},
    });

    expect(patch?.security?.authentication?.[0]).toMatch(/hosted auth/i);
  });

  it("fills discovery from one informal answer", () => {
    const patch = inferPhasePatch(
      "discovery",
      "Aplikasi habit tracker namanya Daities",
      createInitialProjectSpec(),
    );

    expect(patch?.project?.name).toBe("Aplikasi habit tracker namanya Daities");
    expect(patch?.project?.description).toContain("Daities");
    expect(patch?.project?.targetUsers).toEqual(["Primary users"]);
  });

  it("turns a short goals answer into one primary goal", () => {
    const patch = inferPhasePatch("goals", "bangun pagi, olahraga, baca buku", {
      ...createInitialProjectSpec(),
    });

    expect(patch?.goals?.primary).toEqual([
      {
        id: "goal-1",
        statement: "bangun pagi, olahraga, baca buku",
      },
    ]);
  });

  it("maps a casual stack answer into frontend and backend", () => {
    const patch = inferPhasePatch(
      "stack",
      "untuk fe gw mau pakai react aja, trus backend pakai golang",
      createInitialProjectSpec(),
    );

    expect(patch?.stack).toMatchObject({
      frontend: "React",
      backend: "Go",
    });
    expect(patch?.stack?.additional ?? []).toEqual([]);
  });

  it("recommends a beginner stack when the user does not know", () => {
    const patch = recommendPhasePatch("stack", createInitialProjectSpec());

    expect(patch?.stack).toMatchObject({
      frontend: "Next.js",
      database: "Postgres",
      authentication: "Clerk",
    });
  });

  it("expands a bookstore answer into several first-version features", () => {
    const spec = {
      ...createInitialProjectSpec(),
      project: {
        ...createInitialProjectSpec().project,
        name: "Toko Buku",
        description: "Aplikasi untuk pemilik toko buku.",
        problem: "Penjualan dan stok masih dicatat manual.",
        targetUsers: ["Pemilik toko buku"],
        type: "web application",
      },
    };
    const patch = inferPhasePatch(
      "features",
      "pembayaran lewat rekening tetap aja kali ya",
      spec,
    );

    expect((patch?.features?.length ?? 0) >= 3).toBe(true);
    expect(
      patch?.features?.some((feature) => /buku|stok|penjualan|pelanggan|pembayaran/i.test(feature.name)),
    ).toBe(true);
  });

  it("recommends attendance tables instead of Item", () => {
    const spec = {
      ...createInitialProjectSpec(),
      project: {
        ...createInitialProjectSpec().project,
        name: "SmartAbsensi",
        description: "Aplikasi web yang membantu guru mencatat kehadiran siswa.",
        problem: "Pencatatan kehadiran siswa secara manual setiap hari.",
        targetUsers: ["guru"],
      },
      features: [
        {
          id: "feature-1",
          name: "Mengabsen Siswa",
          description: "Mencatat kehadiran siswa secara digital.",
          priority: "must" as const,
          status: "planned" as const,
          acceptanceCriteria: [],
        },
      ],
      users: [
        {
          id: "user-1",
          name: "guru",
          description: "Guru mencatat kehadiran siswa.",
          goals: ["Mengabsen siswa"],
          permissions: ["use-app"],
        },
      ],
    };

    const database = recommendPhasePatch("database", spec);
    const api = recommendPhasePatch("api", spec);

    expect(database?.database?.entities?.map((entity) => entity.name)).toEqual([
      "Guru",
      "Siswa",
      "Kehadiran",
    ]);
    expect(api?.api?.endpoints?.some((endpoint) => endpoint.path === "/api/items")).toBe(
      false,
    );
    expect(api?.api?.endpoints?.some((endpoint) => endpoint.path === "/api/kehadiran")).toBe(
      true,
    );
  });
});
