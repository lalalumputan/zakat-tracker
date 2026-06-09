// Logika inti zakat maal emas dengan pembelian bertahap.
//
// Model haul: emas dibeli beberapa kali. Gram diakumulasi dari pembelian
// terlama. Saat total pertama kali mencapai nishab (85 gram), tanggal itu
// menjadi "anchor" haul. Pembelian emas berikutnya (sejenis) IKUT haul harta
// pokok — tidak memulai haul sendiri (pendapat mayoritas / praktik BAZNAS).
// Setelah haul genap 1 tahun hijriah (≈354 hari) dan total masih ≥ nishab,
// wajib zakat 2,5% dari nilai emas (memakai harga emas saat ini).

/** Nishab emas dalam gram (mayoritas ulama kontemporer & BAZNAS). */
export const NISHAB_EMAS_GRAM = 85;

/** Kadar zakat maal. */
export const KADAR_ZAKAT = 0.025; // 2,5%

/**
 * Lama haul dalam hari = 1 tahun hijriah (kalender qamariah).
 * 1 tahun hijriah ≈ 354,367 hari; dibulatkan ke 354 hari (praktik umum).
 */
export const HAUL_HARI = 354;

export interface Pembelian {
  id: string;
  /** Tanggal pembelian (ISO yyyy-mm-dd). */
  tanggal: string;
  /** Jumlah emas yang dibeli (gram). */
  gram: number;
  /** Harga beli per gram saat itu (Rupiah) — untuk arsip & lihat keuntungan. */
  hargaBeliPerGram: number;
}

export interface InputHarta {
  /** Harga emas per gram saat ini (Rupiah) — untuk valuasi & jumlah zakat. */
  hargaEmasSekarang: number;
  /** Daftar pembelian emas (terakumulasi). */
  pembelian: Pembelian[];
}

export interface RincianPembelian extends Pembelian {
  /** Total gram kumulatif sampai (termasuk) pembelian ini. */
  kumulatifGram: number;
  /** Total harga beli pembelian ini = gram × hargaBeliPerGram. */
  nilaiBeli: number;
  /** True jika pembelian ini yang membuat total tembus nishab (anchor haul). */
  pencetusNishab: boolean;
}

export interface HasilZakat {
  /** Pembelian terurut tanggal (terlama → terbaru) + info kumulatif. */
  rincian: RincianPembelian[];
  /** Total emas dimiliki (gram). */
  totalGramEmas: number;
  /** Total modal (harga beli) seluruh emas. */
  totalModalEmas: number;
  /** Nilai emas saat ini = totalGram × hargaEmasSekarang. */
  nilaiEmas: number;
  /** Selisih nilai sekarang − modal (bisa negatif). */
  keuntungan: number;
  nishabGram: number;
  /** Apakah total gram ≥ nishab. */
  mencapaiNishab: boolean;
  /** Kekurangan gram menuju nishab (0 jika sudah tercapai). */
  kekuranganGram: number;
  /** Tanggal total pertama kali mencapai nishab (anchor haul) atau null. */
  tanggalNishabTercapai: string | null;
  /** Tanggal jatuh tempo haul (anchor + 354 hari) atau null. */
  tanggalJatuhTempoHaul: string | null;
  hariBerlalu: number;
  sisaHariHaul: number;
  haulGenap: boolean;
  /** Wajib zakat = mencapai nishab DAN haul genap. */
  wajibZakat: boolean;
  /** Jumlah zakat = 2,5% × nilai emas saat ini. */
  jumlahZakat: number;
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

/**
 * Hitung status & jumlah zakat dari daftar pembelian emas.
 * @param sekarang tanggal acuan (default hari ini) — bisa di-inject untuk test.
 */
export function hitungZakat(input: InputHarta, sekarang: Date = new Date()): HasilZakat {
  const hargaSekarang = Math.max(0, input.hargaEmasSekarang);

  // Hanya pembelian dengan gram > 0; urut tanggal (yang tak bertanggal di akhir).
  const valid = input.pembelian
    .filter((p) => p.gram > 0)
    .slice()
    .sort((a, b) => {
      const ka = tanggalValid(a.tanggal) ? a.tanggal : "9999-99-99";
      const kb = tanggalValid(b.tanggal) ? b.tanggal : "9999-99-99";
      return ka.localeCompare(kb);
    });

  let kumulatif = 0;
  let anchor: string | null = null;
  const rincian: RincianPembelian[] = valid.map((p) => {
    const sebelum = kumulatif;
    kumulatif += p.gram;
    const pencetusNishab =
      anchor === null &&
      sebelum < NISHAB_EMAS_GRAM &&
      kumulatif >= NISHAB_EMAS_GRAM &&
      tanggalValid(p.tanggal);
    if (pencetusNishab) anchor = p.tanggal;
    return {
      ...p,
      kumulatifGram: kumulatif,
      nilaiBeli: p.gram * Math.max(0, p.hargaBeliPerGram),
      pencetusNishab,
    };
  });

  const totalGramEmas = kumulatif;
  const totalModalEmas = rincian.reduce((s, r) => s + r.nilaiBeli, 0);
  const nilaiEmas = totalGramEmas * hargaSekarang;
  const keuntungan = nilaiEmas - totalModalEmas;

  const mencapaiNishab = totalGramEmas >= NISHAB_EMAS_GRAM;
  const kekuranganGram = Math.max(0, NISHAB_EMAS_GRAM - totalGramEmas);

  let tanggalJatuhTempoHaul: string | null = null;
  let hariBerlalu = 0;
  let sisaHariHaul = HAUL_HARI;
  let haulGenap = false;

  if (anchor) {
    const mulai = new Date(anchor + "T00:00:00");
    hariBerlalu = Math.max(0, selisihHari(mulai, sekarang));
    sisaHariHaul = Math.max(0, HAUL_HARI - hariBerlalu);
    tanggalJatuhTempoHaul = toISODate(tambahHari(mulai, HAUL_HARI));
    haulGenap = hariBerlalu >= HAUL_HARI;
  }

  const wajibZakat = mencapaiNishab && haulGenap;
  const jumlahZakat = nilaiEmas * KADAR_ZAKAT;

  return {
    rincian,
    totalGramEmas,
    totalModalEmas,
    nilaiEmas,
    keuntungan,
    nishabGram: NISHAB_EMAS_GRAM,
    mencapaiNishab,
    kekuranganGram,
    tanggalNishabTercapai: anchor,
    tanggalJatuhTempoHaul,
    hariBerlalu,
    sisaHariHaul,
    haulGenap,
    wajibZakat,
    jumlahZakat,
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
