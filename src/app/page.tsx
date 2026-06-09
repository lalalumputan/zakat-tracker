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
  type Pembelian,
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

  function tambahPembelian() {
    const baru: Pembelian = {
      id: idBaru(),
      tanggal: "",
      gram: 0,
      hargaBeliPerGram: input.hargaEmasSekarang || 0,
    };
    setInput((prev) => ({ ...prev, pembelian: [...prev.pembelian, baru] }));
  }

  function ubahPembelian(id: string, patch: Partial<Pembelian>) {
    setInput((prev) => ({
      ...prev,
      pembelian: prev.pembelian.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }

  function hapusPembelian(id: string) {
    setInput((prev) => ({
      ...prev,
      pembelian: prev.pembelian.filter((p) => p.id !== id),
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
            Catat pembelian emas bertahap, akumulasi otomatis ·{" "}
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

        {/* Daftar pembelian */}
        <Kartu judul="Daftar Pembelian Emas" ikon="🪙">
          {input.pembelian.length === 0 ? (
            <p className="mb-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              Belum ada pembelian. Tambahkan pembelian emas pertamamu.
            </p>
          ) : (
            <div className="mb-4 space-y-3">
              {hasil.rincian.map((r) => (
                <BarisPembelian
                  key={r.id}
                  rincian={r}
                  onChange={(patch) => ubahPembelian(r.id, patch)}
                  onHapus={() => hapusPembelian(r.id)}
                />
              ))}
            </div>
          )}
          <button
            onClick={tambahPembelian}
            className="w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
          >
            + Tambah Pembelian
          </button>
        </Kartu>

        {/* Hasil */}
        <HasilZakatCard hasil={hasil} />

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
            Haul dihitung sejak total emas pertama kali mencapai nishab; pembelian
            berikutnya mengikuti haul harta pokok.
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

/* ---------- Baris pembelian ---------- */

function BarisPembelian({
  rincian,
  onChange,
  onHapus,
}: {
  rincian: ReturnType<typeof hitungZakat>["rincian"][number];
  onChange: (patch: Partial<Pembelian>) => void;
  onHapus: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        rincian.pencetusNishab
          ? "border-emerald-300 bg-emerald-50/60"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_0.8fr_1.2fr_auto]">
        <Mini label="Tanggal beli">
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
        <Mini label="Harga beli/gram">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-emerald-400">
            <span className="pl-2 text-xs text-slate-400">Rp</span>
            <input
              inputMode="numeric"
              value={rincian.hargaBeliPerGram > 0 ? rincian.hargaBeliPerGram.toLocaleString("id-ID") : ""}
              onChange={(e) =>
                onChange({
                  hargaBeliPerGram: parseInt(e.target.value.replace(/[^\d]/g, ""), 10) || 0,
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
            aria-label="Hapus pembelian"
            className="rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>
          Kumulatif: <strong className="text-slate-600">{formatGram(rincian.kumulatifGram)}</strong>
        </span>
        {rincian.nilaiBeli > 0 && <span>Modal: {formatRupiah(rincian.nilaiBeli)}</span>}
        {rincian.pencetusNishab && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-medium text-white">
            ✓ Nishab tercapai di sini
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

function HasilZakatCard({ hasil }: { hasil: ReturnType<typeof hitungZakat> }) {
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
          </div>
        )}
      </div>

      <div className="space-y-3 px-6 py-5">
        {/* Akumulasi gram */}
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

        <Baris label="Modal (total harga beli)" value={formatRupiah(hasil.totalModalEmas)} />
        <Baris label="Nilai sekarang" value={formatRupiah(hasil.nilaiEmas)} tebal />
        {hasil.totalModalEmas > 0 && (
          <Baris
            label={hasil.keuntungan >= 0 ? "Keuntungan" : "Kerugian"}
            value={`${hasil.keuntungan >= 0 ? "+" : "−"} ${formatRupiah(Math.abs(hasil.keuntungan))}`}
          />
        )}

        {/* Status haul */}
        <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
          {!hasil.tanggalNishabTercapai ? (
            <p className="text-slate-500">
              📅 Haul mulai berjalan saat total emas mencapai {NISHAB_EMAS_GRAM} gram.
              {hasil.mencapaiNishab && " Lengkapi tanggal pembelian untuk melacak haul."}
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
