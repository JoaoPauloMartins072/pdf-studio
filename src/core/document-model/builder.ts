import type { DocumentDisplayList, DisplayListText } from "@/core/display-list/types";
import type {
  DocumentPage,
  DocumentResource,
  EditableDocument,
  FontResource,
  ImageObject,
  ImageResource,
  Matrix2D,
  PageObject,
  PageResources,
  PathObject,
  TextObject,
} from "@/core/document-model/types";
import { createEmptyDocument, identityMatrix } from "@/core/document-model/types";

/**
 * Promotes a Display List into an Editable Document Model
 * (text, images, paths → page objects + resources).
 */

export interface DocumentModelBuilder {
  build(displayList: DocumentDisplayList, sourceName: string): EditableDocument;
}

/** Stage 0 stub — empty document shell. */
export class StubDocumentModelBuilder implements DocumentModelBuilder {
  build(_displayList: DocumentDisplayList, sourceName: string): EditableDocument {
    return createEmptyDocument(sourceName);
  }
}

/**
 * Display List → Editable Document Model (text + images + paths).
 */
export class DisplayListDocumentModelBuilder implements DocumentModelBuilder {
  build(displayList: DocumentDisplayList, sourceName: string): EditableDocument {
    const base = createEmptyDocument(sourceName);
    const pages: DocumentPage[] = displayList.pages.map((pageDl) => {
      const pageId = `page_${pageDl.pageIndex}`;
      const resources: PageResources = {
        fonts: {},
        images: {},
        extGStates: {},
      };
      const objects: PageObject[] = [];
      let z = 0;

      for (let i = 0; i < pageDl.ops.length; i++) {
        const op = pageDl.ops[i]!;

        if (op.op === "text") {
          const textOp = op as DisplayListText;
          if (!textOp.content.trim()) continue;

          const fontResourceId = ensureFont(resources, textOp.fontName);
          const objectId = textOp.objectId ?? `text_${pageDl.pageIndex}_${i}`;
          const bbox =
            textOp.bboxNorm ??
            estimateBBoxNorm(
              textOp.matrix,
              textOp.fontSize,
              textOp.content,
              pageDl.width,
              pageDl.height,
            );
          const hasUnicodeMap = textOp.hasUnicodeMap ?? looksLikeUnicodeText(textOp.content);

          const textObj: TextObject = {
            id: objectId,
            kind: "text",
            pageId,
            bbox,
            transform: textOp.matrix,
            editability: hasUnicodeMap ? "structural" : "read-only",
            zIndex: z++,
            content: textOp.content,
            fontResourceId,
            fontSize: textOp.fontSize,
            fillColor: textOp.fillColor,
            hasUnicodeMap,
          };
          objects.push(textObj);
          continue;
        }

        if (op.op === "image") {
          const resourceId = ensureImage(resources, op.resourceName, op.widthPx, op.heightPx, op.dataUrl);
          const bbox =
            op.bboxNorm ??
            matrixImageBBoxNorm(op.matrix, pageDl.width, pageDl.height);
          const imageObj: ImageObject = {
            id: op.objectId ?? `img_${pageDl.pageIndex}_${i}`,
            kind: "image",
            pageId,
            bbox,
            transform: op.matrix,
            // Without pixels, move/replace is limited; delete still structural.
            editability: op.dataUrl ? "structural" : "structural",
            zIndex: z++,
            resourceId,
            widthPx: op.widthPx ?? 0,
            heightPx: op.heightPx ?? 0,
            dataUrl: op.dataUrl ?? null,
          };
          objects.push(imageObj);
          continue;
        }

        if (op.op === "drawPath") {
          const pathObj: PathObject = {
            id: op.objectId ?? `path_${pageDl.pageIndex}_${i}`,
            kind: "path",
            pageId,
            bbox: op.bboxNorm,
            transform: identityMatrix(),
            editability: "structural",
            zIndex: z++,
            ops: op.pathOps,
            fillColor: op.fillColor,
            strokeColor: op.strokeColor,
            strokeWidth: op.strokeWidth,
          };
          objects.push(pathObj);
        }
      }

      return {
        id: pageId,
        index: pageDl.pageIndex,
        width: pageDl.width,
        height: pageDl.height,
        rotation: 0,
        objects,
        resources,
      };
    });

    const docResources: DocumentResource[] = [];
    for (const page of pages) {
      for (const font of Object.values(page.resources.fonts)) {
        if (!docResources.some((r) => r.id === font.id)) docResources.push(font);
      }
      for (const image of Object.values(page.resources.images)) {
        if (!docResources.some((r) => r.id === image.id)) docResources.push(image);
      }
    }

    return {
      ...base,
      pages,
      resources: docResources,
      revision: 0,
    };
  }
}

function ensureFont(resources: PageResources, fontName: string | null): string | null {
  if (!fontName) return null;
  const id = `font_${sanitizeId(fontName)}`;
  if (!resources.fonts[id]) {
    resources.fonts[id] = {
      id,
      kind: "font",
      name: fontName,
      embedded: false,
      isType0: fontName.includes("Identity") || fontName.startsWith("g_d"),
    };
  }
  return id;
}

function ensureImage(
  resources: PageResources,
  resourceName: string,
  widthPx?: number,
  heightPx?: number,
  dataUrl?: string | null,
): string {
  const id = `imgres_${sanitizeId(resourceName)}`;
  if (!resources.images[id]) {
    const image: ImageResource = {
      id,
      kind: "image",
      width: widthPx ?? 0,
      height: heightPx ?? 0,
      data: null,
      dataUrl: dataUrl ?? null,
    };
    resources.images[id] = image;
  } else if (dataUrl && !resources.images[id]!.dataUrl) {
    resources.images[id] = { ...resources.images[id]!, dataUrl };
  }
  return id;
}

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64);
}

function looksLikeUnicodeText(content: string): boolean {
  for (const ch of content) {
    if (ch.charCodeAt(0) === 0xfffd) return false;
  }
  return content.length > 0;
}

function estimateBBoxNorm(
  matrix: Matrix2D,
  fontSize: number,
  content: string,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const [, , , , tx, ty] = matrix;
  const w = Math.max((content.length * fontSize * 0.5) / pageWidth, 0.02);
  const h = Math.max(fontSize / pageHeight, 0.012);
  const x = tx / pageWidth;
  const y = 1 - ty / pageHeight - h;
  return { x, y, width: w, height: h };
}

/** Unit-square image under CTM → normalized top-left bbox. */
function matrixImageBBoxNorm(
  matrix: Matrix2D,
  pageWidth: number,
  pageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const [a, b, c, d, e, f] = matrix;
  const x0 = e;
  const y0 = f;
  const x1 = a + c + e;
  const y1 = b + d + f;
  const minX = Math.min(x0, x1, e + a, e + c);
  const maxX = Math.max(x0, x1, e + a, e + c);
  const minY = Math.min(y0, y1, f + b, f + d);
  const maxY = Math.max(y0, y1, f + b, f + d);
  const width = Math.max((maxX - minX) / pageWidth, 0.01);
  const height = Math.max((maxY - minY) / pageHeight, 0.01);
  const x = minX / pageWidth;
  const y = 1 - maxY / pageHeight;
  return { x, y, width, height };
}

export type { FontResource };
