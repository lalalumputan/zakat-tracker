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
  type PembayaranZakat,
} from "@/lib/zakat";
import { muatInput, simpanInput, inputKosong, idBaru } from "@/lib/storage";

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
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const bayar: PembayaranZakat = {
      id: idBaru(),
      tanggal: iso,
      jumlah: Math.round(hasil.jumlahZakat),
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
            Catat beli & jual emas, akumulasi otomatis ·{" "}
            <span className="text-emerald-700">lalalumputan™</span>
          </p>
        </header>

        {/* Harga sekarang */}
        <Kartu judul="Harga Emas Saat Ini" ikon="🏷️">
          <FieldRupiah
            label="Harga emas / gram (untuk hitung nilai & zakat)"
            value={input.hargaEmasSekarang}
            onChange={setHarga}
            hint="Input manual. Dipakai untuk valuasi total & jumlah zakat."
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
              {hasil.rincian.map((r) => (
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

        {/* Hasil */}
        <HasilZakatCard hasil={hasil} onBayar={tandaiSudahBayar} />

        {/* Riwayat pembayaran */}
        <RiwayatZakat
          riwayat={input.riwayat}
          totalDibayar={hasil.totalDibayar}
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
            Nishab emas = {NISHAB_EMAS_GRAM} gram · Kadar zakat = 2,5% · Haul ={" "}
            {HAUL_HARI} hari (1 tahun hijriah).
          </p>
          <p>
            Haul dihitung sejak total emas mencapai nishab; bila total turun di bawah
            nishab (mis. dijual), haul terputus dan dihitung ulang.
          </p>
          <p>
            Aplikasi ini alat bantu hitung. Untuk kepastian, rujuk ulama / lembaga
            amil zakat resmi.
          </p>
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
  rincian: ReturnType<typeof hitungZakat>["rincian"][number];
  onChange: (patch: Partial<Transaksi>) => void;
  onHapus: () => void;
}) {
  const jual = rincian.jenis === "jual";
  return (
    <div
      className={`rounded-2xl border p-3 ${
        rincian.pencetusNishab
          ? "border-emerald-300 bg-emerald-50/60"
          : jual
            ? "border-rose-100 bg-rose-50/30"
            : "border-slate-200 bg-white"
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
          <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-emerald-400">
            <span className="pl-2 text-xs text-slate-400">Rp</span>
            <input
              inputMode="numeric"
              value={rincian.hargaPerGram > 0 ? rincian.hargaPerGram.toLocaleString("id-ID") : ""}
              onChange={(e) =>
                onChange({
                  hargaPerGram: parseInt(e.target.value.replace(/[^\d]/g, ""), 10) || 0,
                })
              }
              placeholder="0"
              className="w-full bg-transparent px-1.5 py-1.5 text-sm outline-none"
            />
          </div>
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
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>
          Total setelah ini:{" "}
          <strong className="text-slate-600">{formatGram(rincian.kumulatifGram)}</strong>
        </span>
        {rincian.nilai > 0 && <span>Nilai: {formatRupiah(rincian.nilai)}</span>}
        {rincian.pencetusNishab && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-medium text-white">
            ✓ Nishab tercapai di sini (haul mulai)
          </span>
        )}
      </div>
    </div>
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

/* ---------- Kartu hasil ---------- */

function HasilZakatCard({
  hasil,
  onBayar,
}: {
  hasil: ReturnType<typeof hitungZakat>;
  onBayar: () => void;
}) {
  const { wajibZakat, mencapaiNishab } = hasil;

  const status = wajibZakat
    ? { label: "Wajib Zakat", emoji: "✅" }
    : mencapaiNishab
      ? { label: "Menunggu Haul", emoji: "⏳" }
      : { label: "Belum Mencapai Nishab", emoji: "ℹ️" };

  const persen = Math.min(100, (hasil.totalGramEmas / NISHAB_EMAS_GRAM) * 100);

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl shadow-emerald-100/50">
      <div
        className={`px-6 py-5 ${
          wajibZakat
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
        {wajibZakat && (
          <div className="mt-3 rounded-2xl bg-white/15 px-4 py-3">
            <div className="text-xs opacity-90">Zakat yang harus dibayar (2,5%)</div>
            <div className="text-3xl font-extrabold">{formatRupiah(hasil.jumlahZakat)}</div>
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
            Kurang <strong>{formatGram(hasil.kekuranganGram)}</strong> lagi untuk mencapai nishab.
          </p>
        )}

        <div className="my-2 border-t border-dashed border-slate-200" />

        <Baris label="Modal bersih (beli − jual)" value={formatRupiah(hasil.modalBersih)} />
        <Baris label="Nilai sekarang" value={formatRupiah(hasil.nilaiEmas)} tebal />
        {Math.abs(hasil.modalBersih) > 0 && (
          <Baris
            label={hasil.keuntungan >= 0 ? "Keuntungan" : "Kerugian"}
            value={`${hasil.keuntungan >= 0 ? "+" : "−"} ${formatRupiah(Math.abs(hasil.keuntungan))}`}
          />
        )}

        <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          {!hasil.tanggalNishabTercapai ? (
            <p className="text-slate-500">
              📅 Haul mulai berjalan saat total emas mencapai {NISHAB_EMAS_GRAM} gram.
              {hasil.mencapaiNishab && " Lengkapi tanggal transaksi untuk melacak haul."}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Nishab tercapai: {formatTanggalID(hasil.tanggalNishabTercapai)}
              </p>
              {hasil.haulGenap ? (
                <p className="mt-1 text-emerald-700">
                  ✓ Haul genap pada {formatTanggalID(hasil.tanggalJatuhTempoHaul)}.
                </p>
              ) : (
                <div className="mt-1 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Sisa haul</span>
                    <span className="font-semibold text-emerald-700">
                      {hasil.sisaHariHaul} hari
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Genap pada {formatTanggalID(hasil.tanggalJatuhTempoHaul)} (
                    {hasil.hariBerlalu}/{HAUL_HARI} hari)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
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

/* ---------- Riwayat pembayaran zakat ---------- */

function RiwayatZakat({
  riwayat,
  totalDibayar,
  onUbah,
  onHapus,
}: {
  riwayat: PembayaranZakat[];
  totalDibayar: number;
  onUbah: (id: string, patch: Partial<PembayaranZakat>) => void;
  onHapus: (id: string) => void;
}) {
  const urut = [...riwayat].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return (
    <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
        <span className="flex items-center gap-2">📒 Riwayat Pembayaran Zakat</span>
        {totalDibayar > 0 && (
          <span className="text-xs font-normal text-slate-400">
            Total: <strong className="text-emerald-700">{formatRupiah(totalDibayar)}</strong>
          </span>
        )}
      </h2>
      {urut.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">
          Belum ada catatan pembayaran. Gunakan tombol &quot;Tandai sudah bayar&quot; saat zakat
          jatuh tempo.
        </p>
      ) : (
        <ul className="space-y-2">
          {urut.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
            >
              <span className="text-lg">💸</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-700">{formatRupiah(r.jumlah)}</div>
                <div className="text-xs text-slate-400">{formatTanggalID(r.tanggal)}</div>
                <input
                  value={r.catatan ?? ""}
                  onChange={(e) => onUbah(r.id, { catatan: e.target.value })}
                  placeholder="+ catatan (mis. via BAZNAS)"
                  className="mt-1 w-full bg-transparent text-xs text-slate-500 outline-none placeholder:text-slate-300"
                />
              </div>
              <button
                onClick={() => onHapus(r.id)}
                aria-label="Hapus catatan"
                className="rounded-lg px-2 py-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
