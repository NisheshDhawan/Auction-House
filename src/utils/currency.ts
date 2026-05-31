// Currency formatting utilities for Indian Rupees

/**
 * Format a number as Indian Rupees with proper comma separation
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the ₹ symbol (default: true)
 * @returns Formatted currency string
 */
export const formatRupees = (amount: number, showSymbol: boolean = true): string => {
  const formatted = amount.toLocaleString('en-IN');
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format a number as Indian Rupees with abbreviated notation for large amounts
 * @param amount - The amount to format
 * @returns Formatted currency string with K, L, Cr abbreviations
 */
export const formatRupeesCompact = (amount: number): string => {
  if (amount >= 10000000) { // 1 Crore
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  } else if (amount >= 100000) { // 1 Lakh
    return `₹${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) { // 1 Thousand
    return `₹${(amount / 1000).toFixed(1)}K`;
  } else {
    return `₹${amount}`;
  }
};

/**
 * Parse a rupee string back to number
 * @param rupeeString - String like "₹24,900" or "24900"
 * @returns Parsed number
 */
export const parseRupees = (rupeeString: string): number => {
  // Remove ₹ symbol and commas, then parse
  const cleanString = rupeeString.replace(/[₹,]/g, '');
  return parseFloat(cleanString) || 0;
};