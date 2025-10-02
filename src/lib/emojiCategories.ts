// Emoji category mapping for simple UX
export const emojiCategories = {
  '🍕': { name: 'Food & Dining', id: 'food' },
  '⛽': { name: 'Gas & Transport', id: 'transport' },
  '🛍️': { name: 'Shopping', id: 'shopping' },
  '🏠': { name: 'Home & Utilities', id: 'housing' },
  '💊': { name: 'Healthcare', id: 'healthcare' },
  '🎬': { name: 'Entertainment', id: 'entertainment' },
  '📚': { name: 'Education', id: 'education' },
  '💰': { name: 'Income', id: 'income' },
  '🎁': { name: 'Gifts', id: 'gifts' },
  '🔧': { name: 'Services', id: 'services' }
};

export const categoryKeywords = {
  food: ['restaurant', 'food', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'mcdonalds', 'starbucks', 'grocery'],
  transport: ['gas', 'fuel', 'uber', 'taxi', 'train', 'bus', 'parking', 'metro'],
  shopping: ['amazon', 'store', 'mall', 'shop', 'clothes', 'target', 'walmart'],
  housing: ['rent', 'mortgage', 'electricity', 'water', 'internet', 'phone'],
  healthcare: ['doctor', 'pharmacy', 'medicine', 'hospital', 'dental'],
  entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert', 'bar'],
  education: ['school', 'course', 'book', 'tuition'],
  income: ['salary', 'paycheck', 'freelance', 'bonus'],
  gifts: ['gift', 'present', 'donation'],
  services: ['repair', 'maintenance', 'service']
};

export function getEmojiForCategory(category: string): string {
  const emoji = Object.keys(emojiCategories).find(
    key => emojiCategories[key as keyof typeof emojiCategories].id === category.toLowerCase()
  );
  return emoji || '💸'; // Default spending emoji
}

export function getCategoryFromDescription(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }
  
  return 'shopping'; // Default category
}

// Note: getPlainEnglishAmount removed - now using useCurrency().formatCurrency() for consistent currency formatting