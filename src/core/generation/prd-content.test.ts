import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import { buildDomainModel } from "../spec/domain";
import {
  experienceNotes,
  featureAcceptance,
  featureFlow,
  featureKind,
  inferredSuccessCriteria,
  journeyText,
  openQuestions,
  userStory,
  whyThisProduct,
} from "./prd-content";

function clinicSpec(): ProjectSpec {
  return {
    project: {
      name: "Janji Temu Klinik",
      description: "Aplikasi web untuk dokter mengatur janji temu pasien agar antrian tidak kacau.",
      problem: "Antrian pasien di klinik sering kacau dan jadwal terlambat.",
      targetUsers: ["dokter"],
      type: "web application",
      status: "ready",
    },
    goals: {
      primary: [{ id: "goal-1", statement: "Membuat jadwal pasien rapi tanpa telat." }],
      successCriteria: [],
    },
    features: [
      {
        id: "feature-janji",
        name: "Catat Janji Temu",
        description: "Fitur untuk menyimpan janji temu pasien.",
        priority: "must",
        status: "planned",
        acceptanceCriteria: [],
      },
      {
        id: "feature-ingat",
        name: "Ingatkan Pasien",
        description: "Pengingat janji temu lewat aplikasi.",
        priority: "should",
        status: "planned",
        acceptanceCriteria: [],
      },
    ],
    users: [
      {
        id: "user-dokter",
        name: "dokter",
        description: "Dokter klinik yang mengatur jadwal.",
        goals: ["Menjaga antrian tetap rapi"],
        permissions: ["use-app"],
      },
    ],
  };
}

function bookstoreSpec(): ProjectSpec {
  return {
    project: {
      name: "Toko Buku",
      description: "Aplikasi web untuk pemilik toko buku mencatat stok dan penjualan.",
      problem: "Penjualan dan stok masih dicatat manual.",
      targetUsers: ["Pemilik toko buku"],
      type: "web application",
      status: "ready",
    },
    features: [
      {
        id: "feature-stok",
        name: "Catat Stok",
        description: "Fitur untuk menyimpan jumlah stok buku.",
        priority: "must",
        status: "planned",
        acceptanceCriteria: [],
      },
      {
        id: "feature-jual",
        name: "Catat Penjualan",
        description: "Fitur untuk menyimpan transaksi penjualan.",
        priority: "must",
        status: "planned",
        acceptanceCriteria: [],
      },
      {
        id: "feature-bayar",
        name: "Catat Pembayaran",
        description: "Fitur untuk mencatat pembayaran pelanggan.",
        priority: "later",
        status: "planned",
        acceptanceCriteria: [],
      },
    ],
    users: [
      {
        id: "user-1",
        name: "Penjual Toko Buku",
        description: "Pemilik toko.",
        goals: ["Jualan"],
        permissions: ["use-app"],
      },
    ],
  };
}

describe("prd content", () => {
  it("classifies feature kinds from the job, not a fixed product catalog", () => {
    expect(featureKind("Visit board")).toBe("view");
    expect(featureKind("Mengabsen Siswa")).toBe("capture");
    expect(featureKind("Catat Stok")).toBe("capture");
    expect(featureKind("Ingatkan Pasien")).toBe("remind");
    expect(featureKind("Kelola Habit")).toBe("manage");
  });

  it("writes clinic PRD pieces around appointments and reminders", () => {
    const spec = clinicSpec();
    const domain = buildDomainModel(spec);

    expect(whyThisProduct(spec)).toMatch(/janji temu pasien/i);
    expect(whyThisProduct(spec)).toMatch(/jadwal pasien rapi/i);
    expect(userStory(spec, spec.features![0]!)).toContain("Sebagai Dokter");
    expect(userStory(spec, spec.features![0]!)).toMatch(/janji temu/i);
    expect(featureAcceptance(spec, spec.features![1]!).join(" ")).toMatch(/Pengingat|reminder/i);
    expect(featureFlow(spec, spec.features![1]!, domain).join(" ")).toMatch(/pengingat|reminder/i);
    expect(journeyText(spec)).toContain("Catat Janji Temu → Ingatkan Pasien");
    expect(openQuestions(spec).join(" ")).toMatch(/pengingat|reminder/i);
    expect(experienceNotes(spec).join(" ")).toContain("dokter");
    expect(experienceNotes(spec).join(" ")).not.toContain("guru atau pengguna");
  });

  it("writes bookstore PRD pieces around stock, sales, and payment", () => {
    const spec = bookstoreSpec();
    const domain = buildDomainModel(spec);

    expect(inferredSuccessCriteria(spec).join(" ")).toMatch(/Catat Stok|Catat Penjualan/);
    expect(inferredSuccessCriteria(spec).join(" ")).not.toContain("Catat Pembayaran");
    expect(userStory(spec, spec.features![0]!)).toContain("Sebagai Penjual Toko Buku");
    expect(featureAcceptance(spec, spec.features![0]!).join(" ")).toMatch(/Jumlah|quantity/i);
    expect(featureAcceptance(spec, spec.features![2]!).join(" ")).toMatch(/Nilai uang|amount/i);
    expect(featureFlow(spec, spec.features![0]!, domain).join(" ")).toMatch(/quantity|Stok/i);
    expect(openQuestions(spec).join(" ")).toMatch(/pembayaran|payment/i);
    expect(journeyText(spec)).toContain("Catat Stok → Catat Penjualan → Catat Pembayaran");
  });
});
