/**
 * QA#1 smoke: exercise merge/split/compress/bake without a test runner.
 * Run: npx tsx scripts/qa-smoke-pdf.mts
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Result = { case: string; ok: boolean; detail: string };

async function makePdf(pages: number, text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([400, 600]);
    p.drawText(`${text} p${i + 1}`, {
      x: 40,
      y: 540,
      size: 18,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  return doc.save();
}

async function load(bytes: Uint8Array) {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

function rel(p: string) {
  return pathToFileURL(path.resolve(p)).href;
}

const results: Result[] = [];

function push(caseName: string, ok: boolean, detail: string) {
  results.push({ case: caseName, ok, detail });
}

async function main() {
  const { mergePdfs } = await import(rel("src/lib/pdf/mergePdfBytes.ts"));
  const {
    parsePageRange,
    extractPages,
    splitPdfToPages,
    getPageCount,
  } = await import(rel("src/lib/pdf/splitPdfBytes.ts"));
  const { compressPdf, formatBytes } = await import(rel("src/lib/pdf/compressPdfBytes.ts"));
  const { bakeEditsIntoPdf } = await import(rel("src/lib/pdf/bakeEditsIntoPdf.ts"));

  const a = await makePdf(2, "A");
  const b = await makePdf(1, "B");
  const merged = await mergePdfs([a, b]);
  const mergedDoc = await load(merged);
  push("merge 2+1 pages", mergedDoc.getPageCount() === 3, `pages=${mergedDoc.getPageCount()}`);

  try {
    await mergePdfs([]);
    push("merge empty throws", false, "did not throw");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    push("merge empty throws", /at least one/i.test(msg), msg);
  }

  const multi = await makePdf(5, "S");
  const pc = await getPageCount(multi);
  push("getPageCount", pc === 5, String(pc));

  const parsed = parsePageRange("1-3,5,99,0,foo,4-2", 5);
  push(
    "parsePageRange clamp/sort/dedupe",
    JSON.stringify(parsed) === JSON.stringify([1, 2, 3, 4, 5]),
    JSON.stringify(parsed),
  );
  push("parsePageRange invalid empty", parsePageRange("abc,,--", 5).length === 0, "ok");

  try {
    await extractPages(multi, []);
    push("extractPages empty throws", false, "no throw");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    push("extractPages empty throws", /No valid pages/i.test(msg), msg);
  }

  const extracted = await extractPages(multi, [1, 5]);
  const extractedDoc = await load(extracted);
  push("extract pages 1,5", extractedDoc.getPageCount() === 2, `pages=${extractedDoc.getPageCount()}`);

  const parts = await splitPdfToPages(multi);
  push(
    "splitPdfToPages count",
    parts.length === 5 && parts.every((p: { pageNumber: number }, i: number) => p.pageNumber === i + 1),
    `n=${parts.length}`,
  );

  // pdf-lib empty docs often round-trip as 0 or 1 page depending on version;
  // record only — UI should still guard parts[0] before download.
  const emptyDoc = await PDFDocument.create();
  const emptyBytes = await emptyDoc.save();
  const zparts = await splitPdfToPages(emptyBytes);
  push(
    "empty PDF split observed",
    true,
    `parts=${zparts.length} (UI must guard parts[0] if 0)`,
  );

  const c = await compressPdf(multi);
  push(
    "compress returns bytes",
    c.bytes.byteLength > 0 && c.originalBytes === multi.byteLength,
    `orig=${c.originalBytes} new=${c.compressedBytes} ratio=${c.ratio.toFixed(3)} fmt=${formatBytes(c.compressedBytes)}`,
  );

  const src = await makePdf(3, "E");
  const anns = [
    {
      id: "t1",
      type: "text" as const,
      pageIndex: 0,
      x: 0.1,
      y: 0.1,
      width: 0.5,
      height: 0.05,
      text: "Hello",
      color: "#ff0000",
      fontSize: 14,
    },
    {
      id: "h1",
      type: "highlight" as const,
      pageIndex: 0,
      x: 0.1,
      y: 0.2,
      width: 0.4,
      height: 0.04,
      color: "#ffff00",
    },
    {
      id: "d1",
      type: "draw" as const,
      pageIndex: 1,
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.5, y: 0.5 },
      ],
      color: "#0000ff",
      strokeWidth: 2,
    },
    {
      id: "n1",
      type: "nativeText" as const,
      pageIndex: 2,
      x: 0.1,
      y: 0.3,
      width: 0.4,
      height: 0.05,
      text: "Native",
      color: "#000000",
      fontSize: 12,
    },
  ];
  const pageMeta = [{ rotation: 0 }, { rotation: 90 }, { rotation: 0 }];
  const baked = await bakeEditsIntoPdf(src, anns, [2, 0], pageMeta);
  push("bake reorder+delete pages", (await load(baked)).getPageCount() === 2, `pages=${(await load(baked)).getPageCount()}`);

  try {
    await bakeEditsIntoPdf(
      src,
      [
        {
          id: "u1",
          type: "text",
          pageIndex: 0,
          x: 0.1,
          y: 0.1,
          width: 0.5,
          height: 0.05,
          text: "Olá 日本語",
          color: "#000000",
          fontSize: 14,
        },
      ],
      [0],
      [{ rotation: 0 }],
    );
    push("bake unicode text", true, "succeeded");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    push("bake unicode throws (WinAnsi/Helvetica)", true, msg.slice(0, 160));
  }

  try {
    await mergePdfs([new Uint8Array([1, 2, 3, 4]).buffer]);
    push("corrupt PDF merge throws", false, "no throw");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    push("corrupt PDF merge throws", true, msg.slice(0, 120));
  }

  // Simulate compress UI filename footgun
  const file: { name: string } | null = null;
  const filename = (file?.name.replace(/\.pdf$/i, "") + "-compressed.pdf") || "compressed.pdf";
  push(
    "compress filename null coalescing bug",
    filename === "undefined-compressed.pdf",
    `got=${filename}`,
  );

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`PASS ${results.length - failed.length} FAIL ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
