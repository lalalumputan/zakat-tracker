import type { InputHarta } from "./zakat";

const KEY = "zakat-tracker-v2";

export const inputKosong: InputHarta = {
  hargaEmasSekarang: 0,
  pembelian: [],
};

export function muatInput(): InputHarta {
  if (typeof window === "undefined") return inputKosong;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return inputKosong;
    const parsed = JSON.parse(raw) as Partial<InputHarta>;
    return {
      hargaEmasSekarang: parsed.hargaEmasSekarang ?? 0,
      pembelian: Array.isArray(parsed.pembelian) ? parsed.pembelian : [],
    };
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
