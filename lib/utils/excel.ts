/**
 * Excel Export/Import Utilities
 */

import * as XLSX from "xlsx";

/**
 * Parse Excel file to array of objects
 */
export function parseExcel(
  file: File
): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }

        // Read the workbook
        const workbook = XLSX.read(data, { type: "binary" });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error("Excel file has no sheets"));
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON (array of objects)
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          worksheet,
          {
            header: 1, // Use first row as headers
            defval: "", // Default value for empty cells
            raw: false, // Convert all values to strings
          }
        );

        if (jsonData.length === 0) {
          resolve([]);
          return;
        }

        // First row is headers
        const headers = (jsonData[0] as unknown[]) as string[];
        const normalizedHeaders = headers.map((h) =>
          String(h || "").trim()
        );

        // Convert to array of objects
        const result: Record<string, string>[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          const obj: Record<string, string> = {};
          normalizedHeaders.forEach((header, index) => {
            if (header) {
              // Convert value to string, handling null/undefined
              const value = row[index];
              obj[header] =
                value === null || value === undefined
                  ? ""
                  : String(value).trim();
            }
          });
          result.push(obj);
        }

        resolve(result);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to parse Excel file")
        );
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

/**
 * Convert array of objects to Excel file and download
 */
export function downloadExcel<T extends Record<string, unknown>>(
  data: T[],
  headers: string[],
  filename: string
): void {
  // Prepare data with headers as first row
  const worksheetData = [
    headers, // Header row
    ...data.map((item) =>
      headers.map((header) => {
        const value = item[header];
        return value === null || value === undefined ? "" : String(value);
      })
    ),
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Generate Excel file and download
  XLSX.writeFile(workbook, filename);
}

