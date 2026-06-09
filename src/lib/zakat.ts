// Logika inti zakat maal emas — model LOT (per pembelian) + FIFO + haul per lot.
//
// Aturan (sesuai arahan pengguna):
// - Haul dihitung PER LOT pembelian, berlaku setelah total mencapai nishab (85g).
//   haulMulai lot = max(tanggal beli lot, tanggal nishab tercapai).
//   Jadi lot yang dibeli sebelum nishab: haul mulai saat nishab tercapai;
//   lot setelahnya: haul dari tanggal belinya sendiri.
// - Penjualan mengurangi lot yang haulnya paling duluan (FIFO: lot terlama dulu).
// - Zakat dihitung dari BERAT emas (gram), bukan harga beli: zakatGram = 2,5% × gram lot
//   yang sudah genap haul (selama total masih ≥ nishab).
// - Konversi gram → Rupiah:
//   * Bayar TANPA jual emas: gramZakat × harga emas saat haul jatuh tempo (per lot).
//   * Bayar DENGAN jual emas: hasil penjualan berat zakat (gramZakat × harga jual saat itu),
//     dicatat manual di riwayat.

export const NISHAB_EMAS_GRAM = 85;
export const KADAR_ZAKAT = 0.025; // 2,5%
export const HAUL_HARI = 354; // 1 tahun hijriah ≈ 354,367 hari

export type JenisTransaksi = "beli" | "jual";
export type MetodeBayar = "tunai" | "jual";

export interface Transaksi {
  id: string;
  jenis: JenisTransaksi;
  /** Tanggal transaksi (ISO yyyy-mm-dd). */
  tanggal: string;
  /** Jumlah emas (gram). */
  gram: number;
  /** Harga per gram saat transaksi (Rupiah): harga beli (lot) / harga jual. */
  hargaPerGram: number;
  /** (Lot beli) Harga emas/gram saat haul lot ini jatuh tempo — untuk konversi tunai. */
  hargaSaatHaul?: number;
}

export interface PembayaranZakat {
  id: string;
  tanggal: string;
  /** Berat zakat yang dibayar (gram). */
  gramZakat: number;
  /** Cara bayar. */
  metode: MetodeBayar;
  /** Nilai pembayaran (Rupiah). */
  jumlah: number;
  catatan?: string;
}

export interface InputHarta {
  /** Harga emas per gram saat ini (Rupiah) — valuasi & default konversi. */
  hargaEmasSekarang: number;
  transaksi: Transaksi[];
  riwayat: PembayaranZakat[];
}

export interface RincianTransaksi extends Transaksi {
  /** Total gram kumulatif (kronologis) setelah transaksi ini. */
  kumulatifGram: number;
  nilai: number;
}

export interface RincianLot {
  /** = id transaksi beli sumber lot. */
  id: string;
  tanggalBeli: string;
  gramAwal: number;
  /** Sisa gram setelah dikurangi penjualan FIFO. */
  gramSisa: number;
  hargaBeli: number;
  hargaSaatHaul?: number;
  haulMulai: string | null;
  haulJatuhTempo: string | null;
  haulGenap: boolean;
  hariBerlalu: number;
  sisaHariHaul: number;
  /** Zakat lot ini (gram) = gramSisa × 2,5% bila haul genap. */
  zakatGram: number;
  /** Estimasi nilai zakat lot (Rupiah). */
  zakatRupiah: number;
}

export interface HasilZakat {
  rincianTransaksi: RincianTransaksi[];
  lots: RincianLot[];
  totalGramEmas: number;
  nishabGram: number;
  mencapaiNishab: boolean;
  kekuranganGram: number;
  tanggalNishab: string | null;
  /** Total zakat yang sudah jatuh tempo (gram). */
  totalZakatGram: number;
  /** Estimasi total zakat (Rupiah). */
  estimasiZakatRupiah: number;
  nilaiEmas: number;
  modalBersih: number;
  keuntungan: number;
  totalDibayarGram: number;
  totalDibayarRupiah: number;
  adaYangJatuhTempo: boolean;
}

function selisihHari(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ub - ua) / ms);
}

function tambahHari(t: Date, hari: number): Date {
  const d = new Date(t);
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

interface LotKerja {
  id: string;
  tanggalBeli: string;
  gramAwal: number;
  gramSisa: number;
  hargaBeli: number;
  hargaSaatHaul?: number;
}

export function hitungZakat(input: InputHarta, sekarang: Date = new Date()): HasilZakat {
  const hargaSekarang = Math.max(0, input.hargaEmasSekarang);

  const urut = input.transaksi.slice().sort((a, b) => {
    const ka = tanggalValid(a.tanggal) ? a.tanggal : "9999-99-99";
    const kb = tanggalValid(b.tanggal) ? b.tanggal : "9999-99-99";
    return ka.localeCompare(kb);
  });

  let kumulatif = 0;
  let tanggalNishab: string | null = null;
  const lots: LotKerja[] = [];
  const rincianTransaksi: RincianTransaksi[] = [];

  for (const t of urut) {
    const gram = Math.max(0, t.gram);
    if (t.jenis === "beli") {
      kumulatif += gram;
      lots.push({
        id: t.id,
        tanggalBeli: t.tanggal,
        gramAwal: gram,
        gramSisa: gram,
        hargaBeli: Math.max(0, t.hargaPerGram),
        hargaSaatHaul: t.hargaSaatHaul,
      });
    } else {
      // Jual: kurangi lot terlama dulu (FIFO = haul paling duluan).
      let sisaJual = gram;
      for (const lot of lots) {
        if (sisaJual <= 1e-9) break;
        if (lot.gramSisa <= 1e-9) continue;
        const ambil = Math.min(lot.gramSisa, sisaJual);
        lot.gramSisa -= ambil;
        sisaJual -= ambil;
      }
      kumulatif -= gram;
      if (kumulatif < 0) kumulatif = 0;
    }

    // Tanggal nishab: titik naik melewati nishab yang bertahan sampai kini.
    if (kumulatif >= NISHAB_EMAS_GRAM && tanggalNishab === null && tanggalValid(t.tanggal)) {
      tanggalNishab = t.tanggal;
    }
    if (kumulatif < NISHAB_EMAS_GRAM) tanggalNishab = null;

    rincianTransaksi.push({
      ...t,
      kumulatifGram: kumulatif,
      nilai: gram * Math.max(0, t.hargaPerGram),
    });
  }

  const totalGramEmas = kumulatif;
  const mencapaiNishab = totalGramEmas >= NISHAB_EMAS_GRAM;
  const kekuranganGram = Math.max(0, NISHAB_EMAS_GRAM - totalGramEmas);

  const lotsRinci: RincianLot[] = lots
    .filter((l) => l.gramSisa > 1e-9)
    .map((l) => {
      let haulMulai: string | null = null;
      let haulJatuhTempo: string | null = null;
      let haulGenap = false;
      let hariBerlalu = 0;
      let sisaHariHaul = HAUL_HARI;
      let zakatGram = 0;

      if (tanggalNishab && tanggalValid(l.tanggalBeli)) {
        haulMulai =
          l.tanggalBeli.localeCompare(tanggalNishab) > 0 ? l.tanggalBeli : tanggalNishab;
        const mulai = new Date(haulMulai + "T00:00:00");
        hariBerlalu = Math.max(0, selisihHari(mulai, sekarang));
        sisaHariHaul = Math.max(0, HAUL_HARI - hariBerlalu);
        haulJatuhTempo = toISODate(tambahHari(mulai, HAUL_HARI));
        haulGenap = mencapaiNishab && hariBerlalu >= HAUL_HARI;
        zakatGram = haulGenap ? l.gramSisa * KADAR_ZAKAT : 0;
      }

      const hargaKonversi =
        l.hargaSaatHaul && l.hargaSaatHaul > 0 ? l.hargaSaatHaul : hargaSekarang;

      return {
        id: l.id,
        tanggalBeli: l.tanggalBeli,
        gramAwal: l.gramAwal,
        gramSisa: l.gramSisa,
        hargaBeli: l.hargaBeli,
        hargaSaatHaul: l.hargaSaatHaul,
        haulMulai,
        haulJatuhTempo,
        haulGenap,
        hariBerlalu,
        sisaHariHaul,
        zakatGram,
        zakatRupiah: zakatGram * hargaKonversi,
      };
    });

  const totalZakatGram = lotsRinci.reduce((s, l) => s + l.zakatGram, 0);
  const estimasiZakatRupiah = lotsRinci.reduce((s, l) => s + l.zakatRupiah, 0);
  const nilaiEmas = totalGramEmas * hargaSekarang;
  const modalBersih = rincianTransaksi.reduce(
    (s, r) => s + (r.jenis === "jual" ? -r.nilai : r.nilai),
    0,
  );
  const keuntungan = nilaiEmas - modalBersih;
  const totalDibayarGram = input.riwayat.reduce((s, r) => s + Math.max(0, r.gramZakat || 0), 0);
  const totalDibayarRupiah = input.riwayat.reduce((s, r) => s + Math.max(0, r.jumlah || 0), 0);

  return {
    rincianTransaksi,
    lots: lotsRinci,
    totalGramEmas,
    nishabGram: NISHAB_EMAS_GRAM,
    mencapaiNishab,
    kekuranganGram,
    tanggalNishab,
    totalZakatGram,
    estimasiZakatRupiah,
    nilaiEmas,
    modalBersih,
    keuntungan,
    totalDibayarGram,
    totalDibayarRupiah,
    adaYangJatuhTempo: totalZakatGram > 1e-9,
  };
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatGram(n: number, desimal = 2): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal }).format(n)} gram`;
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
