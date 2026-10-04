import { describe, expect, it } from "vitest";
import {
  interpretDiscovery,
  interpretGoal,
  interpretProductName,
  interpretUser,
  looksLikeRawChat,
  looksLikeSpokenName,
} from "./interpret";

describe("interview interpret", () => {
  it("extracts a named product instead of copying the sentence", () => {
    const project = interpretDiscovery("Aplikasi habit tracker namanya Daities");

    expect(project.name).toBe("Daities");
    expect(project.description).toMatch(/habit tracker/i);
    expect(project.description).not.toMatch(/namanya/i);
    expect(project.problem).not.toBe(project.description);
    expect(project.problem).not.toMatch(/namanya/i);
  });

  it("rewrites a casual idea into spec language", () => {
    const project = interpretDiscovery(
      "gw mau bikin app buat warung catat stok sama penjualan biar ga ribet",
    );

    expect(project.name).not.toMatch(/\bgw\b|pemilik/i);
    expect(project.name).toMatch(/warung/i);
    expect(project.name.split(/\s+/).length).toBeLessThanOrEqual(4);
    expect(project.description).toMatch(/stok/i);
    expect(project.description).toMatch(/penjualan/i);
    expect(project.description).not.toMatch(/\bgw\b|banget|ribet/i);
    expect(project.problem).toMatch(/rumit|manual/i);
    expect(project.problem).not.toBe(project.description);
  });

  it("names the product from the domain, not the actor", () => {
    const project = interpretDiscovery(
      "gw mau bikin app buat pemilik toko buku, catat stok sama penjualan biar ga ribet",
    );

    expect(project.name).toBe("Toko Buku");
    expect(project.targetUsers[0]).toMatch(/pemilik toko buku/i);
    expect(project.description).toMatch(/stok/i);
    expect(project.description).toMatch(/penjualan/i);
  });

  it("turns a spoken goal list into an outcome", () => {
    const statement = interpretGoal("bangun pagi, olahraga, baca buku", "id");

    expect(statement).toMatch(/versi pertama/i);
    expect(statement).not.toBe("bangun pagi, olahraga, baca buku");
  });

  it("rewrites a slang goal into an expert outcome", () => {
    const statement = interpretGoal("biar penjualan dan stoknya rapi, ga manual lagi", "id");

    expect(statement).toMatch(/versi pertama/i);
    expect(statement).toMatch(/penjualan|stok/i);
    expect(statement).not.toMatch(/manual lagi|biar|ga /i);
  });

  it("turns a casual user answer into a role", () => {
    const user = interpretUser("penjaga warung kek saya", "id");

    expect(user.name).toBe("Penjaga Warung");
    expect(user.description).not.toMatch(/\bkek\b/i);
    expect(user.goals[0]).not.toBe("penjaga warung kek saya");
  });

  it("does not treat a worship job as the user name", () => {
    const user = interpretUser("orang yang puasa ramadhan", "id");

    expect(user.name).toBe("Pengguna utama");
    expect(user.name).not.toMatch(/puasa/i);
  });

  it("flags chat wording and spoken names", () => {
    expect(looksLikeRawChat("gw mau bikin app")).toBe(true);
    expect(looksLikeSpokenName("Aplikasi habit tracker namanya Daities")).toBe(true);
    expect(looksLikeSpokenName("FieldKit")).toBe(false);
    expect(looksLikeRawChat("Aplikasi untuk mencatat stok warung.")).toBe(false);
  });

  it("keeps an explicit CamelCase product name", () => {
    expect(interpretProductName("FieldKit for dispatchers")).toBe("FieldKit");
  });

  it("names a ramadan worship idea from the season, not a job dump", () => {
    expect(
      interpretProductName(
        "gw mau bikin app manage ibadah ramadhan\ncatat sholat tarawih, puasa, tadarus biar ga kelewat",
      ),
    ).toBe("Ibadah Ramadhan");
  });

  it("names a clinic idea from the job, not the venue only", () => {
    const project = interpretDiscovery(
      "gw mau bikin app buat dokter klinik, janji temu pasien biar antriannya ga kacau",
    );

    expect(project.name).toMatch(/janji/i);
    expect(project.name).not.toMatch(/kacau|antrian|tanpa proses/i);
    expect(project.description).toMatch(/janji|pasien/i);
    expect(project.description).not.toMatch(/tanpa proses|kelewat/i);
  });

  it("drops slang verbs from a homework-app name", () => {
    const project = interpretDiscovery("mau bikin app buat nyatet tugas kuliah biar ga kelewat");

    expect(project.name).toMatch(/tugas/i);
    expect(project.name).not.toMatch(/nyatet|kelewat/i);
    expect(project.description).toMatch(/tugas/i);
    expect(project.description).not.toMatch(/kelewat/i);
  });

  it("does not turn a vague person phrase into a user name", () => {
    const user = interpretUser("orang yang mau disiplin", "id");

    expect(user.name).toMatch(/pengguna/i);
    expect(user.name).not.toMatch(/orang yang/i);
  });
});
