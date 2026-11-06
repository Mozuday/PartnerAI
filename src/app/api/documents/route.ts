import { NextResponse } from "next/server";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_OCR_PAGES = 30;
const MAX_EXTRACTED_CHARS = 100_000;

const execFileAsync = promisify(execFile);

// Windows executable paths
const POPPLER_PATH = String.raw`C:\Users\UdaySharma\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin\pdftoppm.exe`;

const TESSERACT_PATH = String.raw`C:\Program Files\Tesseract-OCR\tesseract.exe`;

const TESSDATA_PATH = String.raw`C:\Program Files\Tesseract-OCR\tessdata`;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unknown error occurred.";
}

// OCR for scanned PDFs
async function extractScannedPdfText(
  buffer: Buffer,
  pageCount: number
): Promise<string> {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "PartnerAI-ocr-")
  );

  try {
    const pdfPath = path.join(tempDir, "document.pdf");
    const outputPrefix = path.join(tempDir, "page");

    await writeFile(pdfPath, buffer);

    await execFileAsync(
      POPPLER_PATH,
      [
        "-f",
        "1",
        "-l",
        String(Math.min(pageCount, MAX_OCR_PAGES)),
        "-r",
        "200",
        "-png",
        pdfPath,
        outputPrefix,
      ],
      {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    const files = await readdir(tempDir);

    const images = files
      .filter((file) => /^page-\d+\.png$/i.test(file))
      .sort((a, b) => {
        const pageA = Number(a.match(/\d+/)?.[0] ?? 0);
        const pageB = Number(b.match(/\d+/)?.[0] ?? 0);
        return pageA - pageB;
      });

    if (images.length === 0) {
      throw new Error(
        "Poppler did not generate PDF page images. Check the Poppler installation path."
      );
    }

    const extractedPages: string[] = [];

    for (let index = 0; index < images.length; index++) {
      const imagePath = path.join(tempDir, images[index]);

      const { stdout } = await execFileAsync(
        TESSERACT_PATH,
        [
          imagePath,
          "stdout",
          "-l",
          "eng+hin",
          "--psm",
          "3",
        ],
        {
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            TESSDATA_PREFIX: TESSDATA_PATH,
          },
        }
      );

      const pageText = stdout.trim();

      if (pageText) {
        extractedPages.push(
          `--- Page ${index + 1} ---\n${pageText}`
        );
      }
    }

    return extractedPages.join("\n\n").trim();
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a document." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The selected file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Maximum file size is 10 MB." },
        { status: 413 }
      );
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const supportedExtensions = [
      "pdf",
      "docx",
      "txt",
      "md",
    ];

    if (
      !extension ||
      !supportedExtensions.includes(extension)
    ) {
      return NextResponse.json(
        {
          error:
            "Supported formats: PDF, DOCX, TXT, and MD.",
        },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = "";

    if (extension === "pdf") {
      const pdfResult = await pdf(buffer);

      const pageCount = pdfResult.numpages || 1;

      extractedText = pdfResult.text.trim();

      // Use OCR if the PDF contains no extractable text.
      if (!extractedText) {
        if (pageCount > MAX_OCR_PAGES) {
          return NextResponse.json(
            {
              error: `This PDF has ${pageCount} pages. Scanned PDF OCR currently supports up to ${MAX_OCR_PAGES} pages.`,
            },
            { status: 413 }
          );
        }

        extractedText = await extractScannedPdfText(
          buffer,
          pageCount
        );
      }
    } else if (extension === "docx") {
      const result = await mammoth.extractRawText({
        buffer,
      });

      extractedText = result.value.trim();
    } else if (
      extension === "txt" ||
      extension === "md"
    ) {
      extractedText = buffer
        .toString("utf-8")
        .trim();
    }

    if (!extractedText) {
      return NextResponse.json(
        {
          error:
            "No readable text was found. Check the PDF quality and OCR language installation.",
        },
        { status: 422 }
      );
    }

    // Prevent extremely large documents from overwhelming the AI.
    if (extractedText.length > MAX_EXTRACTED_CHARS) {
      extractedText = extractedText.slice(
        0,
        MAX_EXTRACTED_CHARS
      );
    }

    return NextResponse.json({
      success: true,
      name: file.name,
      text: extractedText,
      characters: extractedText.length,
    });
  } catch (error) {
    console.error(
      "Document extraction error:",
      error
    );

    return NextResponse.json(
      {
        error: `Document processing failed: ${getErrorMessage(error)}`,
      },
      { status: 500 }
    );
  }
}