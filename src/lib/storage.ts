import type { InputHarta, PembayaranZakat, Transaksi } from "./zakat";

const KEY = "zakat-tracker-v4";
const KEY_V3 = "zakat-tracker-v3";

export const inputKosong: InputHarta = {
  hargaEmasSekarang: 0,
  transaksi: [],
  riwayat: [],
};

interface RiwayatV3 {
  id: string;
  tanggal: string;
  jumlah: number;
  catatan?: string;
}
interface DataV3 {
  hargaEmasSekarang?: number;
  transaksi?: Transaksi[];
  riwayat?: RiwayatV3[];
}

function migrasiV3(raw: string): InputHarta | null {
  try {
    const v3 = JSON.parse(raw) as DataV3;
    const riwayat: PembayaranZakat[] = (v3.riwayat ?? []).map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      gramZakat: 0,
      metode: "tunai",
      jumlah: r.jumlah ?? 0,
      catatan: r.catatan,
    }));
    return {
      hargaEmasSekarang: v3.hargaEmasSekarang ?? 0,
      transaksi: Array.isArray(v3.transaksi) ? v3.transaksi : [],
      riwayat,
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
    const rawV3 = window.localStorage.getItem(KEY_V3);
    if (rawV3) {
      const migrasi = migrasiV3(rawV3);
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
    // abaikan
  }
}

export function idBaru(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
