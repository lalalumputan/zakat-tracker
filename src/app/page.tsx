"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hitungZakat,
  formatRupiah,
  formatGram,
  formatTanggalID,
  NISHAB_EMAS_GRAM,
  HAUL_HARI,
  type InputHarta,
  type Transaksi,
  type JenisTransaksi,
  type MetodeBayar,
  type PembayaranZakat,
} from "@/lib/zakat";
import { muatInput, simpanInput, inputKosong, idBaru } from "@/lib/storage";

function isoHariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  const [input, setInput] = useState<InputHarta>(inputKosong);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    setInput(muatInput());
    setSiap(true);
  }, []);

  useEffect(() => {
    if (siap) simpanInput(input);
  }, [input, siap]);

  const hasil = useMemo(() => hitungZakat(input), [input]);

  function setHarga(v: number) {
    setInput((prev) => ({ ...prev, hargaEmasSekarang: v }));
  }

  function tambahTransaksi(jenis: JenisTransaksi) {
    const baru: Transaksi = {
      id: idBaru(),
      jenis,
      tanggal: "",
      gram: 0,
      hargaPerGram: input.hargaEmasSekarang || 0,
    };
    setInput((prev) => ({ ...prev, transaksi: [...prev.transaksi, baru] }));
  }

  function ubahTransaksi(id: string, patch: Partial<Transaksi>) {
    setInput((prev) => ({
      ...prev,
      transaksi: prev.transaksi.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }

  function hapusTransaksi(id: string) {
    setInput((prev) => ({
      ...prev,
      transaksi: prev.transaksi.filter((t) => t.id !== id),
    }));
  }

  function tandaiSudahBayar() {
    const bayar: PembayaranZakat = {
      id: idBaru(),
      tanggal: isoHariIni(),
      gramZakat: Number(hasil.totalZakatGram.toFixed(4)),
      metode: "tunai",
      jumlah: Math.round(hasil.estimasiZakatRupiah),
      catatan: "",
    };
    setInput((prev) => ({ ...prev, riwayat: [...prev.riwayat, bayar] }));
  }

  function ubahRiwayat(id: string, patch: Partial<PembayaranZakat>) {
    setInput((prev) => ({
      ...prev,
      riwayat: prev.riwayat.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  function hapusRiwayat(id: string) {
    setInput((prev) => ({
      ...prev,
      riwayat: prev.riwayat.filter((r) => r.id !== id),
    }));
  }

  function resetSemua() {
    if (confirm("Hapus semua data dan mulai dari awal?")) setInput(inputKosong);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white text-slate-800">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-200">
            ☪
          </div>
          <h1 className="text-2xl font-bold text-emerald-900 sm:text-3xl">
            Zakat Tracker Emas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Haul per lot · zakat dalam gram ·{" "}
            <span className="text-emerald-700">lalalumputan™</span>
          </p>
        </header>

        <Kartu judul="Harga Emas Saat Ini" ikon="🏷️">
          <FieldRupiah
            label="Harga emas / gram"
            value={input.hargaEmasSekarang}
            onChange={setHarga}
            hint="Untuk valuasi & konversi default zakat ke Rupiah."
          />
        </Kartu>

        {/* Transaksi */}
        <Kartu judul="Transaksi Emas" ikon="🪙">
          {input.transaksi.length === 0 ? (
            <p className="mb-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              Belum ada transaksi. Tambahkan pembelian emas pertamamu.
            </p>
          ) : (
            <div className="mb-4 space-y-3">
              {hasil.rincianTransaksi.map((r) => (
                <BarisTransaksi
                  key={r.id}
                  rincian={r}
                  onChange={(patch) => ubahTransaksi(r.id, patch)}
                  onHapus={() => hapusTransaksi(r.id)}
                />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => tambahTransaksi("beli")}
              className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              + Beli emas
            </button>
            <button
              onClick={() => tambahTransaksi("jual")}
              className="rounded-xl border border-dashed border-rose-300 bg-rose-50/50 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              − Jual emas
            </button>
          </div>
        </Kartu>

        {/* Ringkasan */}
        <RingkasanZakat hasil={hasil} onBayar={tandaiSudahBayar} />

        {/* Haul per lot */}
        {hasil.lots.length > 0 && (
          <Kartu judul="Status Haul per Lot" ikon="⏱️">
            <div className="space-y-3">
              {hasil.lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  onUbahHargaHaul={(v) => ubahTransaksi(lot.id, { hargaSaatHaul: v })}
                />
              ))}
            </div>
          </Kartu>
        )}

        {/* Riwayat */}
        <RiwayatZakat
          riwayat={input.riwayat}
          totalDibayarGram={hasil.totalDibayarGram}
          totalDibayarRupiah={hasil.totalDibayarRupiah}
          onUbah={ubahRiwayat}
          onHapus={hapusRiwayat}
        />

        <div className="mt-6 flex justify-center">
          <button
            onClick={resetSemua}
            className="text-xs text-slate-400 underline-offset-2 hover:text-rose-500 hover:underline"
          >
            Reset semua data
          </button>
        </div>

        <footer className="mt-8 space-y-1 text-center text-[11px] leading-relaxed text-slate-400">
          <p>
            Nishab {NISHAB_EMAS_GRAM} gram · zakat 2,5% dihitung dari berat emas (gram) ·
            haul {HAUL_HARI} hari per lot.
          </p>
          <p>
            Haul tiap lot mulai dari max(tanggal beli, tanggal nishab tercapai). Penjualan
            mengurangi lot terlama (FIFO). Bayar tunai dikonversi dengan harga emas saat haul;
            bayar dengan jual emas memakai hasil penjualan berat zakat.
          </p>
          <p>Alat bantu hitung. Untuk kepastian, rujuk ulama / lembaga amil zakat resmi.</p>
        </footer>
      </div>
    </main>
  );
}

/* ---------- Baris transaksi ---------- */

function BarisTransaksi({
  rincian,
  onChange,
  onHapus,
}: {
  rincian: ReturnType<typeof hitungZakat>["rincianTransaksi"][number];
  onChange: (patch: Partial<Transaksi>) => void;
  onHapus: () => void;
}) {
  const jual = rincian.jenis === "jual";
  return (
    <div
      className={`rounded-2xl border p-3 ${
        jual ? "border-rose-100 bg-rose-50/30" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => onChange({ jenis: jual ? "beli" : "jual" })}
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            jual ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {jual ? "− Jual" : "+ Beli"}
        </button>
        <span className="text-[11px] text-slate-400">ketuk untuk ubah jenis</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_0.8fr_1.2fr_auto]">
        <Mini label="Tanggal">
          <input
            type="date"
            value={rincian.tanggal}
            onChange={(e) => onChange({ tanggal: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
        </Mini>
        <Mini label="Gram">
          <input
            inputMode="decimal"
            value={rincian.gram > 0 ? rincian.gram : ""}
            onChange={(e) =>
              onChange({ gram: parseFloat(e.target.value.replace(/[^\d.]/g, "")) || 0 })
            }
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
        </Mini>
        <Mini label={jual ? "Harga jual/gram" : "Harga beli/gram"}>
          <FieldRupiahKecil
            value={rincian.hargaPerGram}
            onChange={(v) => onChange({ hargaPerGram: v })}
          />
        </Mini>
        <div className="flex items-end justify-end">
          <button
            onClick={onHapus}
            aria-label="Hapus transaksi"
            className="rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        Total setelah ini:{" "}
        <strong className="text-slate-600">{formatGram(rincian.kumulatifGram)}</strong>
      </div>
    </div>
  );
}

/* ---------- Lot / haul ---------- */

function LotCard({
  lot,
  onUbahHargaHaul,
}: {
  lot: ReturnType<typeof hitungZakat>["lots"][number];
  onUbahHargaHaul: (v: number) => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        lot.haulGenap ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold text-slate-700">
            {formatGram(lot.gramSisa)}
            {lot.gramSisa !== lot.gramAwal && (
              <span className="ml-1 text-xs font-normal text-slate-400">
                (dari {formatGram(lot.gramAwal)})
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Beli {formatTanggalID(lot.tanggalBeli)} · {formatRupiah(lot.hargaBeli)}/g
          </div>
        </div>
        {lot.haulGenap && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
            Haul genap
          </span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
        {!lot.haulMulai ? (
          <p className="text-slate-500">Belum mencapai nishab — haul belum berjalan.</p>
        ) : lot.haulGenap ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Haul mulai {formatTanggalID(lot.haulMulai)} · genap{" "}
              {formatTanggalID(lot.haulJatuhTempo)}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Zakat lot ini (2,5%)</span>
              <span className="font-bold text-emerald-700">{formatGram(lot.zakatGram, 3)}</span>
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-slate-400">
                Harga emas saat haul jatuh tempo (untuk bayar tunai)
              </span>
              <FieldRupiahKecil
                value={lot.hargaSaatHaul ?? 0}
                onChange={onUbahHargaHaul}
                placeholder="pakai harga terkini"
              />
            </label>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>≈ nilai zakat</span>
              <span className="font-semibold text-emerald-700">
                {formatRupiah(lot.zakatRupiah)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-slate-600">
            <div className="flex items-center justify-between">
              <span>Sisa haul</span>
              <span className="font-semibold text-emerald-700">{lot.sisaHariHaul} hari</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Mulai {formatTanggalID(lot.haulMulai)} · genap{" "}
              {formatTanggalID(lot.haulJatuhTempo)} ({lot.hariBerlalu}/{HAUL_HARI} hari)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Ringkasan ---------- */

function RingkasanZakat({
  hasil,
  onBayar,
}: {
  hasil: ReturnType<typeof hitungZakat>;
  onBayar: () => void;
}) {
  const { adaYangJatuhTempo, mencapaiNishab } = hasil;
  const status = adaYangJatuhTempo
    ? { label: "Ada Zakat Jatuh Tempo", emoji: "✅" }
    : mencapaiNishab
      ? { label: "Menunggu Haul", emoji: "⏳" }
      : { label: "Belum Mencapai Nishab", emoji: "ℹ️" };
  const persen = Math.min(100, (hasil.totalGramEmas / NISHAB_EMAS_GRAM) * 100);

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-100/50">
      <div
        className={`px-6 py-5 ${
          adaYangJatuhTempo
            ? "bg-emerald-600 text-white"
            : mencapaiNishab
              ? "bg-amber-400 text-amber-950"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium opacity-90">Status Zakat</span>
          <span className="text-sm">{status.emoji}</span>
        </div>
        <div className="mt-1 text-2xl font-bold">{status.label}</div>
        {adaYangJatuhTempo && (
          <div className="mt-3 rounded-2xl bg-white/15 px-4 py-3">
            <div className="text-xs opacity-90">Zakat yang harus dikeluarkan</div>
            <div className="text-3xl font-extrabold">
              {formatGram(hasil.totalZakatGram, 3)}
            </div>
            <div className="mt-0.5 text-sm opacity-90">
              ≈ {formatRupiah(hasil.estimasiZakatRupiah)}
            </div>
            <button
              onClick={onBayar}
              className="mt-3 w-full rounded-xl bg-white py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              ✓ Tandai sudah bayar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 px-6 py-5">
        <div className="flex items-end justify-between">
          <span className="text-sm text-slate-500">Total emas dimiliki</span>
          <span className="text-xl font-bold text-emerald-700">
            {formatGram(hasil.totalGramEmas)}
          </span>
        </div>
        <div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                mencapaiNishab ? "bg-emerald-500" : "bg-amber-400"
              }`}
              style={{ width: `${persen}%` }}
            />
          </div>
          <p className="mt-1 flex justify-between text-xs text-slate-400">
            <span>{persen.toFixed(0)}% dari nishab</span>
            <span>Nishab {NISHAB_EMAS_GRAM} gram</span>
          </p>
        </div>
        {!mencapaiNishab && hasil.totalGramEmas > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Kurang <strong>{formatGram(hasil.kekuranganGram)}</strong> lagi untuk mencapai
            nishab.
          </p>
        )}
        <div className="my-2 border-t border-dashed border-slate-200" />
        <Baris label="Nilai emas sekarang" value={formatRupiah(hasil.nilaiEmas)} tebal />
        <Baris label="Modal bersih (beli − jual)" value={formatRupiah(hasil.modalBersih)} />
        {Math.abs(hasil.modalBersih) > 0 && (
          <Baris
            label={hasil.keuntungan >= 0 ? "Keuntungan" : "Kerugian"}
            value={`${hasil.keuntungan >= 0 ? "+" : "−"} ${formatRupiah(Math.abs(hasil.keuntungan))}`}
          />
        )}
      </div>
    </div>
  );
}

function Baris({ label, value, tebal }: { label: string; value: string; tebal?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={tebal ? "font-semibold text-slate-700" : "text-slate-500"}>{label}</span>
      <span className={tebal ? "font-bold text-emerald-700" : "text-slate-700"}>{value}</span>
    </div>
  );
}

/* ---------- Riwayat pembayaran ---------- */

function RiwayatZakat({
  riwayat,
  totalDibayarGram,
  totalDibayarRupiah,
  onUbah,
  onHapus,
}: {
  riwayat: PembayaranZakat[];
  totalDibayarGram: number;
  totalDibayarRupiah: number;
  onUbah: (id: string, patch: Partial<PembayaranZakat>) => void;
  onHapus: (id: string) => void;
}) {
  const urut = [...riwayat].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return (
    <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
        <span>📒 Riwayat Pembayaran Zakat</span>
        {(totalDibayarGram > 0 || totalDibayarRupiah > 0) && (
          <span className="text-xs font-normal text-slate-400">
            Total:{" "}
            <strong className="text-emerald-700">{formatGram(totalDibayarGram, 3)}</strong> ·{" "}
            {formatRupiah(totalDibayarRupiah)}
          </span>
        )}
      </h2>
      {urut.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">
          Belum ada catatan pembayaran.
        </p>
      ) : (
        <ul className="space-y-3">
          {urut.map((r) => (
            <RiwayatItem key={r.id} r={r} onUbah={onUbah} onHapus={onHapus} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RiwayatItem({
  r,
  onUbah,
  onHapus,
}: {
  r: PembayaranZakat;
  onUbah: (id: string, patch: Partial<PembayaranZakat>) => void;
  onHapus: (id: string) => void;
}) {
  const jual = r.metode === "jual";
  return (
    <li className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💸</span>
          <div>
            <div className="font-semibold text-slate-700">{formatGram(r.gramZakat, 3)}</div>
            <div className="text-xs text-slate-400">{formatTanggalID(r.tanggal)}</div>
          </div>
        </div>
        <button
          onClick={() => onHapus(r.id)}
          aria-label="Hapus catatan"
          className="rounded-lg px-2 py-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Mini label="Metode bayar">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => onUbah(r.id, { metode: "tunai" })}
              className={`flex-1 rounded-md py-1 ${!jual ? "bg-emerald-100 font-semibold text-emerald-700" : "text-slate-400"}`}
            >
              Tunai
            </button>
            <button
              onClick={() => onUbah(r.id, { metode: "jual" })}
              className={`flex-1 rounded-md py-1 ${jual ? "bg-emerald-100 font-semibold text-emerald-700" : "text-slate-400"}`}
            >
              Jual emas
            </button>
          </div>
        </Mini>
        <Mini label={jual ? "Hasil penjualan (Rp)" : "Nilai dibayar (Rp)"}>
          <FieldRupiahKecil value={r.jumlah} onChange={(v) => onUbah(r.id, { jumlah: v })} />
        </Mini>
      </div>
      <input
        value={r.catatan ?? ""}
        onChange={(e) => onUbah(r.id, { catatan: e.target.value })}
        placeholder="+ catatan (mis. via BAZNAS)"
        className="mt-2 w-full bg-transparent text-xs text-slate-500 outline-none placeholder:text-slate-300"
      />
    </li>
  );
}

/* ---------- Kartu & field ---------- */

function Kartu({
  judul,
  ikon,
  children,
}: {
  judul: string;
  ikon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span>{ikon}</span> {judul}
      </h2>
      {children}
    </section>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function FieldRupiah({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const tampil = value > 0 ? value.toLocaleString("id-ID") : "";
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600">{label}</label>
      <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
        <span className="pl-3 text-sm text-slate-400">Rp</span>
        <input
          inputMode="numeric"
          value={tampil}
          onChange={(e) => {
            const digit = e.target.value.replace(/[^\d]/g, "");
            onChange(digit ? parseInt(digit, 10) : 0);
          }}
          placeholder="0"
          className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function FieldRupiahKecil({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-emerald-400">
      <span className="pl-2 text-xs text-slate-400">Rp</span>
      <input
        inputMode="numeric"
        value={value > 0 ? value.toLocaleString("id-ID") : ""}
        onChange={(e) => {
          const digit = e.target.value.replace(/[^\d]/g, "");
          onChange(digit ? parseInt(digit, 10) : 0);
        }}
        placeholder={placeholder}
        className="w-full bg-transparent px-1.5 py-1.5 text-sm outline-none placeholder:text-slate-300"
      />
    </div>
  );
}
