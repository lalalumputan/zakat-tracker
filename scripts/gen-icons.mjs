// Generate PNG ikon PWA dari SVG vektor (bulan sabit + bintang).
// Jalankan: node scripts/gen-icons.mjs  (butuh devDependency `sharp`)
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

function svg(size) {
  const bg = "#059669";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <!-- bulan sabit: lingkaran putih dikurangi lingkaran warna bg -->
  <circle cx="244" cy="256" r="132" fill="#ffffff"/>
  <circle cx="292" cy="232" r="118" fill="${bg}"/>
  <!-- bintang lima sudut -->
  <path fill="#ffffff" d="M348 196 l16 33 36 5 -26 26 6 36 -32 -17 -32 17 6 -36 -26 -26 36 -5 z"/>
</svg>`;
}

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  const buf = Buffer.from(svg(t.size));
  const png = await sharp(buf).resize(t.size, t.size).png().toBuffer();
  await writeFile(join(pub, t.name), png);
  console.log("wrote", t.name, t.size);
}

// Simpan juga sumber SVG (maskable) yang dipakai manifest.
await writeFile(join(pub, "icon.svg"), svg(512));
console.log("wrote icon.svg");
