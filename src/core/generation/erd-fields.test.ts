import { describe, expect, it } from "vitest";
import type { DomainModel } from "../spec/domain";
import { buildExpertFields } from "./erd-fields";

const domain: DomainModel = {
  language: "id",
  actor: {
    id: "Pemilik",
    name: "Pemilik",
    description: "Pemakai aplikasi.",
    kind: "actor",
  },
  subject: {
    id: "Buku",
    name: "Buku",
    description: "Barang yang dikelola.",
    kind: "subject",
  },
  record: {
    id: "Penjualan",
    name: "Penjualan",
    description: "Transaksi penjualan.",
    kind: "record",
  },
  slug: "penjualan",
  endpoints: [],
  features: [],
  entities: [
    {
      id: "Pemilik",
      name: "Pemilik",
      description: "Pemakai aplikasi.",
      kind: "actor",
    },
    {
      id: "Buku",
      name: "Buku",
      description: "Barang yang dikelola.",
      kind: "subject",
    },
    {
      id: "Stok",
      name: "Stok",
      description: "Jumlah barang.",
      kind: "record",
    },
    {
      id: "Penjualan",
      name: "Penjualan",
      description: "Transaksi penjualan.",
      kind: "record",
    },
    {
      id: "Pembayaran",
      name: "Pembayaran",
      description: "Pembayaran lewat rekening.",
      kind: "record",
    },
  ],
  relationships: [],
};

describe("expert ERD fields", () => {
  it("adds quantity, money, and method fields from interview cues", () => {
    const stok = buildExpertFields(domain.entities[2]!, domain);
    const pembayaran = buildExpertFields(domain.entities[4]!, domain);
    const penjualan = buildExpertFields(domain.entities[3]!, domain);

    expect(stok.map((field) => field.name)).toContain("quantity");
    expect(pembayaran.map((field) => field.name)).toEqual(
      expect.arrayContaining(["amount", "paidAt", "method"]),
    );
    expect(penjualan.map((field) => field.name)).toEqual(
      expect.arrayContaining(["quantity", "amount", "soldAt"]),
    );
  });

  it("adds schedule and due dates for time-based records", () => {
    const janji = buildExpertFields(
      { id: "Janji", name: "Janji", description: "Janji temu pasien.", kind: "record" },
      { ...domain, language: "id" },
    );
    const tugas = buildExpertFields(
      { id: "Tugas", name: "Tugas", description: "Tugas kuliah dengan deadline.", kind: "record" },
      domain,
    );

    expect(janji.map((field) => field.name)).toContain("scheduledAt");
    expect(tugas.map((field) => field.name)).toEqual(expect.arrayContaining(["dueAt", "priority"]));
  });
});
