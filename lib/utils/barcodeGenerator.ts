/**
 * Generate a random numeric barcode
 * Format: 12-digit numeric (UPC-A compatible)
 * No uniqueness checking - generates random barcodes
 */
export function generateRandomBarcode(): string {
  const numbers = "0123456789";
  let barcode = "";

  // Generate 12 digits
  for (let i = 0; i < 12; i++) {
    barcode += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return barcode;
}

/**
 * Format barcode for display (add spaces for readability)
 * Converts: 123456789012 -> 1234 5678 9012
 */
export function formatBarcodeDisplay(barcode: string): string {
  return barcode.replace(/(.{4})/g, "$1 ").trim();
}

