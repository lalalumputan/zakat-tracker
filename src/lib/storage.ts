import type { InputHarta, Transaksi } from "./zakat";

const KEY = "zakat-tracker-v3";
const KEY_LAMA = "zakat-tracker-v2";

export const inputKosong: InputHarta = {
  hargaEmasSekarang: 0,
  transaksi: [],
  riwayat: [],
};

interface DataV2 {
  hargaEmasSekarang?: number;
  pembelian?: Array<{
    id: string;
    tanggal: string;
    gram: number;
    hargaBeliPerGram: number;
  }>;
}

/** Migrasi data v2 (hanya pembelian) → v3 (transaksi beli/jual + riwayat). */
function migrasiV2(raw: string): InputHarta | null {
  try {
    const v2 = JSON.parse(raw) as DataV2;
    const transaksi: Transaksi[] = (v2.pembelian ?? []).map((p) => ({
      id: p.id,
      jenis: "beli",
      tanggal: p.tanggal,
      gram: p.gram,
      hargaPerGram: p.hargaBeliPerGram,
    }));
    return {
      hargaEmasSekarang: v2.hargaEmasSekarang ?? 0,
      transaksi,
      riwayat: [],
    };
  } catch {
    return null;
  }
}

export function muatInput(): InputHarta {
  if (typeof window === "undefined") return inputKosong;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InputHarta>;
      return {
        hargaEmasSekarang: parsed.hargaEmasSekarang ?? 0,
        transaksi: Array.isArray(parsed.transaksi) ? parsed.transaksi : [],
        riwayat: Array.isArray(parsed.riwayat) ? parsed.riwayat : [],
      };
    }
    // Coba migrasi dari v2
    const rawLama = window.localStorage.getItem(KEY_LAMA);
    if (rawLama) {
      const migrasi = migrasiV2(rawLama);
      if (migrasi) {
        simpanInput(migrasi);
        return migrasi;
      }
    }
    return inputKosong;
  } catch {
    return inputKosong;
  }
}

export function simpanInput(input: InputHarta): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(input));
  } catch {
    // abaikan (mis. storage penuh / mode privat)
  }
}

export function idBaru(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
