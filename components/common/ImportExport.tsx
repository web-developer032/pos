"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  arrayToCSV,
  downloadCSV,
  parseCSV,
  readFileAsText,
} from "@/lib/utils/csv";
import toast from "react-hot-toast";

interface ImportExportProps<T> {
  data: T[];
  headers: string[];
  filename: string;
  onImport: (items: T[]) => Promise<{ imported: number; errors: string[] }>;
  onImportSuccess?: () => void;
  exportLabel?: string;
  importLabel?: string;
  templateData?: T[];
}

export function ImportExport<T extends Record<string, any>>({
  data,
  headers,
  filename,
  onImport,
  onImportSuccess,
  exportLabel = "Export CSV",
  importLabel = "Import CSV",
  templateData,
}: ImportExportProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    try {
      const csv = arrayToCSV(data, headers);
      downloadCSV(
        csv,
        `${filename}_${new Date().toISOString().split("T")[0]}.csv`
      );
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
      console.error("Export error:", error);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const template =
        templateData && templateData.length > 0
          ? arrayToCSV(templateData, headers)
          : arrayToCSV([], headers); // Just headers if no template data
      downloadCSV(template, `${filename}_template.csv`);
      toast.success("Template downloaded successfully");
    } catch (error) {
      toast.error("Failed to download template");
      console.error("Template download error:", error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await readFileAsText(file);
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error("CSV file is empty");
        return;
      }

      // Validate headers (case-insensitive check)
      const csvHeaders = Object.keys(parsed[0] || {});
      const csvHeadersLower = csvHeaders.map((h) => h.toLowerCase());
      const missingHeaders = headers.filter(
        (h) => !csvHeadersLower.includes(h.toLowerCase())
      );
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
        return;
      }

      const result = await onImport(parsed as T[]);

      if (result.errors.length > 0) {
        toast.error(
          `Imported ${result.imported} items. ${result.errors.length} errors occurred.`,
          { duration: 5000 }
        );
        console.error("Import errors:", result.errors);
      } else {
        toast.success(`Successfully imported ${result.imported} items`);
      }

      if (onImportSuccess) {
        onImportSuccess();
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to import data");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleDownloadTemplate} variant="outline" type="button">
        Download Template
      </Button>
      <Button onClick={handleExport} variant="outline" type="button">
        {exportLabel}
      </Button>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImport}
          className="hidden"
          disabled={isImporting}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          type="button"
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : importLabel}
        </Button>
      </div>
    </div>
  );
}
