/**
 * Generate a memorable random SKU
 * Format: SKU-XXXX-XXXX where each segment is easier to remember
 * Uses a mix of letters and numbers in a readable pattern
 */
export function generateRandomSKU(): string {
  // Use consonants and vowels for more pronounceable combinations
  const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
  const vowels = "AEIOU";
  const numbers = "0123456789";

  // Generate first segment: 2 letters + 2 numbers (e.g., "AB12")
  const segment1 =
    consonants.charAt(Math.floor(Math.random() * consonants.length)) +
    vowels.charAt(Math.floor(Math.random() * vowels.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length));

  // Generate second segment: 2 letters + 2 numbers (e.g., "CD34")
  const segment2 =
    consonants.charAt(Math.floor(Math.random() * consonants.length)) +
    vowels.charAt(Math.floor(Math.random() * vowels.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length)) +
    numbers.charAt(Math.floor(Math.random() * numbers.length));

  return `SKU-${segment1}-${segment2}`;
}

/**
 * Generate a unique SKU by checking against existing SKUs
 * This should be called from the API endpoint that has database access
 */
export async function generateUniqueSKU(
  checkUniqueness: (sku: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  let attempts = 0;
  let sku: string;
  let isUnique = false;

  while (attempts < maxAttempts && !isUnique) {
    sku = generateRandomSKU();
    isUnique = await checkUniqueness(sku);
    attempts++;
  }

  if (!isUnique) {
    // If still not unique after max attempts, use timestamp-based format
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ";
    const vowels = "AEIOU";
    const timestamp = Date.now().toString().slice(-4);
    const segment1 =
      consonants.charAt(Math.floor(Math.random() * consonants.length)) +
      vowels.charAt(Math.floor(Math.random() * vowels.length)) +
      timestamp;
    const segment2 =
      consonants.charAt(Math.floor(Math.random() * consonants.length)) +
      vowels.charAt(Math.floor(Math.random() * vowels.length)) +
      Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0");
    return `SKU-${segment1}-${segment2}`;
  }

  return sku!;
}
