import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import {
  isWeakDatabase,
  recommendedDatabase,
  recommendedFeatures,
  shouldExpandFeatures,
} from "./domain";

const bookstore: ProjectSpec = {
  project: {
    name: "Toko Buku",
    description: "Aplikasi web untuk pemilik toko buku mengelola penjualan dan stok.",
    problem: "Pencatatan penjualan toko buku masih manual.",
    targetUsers: ["Pemilik toko buku"],
    type: "web application",
    status: "draft",
  },
  features: [
    {
      id: "feature-1",
      name: "Pembayaran via Rekening Tetap",
      description:
        "Memungkinkan pengguna melakukan pembayaran pesanan melalui nomor rekening tetap.",
      priority: "must",
      status: "planned",
      acceptanceCriteria: [],
    },
  ],
  users: [
    {
      id: "user-1",
      name: "Penjual Toko Buku",
      description: "Pemilik toko buku yang menggunakan aplikasi.",
      goals: ["Mengelola penjualan"],
      permissions: ["use-app"],
    },
  ],
  database: {
    entities: [
      {
        id: "entity-1",
        name: "Penjual Toko Buku",
        description: "Pemilik toko buku yang menggunakan aplikasi.",
      },
      {
        id: "entity-2",
        name: "Pembayaran Via Rekening Tetap",
        description: "Metode pembayaran melalui nomor rekening tetap.",
      },
    ],
  },
};

describe("domain blueprint", () => {
  it("expands a bookstore idea into a first-version feature catalog", () => {
    expect(shouldExpandFeatures(bookstore)).toBe(true);
    const features = recommendedFeatures(bookstore);
    const names = features.map((feature) => feature.name);

    expect(names).toContain("Pembayaran via Rekening Tetap");
    expect(names.some((name) => /buku|stok|penjualan|pelanggan/i.test(name))).toBe(true);
    expect(features.length).toBeGreaterThanOrEqual(3);
  });

  it("replaces persona-and-feature tables with nouns from the interview", () => {
    expect(isWeakDatabase(bookstore)).toBe(true);

    const database = recommendedDatabase(bookstore);
    const names = database.entities?.map((entity) => entity.name) ?? [];

    expect(names.some((name) => /buku|penjualan|pesanan|pembayaran|stok|pelanggan/i.test(name))).toBe(
      true,
    );
    expect(names).not.toContain("Pembayaran Via Rekening Tetap");
    expect(names.length).toBeGreaterThanOrEqual(3);
  });
});
