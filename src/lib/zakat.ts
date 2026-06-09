// Logika inti zakat maal emas: transaksi beli & jual + akumulasi + haul.
//
// Model haul: emas dicatat sebagai transaksi (beli menambah, jual mengurangi).
// Gram diakumulasi kronologis. Saat total mencapai nishab (85 gram), tanggal
// itu menjadi "anchor" haul. Bila total turun di bawah nishab (mis. karena
// dijual), haul TERPUTUS dan anchor di-reset — haul baru dimulai saat total
// kembali mencapai nishab. Setelah haul genap 1 tahun hijriah (≈354 hari) dan
// total masih ≥ nishab, wajib zakat 2,5% dari nilai emas saat ini.

export const NISHAB_EMAS_GRAM = 85;
export const KADAR_ZAKAT = 0.025; // 2,5%
export const HAUL_HARI = 354; // 1 tahun hijriah ≈ 354,367 hari, dibulatkan

export type JenisTransaksi = "beli" | "jual";

export interface Transaksi {
  id: string;
  jenis: JenisTransaksi;
  /** Tanggal transaksi (ISO yyyy-mm-dd). */
  tanggal: string;
  /** Jumlah emas (gram). */
  gram: number;
  /** Harga per gram saat transaksi (Rupiah) — untuk arsip & hitung untung/rugi. */
  hargaPerGram: number;
}

export interface PembayaranZakat {
  id: string;
  /** Tanggal pembayaran (ISO yyyy-mm-dd). */
  tanggal: string;
  /** Jumlah zakat yang dibayar (Rupiah). */
  jumlah: number;
  /** Catatan opsional (mis. lembaga/keterangan). */
  catatan?: string;
}

export interface InputHarta {
  /** Harga emas per gram saat ini (Rupiah) — untuk valuasi & jumlah zakat. */
  hargaEmasSekarang: number;
  /** Daftar transaksi emas (beli/jual). */
  transaksi: Transaksi[];
  /** Riwayat pembayaran zakat. */
  riwayat: PembayaranZakat[];
}

export interface RincianTransaksi extends Transaksi {
  /** Total gram kumulatif setelah transaksi ini. */
  kumulatifGram: number;
  /** Nilai transaksi = gram × hargaPerGram. */
  nilai: number;
  /** True jika transaksi ini yang memulai haul yang sedang berjalan. */
  pencetusNishab: boolean;
}

export interface HasilZakat {
  /** Transaksi terurut tanggal (terlama → terbaru) + info kumulatif. */
  rincian: RincianTransaksi[];
  totalGramEmas: number;
  /** Modal bersih = total beli − total jual (Rupiah). */
  modalBersih: number;
  /** Nilai emas saat ini = totalGram × hargaEmasSekarang. */
  nilaiEmas: number;
  /** Selisih nilai sekarang − modal bersih (bisa negatif). */
  keuntungan: number;
  nishabGram: number;
  mencapaiNishab: boolean;
  kekuranganGram: number;
  /** Tanggal total mencapai nishab untuk haul yang sedang berjalan, atau null. */
  tanggalNishabTercapai: string | null;
  tanggalJatuhTempoHaul: string | null;
  hariBerlalu: number;
  sisaHariHaul: number;
  haulGenap: boolean;
  wajibZakat: boolean;
  jumlahZakat: number;
  /** Total zakat yang sudah dibayar (Rupiah). */
  totalDibayar: number;
}

function selisihHari(a: Date, b: Date): number {
  const msPerHari = 24 * 60 * 60 * 1000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ub - ua) / msPerHari);
}

function tambahHari(tanggal: Date, hari: number): Date {
  const d = new Date(tanggal);
  d.setDate(d.getDate() + hari);
  return d;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tanggalValid(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return !Number.isNaN(new Date(iso + "T00:00:00").getTime());
}

export function hitungZakat(input: InputHarta, sekarang: Date = new Date()): HasilZakat {
  const hargaSekarang = Math.max(0, input.hargaEmasSekarang);

  // Catatan: JANGAN filter gram>0 di sini — semua transaksi harus muncul
  // sebagai baris agar bisa diisi. Transaksi gram=0 hanya menambah 0 (aman).
  const valid = input.transaksi
    .slice()
    .sort((a, b) => {
      const ka = tanggalValid(a.tanggal) ? a.tanggal : "9999-99-99";
      const kb = tanggalValid(b.tanggal) ? b.tanggal : "9999-99-99";
      return ka.localeCompare(kb);
    });

  let kumulatif = 0;
  let anchorTanggal: string | null = null;
  let anchorTxId: string | null = null;

  const interim = valid.map((t) => {
    kumulatif += (t.jenis === "jual" ? -1 : 1) * t.gram;
    if (kumulatif < 0) kumulatif = 0;
    // Naik mencapai nishab → mulai haul (jika belum ada anchor).
    if (kumulatif >= NISHAB_EMAS_GRAM && anchorTanggal === null && tanggalValid(t.tanggal)) {
      anchorTanggal = t.tanggal;
      anchorTxId = t.id;
    }
    // Turun di bawah nishab → haul terputus, reset anchor.
    if (kumulatif < NISHAB_EMAS_GRAM) {
      anchorTanggal = null;
      anchorTxId = null;
    }
    return {
      ...t,
      kumulatifGram: kumulatif,
      nilai: t.gram * Math.max(0, t.hargaPerGram),
    };
  });

  const rincian: RincianTransaksi[] = interim.map((r) => ({
    ...r,
    pencetusNishab: r.id === anchorTxId,
  }));

  const totalGramEmas = kumulatif;
  const modalBersih = rincian.reduce(
    (s, r) => s + (r.jenis === "jual" ? -r.nilai : r.nilai),
    0,
  );
  const nilaiEmas = totalGramEmas * hargaSekarang;
  const keuntungan = nilaiEmas - modalBersih;

  const mencapaiNishab = totalGramEmas >= NISHAB_EMAS_GRAM;
  const kekuranganGram = Math.max(0, NISHAB_EMAS_GRAM - totalGramEmas);

  let tanggalJatuhTempoHaul: string | null = null;
  let hariBerlalu = 0;
  let sisaHariHaul = HAUL_HARI;
  let haulGenap = false;

  if (anchorTanggal) {
    const mulai = new Date(anchorTanggal + "T00:00:00");
    hariBerlalu = Math.max(0, selisihHari(mulai, sekarang));
    sisaHariHaul = Math.max(0, HAUL_HARI - hariBerlalu);
    tanggalJatuhTempoHaul = toISODate(tambahHari(mulai, HAUL_HARI));
    haulGenap = hariBerlalu >= HAUL_HARI;
  }

  const wajibZakat = mencapaiNishab && haulGenap;
  const jumlahZakat = nilaiEmas * KADAR_ZAKAT;
  const totalDibayar = input.riwayat.reduce((s, r) => s + Math.max(0, r.jumlah), 0);

  return {
    rincian,
    totalGramEmas,
    modalBersih,
    nilaiEmas,
    keuntungan,
    nishabGram: NISHAB_EMAS_GRAM,
    mencapaiNishab,
    kekuranganGram,
    tanggalNishabTercapai: anchorTanggal,
    tanggalJatuhTempoHaul,
    hariBerlalu,
    sisaHariHaul,
    haulGenap,
    wajibZakat,
    jumlahZakat,
    totalDibayar,
  };
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatGram(n: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)} gram`;
}

export function formatTanggalID(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
