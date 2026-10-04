import { describe, expect, it } from "vitest";
import type { ProjectSpec } from "../schema/project-spec";
import { extractJobs } from "./jobs";

const spec: ProjectSpec = {
  project: {
    name: "Toko Buku",
    description: "Aplikasi web untuk pemilik toko buku mengelola penjualan dan stok.",
    problem: "Pencatatan penjualan toko buku masih manual.",
    targetUsers: ["Pemilik toko buku"],
    type: "web application",
    status: "draft",
  },
};

describe("product jobs", () => {
  it("reads jobs from the conversation instead of copying a sentence", () => {
    const jobs = extractJobs(spec, "pembayaran lewat rekening tetap aja kali ya");
    const names = jobs.map((job) => job.name);

    expect(names.some((name) => /penjualan|stok/i.test(name))).toBe(true);
    expect(names.some((name) => /pembayaran/i.test(name))).toBe(true);
    expect(names.some((name) => /lihat|view/i.test(name))).toBe(true);
    expect(names.join(" ")).not.toMatch(/rekening|tetap aja|lewat/i);
  });

  it("keeps Indonesian nouns intact and ignores leftover outcome words", () => {
    const jobs = extractJobs(
      {
        project: {
          name: "Tugas Kuliah",
          description: "Aplikasi untuk mencatat tugas kuliah.",
          problem: "Deadline masih mudah kelewat.",
          targetUsers: ["Mahasiswa"],
          type: "web application",
          status: "draft",
        },
      },
      "nyatet tugas kuliah, kasih prioritas",
    );
    const names = jobs.map((job) => job.name).join(" ");

    expect(names).toMatch(/tugas/i);
    expect(names).not.toMatch(/tuga\b|kelewat|mudah|nyatet/i);
  });
});
