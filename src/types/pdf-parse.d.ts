declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    text: string;
    version: string;
  }

  function pdfParse(data: Buffer): Promise<PdfData>;

  export default pdfParse;
}