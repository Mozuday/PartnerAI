
"use client";

import { useState } from "react";

type UseDocumentsOptions = {
  onDocumentChange: (name: string, text: string) => void;
};

export function useDocuments({
  onDocumentChange,
}: UseDocumentsOptions) {
  const [documentName, setDocumentName] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadDocument(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["pdf", "docx", "txt", "md"].includes(extension || "")) {
      setError("Select a PDF, DOCX, TXT, or MD file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Maximum file size is 10 MB.");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      let data: {
        name?: string;
        text?: string;
        error?: string;
      };

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("Invalid document server response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      if (!data.name || !data.text) {
        throw new Error("No document text was returned.");
      }

      setDocumentName(data.name);
      setDocumentText(data.text);

      onDocumentChange(data.name, data.text);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeDocument() {
    setDocumentName("");
    setDocumentText("");
    onDocumentChange("", "");
    setError("");
  }

  function restoreDocument(name: string, text: string) {
    setDocumentName(name);
    setDocumentText(text);
  }

  return {
    // Names used by the new page
    docName: documentName,
    docText: documentText,

    // Keep the original names available too
    documentName,
    documentText,

    uploading,
    error,
    setError,
    uploadDocument,
    removeDocument,
    restoreDocument,
  };
}