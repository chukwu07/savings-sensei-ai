// Number formatting utilities for consistent display across the app

/**
 * Formats numbers with automatic shortening for large values
 * Examples: 
 * - 1234 → 1.2K
 * - 1234567 → 1.2M  
 * - 500 → 500 (no shortening for small numbers)
 */
export function formatNumberShort(value: number): string {
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  
  return value.toString();
}

/**
 * Formats currency with smart shortening for cards
 * Combines currency formatting with number shortening
 */
export function formatCurrencyShort(amount: number, currency = 'GBP'): string {
  const shortNumber = formatNumberShort(amount);
  
  // Add currency symbol based on currency code
  const symbols: Record<string, string> = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€'
  };
  
  const symbol = symbols[currency] || '£';
  
  return `${symbol}${shortNumber}`;
}

/**
 * Determines the appropriate font size based on text length
 * For responsive card content
 */
export function getResponsiveFontSize(text: string): string {
  const length = text.length;
  
  if (length <= 4) return 'text-mobile-2xl'; // £1.2K
  if (length <= 6) return 'text-mobile-xl';  // £12.5K
  if (length <= 8) return 'text-mobile-lg';  // £125.3K
  
  return 'text-mobile-base'; // Very long numbers
}