/** Pricing constants kept for when Stripe goes live. Checkout is demo-only today. */
export const PRICE_PER_PDF_CENTS = 99;
export const PRICE_LABEL = "€0.99";
export const CURRENCY = "eur";

export type ToolId = "merge" | "split" | "compress" | "editor";

export const TOOLS: {
  id: ToolId;
  name: string;
  href: string;
  tagline: string;
  description: string;
}[] = [
  {
    id: "editor",
    name: "Editor",
    href: "/editor",
    tagline: "Annotate & edit pages",
    description: "Add text, draw, highlight, sign, insert images and manage pages.",
  },
  {
    id: "merge",
    name: "Merge",
    href: "/tools/merge",
    tagline: "Several PDFs → one file",
    description: "Drop multiple PDFs and combine them in the order you choose.",
  },
  {
    id: "split",
    name: "Split",
    href: "/tools/split",
    tagline: "One PDF → separate pages",
    description: "Extract pages or download each page as its own PDF.",
  },
  {
    id: "compress",
    name: "Compress",
    href: "/tools/compress",
    tagline: "Smaller file, same pages",
    description: "Rebuild and slim the PDF for email and uploads.",
  },
];
