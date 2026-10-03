import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import {
  buildDomainModel,
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

    expect(names).toEqual(
      expect.arrayContaining([
        "Pembayaran via Rekening Tetap",
        "Kelola Katalog Buku",
        "Kelola Stok",
        "Catat Penjualan",
        "Data Pelanggan",
      ]),
    );
    expect(features.length).toBeGreaterThanOrEqual(4);
  });

  it("replaces persona-and-feature tables with a shop schema", () => {
    expect(isWeakDatabase(bookstore)).toBe(true);
    expect(buildDomainModel(bookstore).theme).toBe("commerce");

    const database = recommendedDatabase(bookstore);
    const names = database.entities?.map((entity) => entity.name) ?? [];

    expect(names).toEqual(
      expect.arrayContaining(["Buku", "Pelanggan", "Pesanan", "ItemPesanan", "Pembayaran"]),
    );
    expect(names).not.toContain("Pembayaran Via Rekening Tetap");
    expect(database.relationships?.length).toBeGreaterThanOrEqual(4);
  });
});
