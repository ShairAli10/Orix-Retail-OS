import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

// Source artwork stays editable; generated PNG/ICO files are checked in so
// packaging never depends on graphics tooling or fonts on the counter PC.
const directory = new URL("../apps/desktop/build/", import.meta.url);
const source = readFileSync(new URL("icon.svg", directory), "utf8");
const png = (size) => new Resvg(source, { fitTo: { mode: "width", value: size } }).render().asPng();
writeFileSync(new URL("icon.png", directory), png(512));

const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map(png);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, index) => {
  const entry = 6 + index * 16;
  header[entry] = size === 256 ? 0 : size;
  header[entry + 1] = size === 256 ? 0 : size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
});
writeFileSync(new URL("icon.ico", directory), Buffer.concat([header, ...images]));

const artwork = source.replace(/<title>.*?<\/title>/, "");
const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="320" viewBox="0 0 1100 320">
  <title>Orix Retail</title>
  <g transform="translate(8 8) scale(.594)">${artwork}</g>
  <text x="352" y="198" fill="#17202a" font-family="Arial, sans-serif" font-size="104" font-weight="700" letter-spacing="-4">Orix Retail</text>
</svg>`;
writeFileSync(new URL("wordmark.svg", directory), wordmark);
writeFileSync(new URL("wordmark.png", directory), new Resvg(wordmark).render().asPng());
console.log("Generated Orix Retail PNG, multi-resolution ICO, and wordmark.");
