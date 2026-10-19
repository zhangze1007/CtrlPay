/**
 * Unified Activities and Expense Categories data model.
 *
 * Provides reactive persistence for transactions across:
 * - Campus Cash Dashboard (Total Balance, Expenses, Donut Chart)
 * - Latest Transactions (ActivitySection)
 * - All Transactions view (AllTransactionsSlideView)
 * - Calendar tab (ModernCalendar)
 * - OCR Receipt Flow Modal
 */

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string; // Formatted with flanking dashes e.g. "- RM 30.00 -"
  rawAmount: number;
  category: string;
  categoryType: 'food' | 'shopping' | 'subscription' | 'transfer' | 'entertainment' | 'bills';
  iconBg: string;
  iconType: 'apple' | 'mcdonalds' | 'spotify' | 'grab' | 'instagram' | 'tng' | 'maybank' | 'publicbank' | 'custom';
  timestamp: string;
  paymentMethod: string;
  referenceId: string;
  isExtractedFromNotification?: boolean;
  rawNotificationText?: string;
  aiCategorizationNote?: string;
  aiConfidence?: number;
}

export const INITIAL_CATEGORY_EXPENSES: Record<string, number> = {
  'Dining & Food': 989.4,
  'Living & Home': 698.4,
  'Bills & Utilities': 510.0,
  'Transport': 407.4,
  'Entertainment': 232.8,
  'Other': 72.0,
};

export const INITIAL_TOTAL_EXPENSES = 2910.0;

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Apple service subscription',
    subtitle: 'App Store, Tinder, and 2+',
    amount: '- RM 30.00 -',
    rawAmount: 30.0,
    category: 'Subscription',
    categoryType: 'subscription',
    iconBg: '#000000',
    iconType: 'apple',
    timestamp: 'Today, 2:45 PM',
    paymentMethod: 'Apple Pay · Mastercard *4829',
    referenceId: 'APL-99482-TXN',
    aiCategorizationNote: 'Recurring monthly digital subscription detected. Tagged to Fixed Commitments.',
    aiConfidence: 99,
  },
  {
    id: 'act-2',
    title: 'Have a lunch with Mike',
    subtitle: 'Bigmac, Chicken Wings',
    amount: '- RM 30.00 -',
    rawAmount: 30.0,
    category: 'Food & Dining',
    categoryType: 'food',
    iconBg: '#DA291C',
    iconType: 'mcdonalds',
    timestamp: 'Today, 12:30 PM',
    paymentMethod: "Touch 'n Go eWallet (DuitNow QR)",
    referenceId: 'TNG-88319-KOP',
    isExtractedFromNotification: true,
    rawNotificationText: "Touch 'n Go eWallet: Payment of RM 30.00 to McDonald's SS15 successful via DuitNow QR.",
    aiCategorizationNote: "Extracted from Touch 'n Go push notification. Auto-categorized as Food & Dining based on merchant name. Within daily survival floor.",
    aiConfidence: 98,
  },
  {
    id: 'act-3',
    title: 'Spotify Family Plan',
    subtitle: 'Spotify Monthly Subscription',
    amount: '- RM 12.00 -',
    rawAmount: 12.0,
    category: 'Streaming',
    categoryType: 'subscription',
    iconBg: '#1DB954',
    iconType: 'spotify',
    timestamp: 'Yesterday, 8:00 AM',
    paymentMethod: 'Maybank MAE · Visa *1042',
    referenceId: 'MBB-44120-SPT',
    aiCategorizationNote: 'Zombie Radar active: Flagged as shared family plan eligible for student discount.',
    aiConfidence: 96,
  },
  {
    id: 'act-4',
    title: 'Nasi Bebek Guling',
    subtitle: 'Bebek Guling Surabaya',
    amount: '- RM 5.00 -',
    rawAmount: 5.0,
    category: 'Local Eats',
    categoryType: 'food',
    iconBg: '#00B14F',
    iconType: 'grab',
    timestamp: 'Yesterday, 7:15 PM',
    paymentMethod: 'GrabPay Balance',
    referenceId: 'GP-77291-BEB',
    isExtractedFromNotification: true,
    rawNotificationText: 'GrabPay: You paid RM 5.00 to Warung Bebek Guling. Order #8824.',
    aiCategorizationNote: 'Extracted from GrabPay notification. Tagged to Dining & Food.',
    aiConfidence: 97,
  },
  {
    id: 'act-5',
    title: 'Instagram Ads',
    subtitle: 'Sponsored Boost Campaign',
    amount: '- RM 24.00 -',
    rawAmount: 24.0,
    category: 'Marketing',
    categoryType: 'bills',
    iconBg: '#E1306C',
    iconType: 'instagram',
    timestamp: '16 Oct, 11:20 AM',
    paymentMethod: 'Public Bank Visa *3319',
    referenceId: 'PB-30219-META',
    aiCategorizationNote: 'Classified under Business/Marketing expense.',
    aiConfidence: 94,
  },
];

export const EXTENDED_ACTIVITIES: ActivityItem[] = [
  ...INITIAL_ACTIVITIES,
  {
    id: 'act-6',
    title: 'Zus Coffee Mid Valley',
    subtitle: 'Iced Spanish Latte x2',
    amount: '- RM 15.50 -',
    rawAmount: 15.5,
    category: 'Food & Drinks',
    categoryType: 'food',
    iconBg: '#0055B8',
    iconType: 'tng',
    timestamp: '15 Oct, 3:15 PM',
    paymentMethod: "Touch 'n Go eWallet",
    referenceId: 'TNG-77402-ZUS',
    isExtractedFromNotification: true,
    rawNotificationText: "Touch 'n Go eWallet: Payment of RM 15.50 to Zus Coffee successful.",
    aiCategorizationNote: 'Extracted from TNG push notification. AI categorized as Food & Drinks.',
    aiConfidence: 99,
  },
  {
    id: 'act-7',
    title: 'Dinner Steamboat Split',
    subtitle: 'Mike Wong (DuitNow)',
    amount: '- RM 45.00 -',
    rawAmount: 45.0,
    category: 'Food & Dining',
    categoryType: 'food',
    iconBg: '#FFCE00',
    iconType: 'maybank',
    timestamp: '14 Oct, 8:45 PM',
    paymentMethod: 'Maybank MAE',
    referenceId: 'MAE-55102-SBT',
    isExtractedFromNotification: true,
    rawNotificationText: 'Maybank MAE: DuitNow Transfer RM 45.00 to Mike Wong. Ref: Dinner steamboat split.',
    aiCategorizationNote: 'Extracted from Maybank MAE notification. Peer transfer tagged to Dining.',
    aiConfidence: 98,
  },
  {
    id: 'act-8',
    title: 'Campus Bookstore',
    subtitle: 'Semester Textbooks & Stationery',
    amount: '- RM 120.00 -',
    rawAmount: 120.0,
    category: 'Education & Supplies',
    categoryType: 'shopping',
    iconBg: '#4F46E5',
    iconType: 'custom',
    timestamp: '12 Oct, 10:30 AM',
    paymentMethod: 'Mastercard *4829',
    referenceId: 'BOK-33910-EDU',
    aiCategorizationNote: 'Matched to semester textbook allocation in CFaR student budget.',
    aiConfidence: 95,
  },
  {
    id: 'act-9',
    title: 'GrabCar to Sunway Uni',
    subtitle: 'Morning Ride · Sunway Velocity',
    amount: '- RM 14.00 -',
    rawAmount: 14.0,
    category: 'Transport',
    categoryType: 'bills',
    iconBg: '#00B14F',
    iconType: 'grab',
    timestamp: '11 Oct, 8:20 AM',
    paymentMethod: 'GrabPay Balance',
    referenceId: 'GP-99210-RIDE',
    aiCategorizationNote: 'Tagged under Campus Transport.',
    aiConfidence: 96,
  },
  {
    id: 'act-10',
    title: 'FamilyMart SS15',
    subtitle: 'Matcha Softserve & Oden',
    amount: '- RM 18.20 -',
    rawAmount: 18.2,
    category: 'Food & Snacks',
    categoryType: 'food',
    iconBg: '#0055B8',
    iconType: 'tng',
    timestamp: '10 Oct, 9:15 PM',
    paymentMethod: "Touch 'n Go eWallet",
    referenceId: 'TNG-22910-FM',
    aiCategorizationNote: 'Auto-categorized under Food & Snacks.',
    aiConfidence: 97,
  },
  {
    id: 'act-11',
    title: 'Netflix Premium 4K',
    subtitle: 'Monthly Family Entertainment',
    amount: '- RM 25.86 -',
    rawAmount: 25.86,
    category: 'Streaming',
    categoryType: 'subscription',
    iconBg: '#000000',
    iconType: 'apple',
    timestamp: '08 Oct, 9:00 AM',
    paymentMethod: 'Apple Pay · Mastercard *4829',
    referenceId: 'NFLX-88190-SUB',
    aiCategorizationNote: 'Recurring digital subscription. Verified active.',
    aiConfidence: 99,
  },
  {
    id: 'act-12',
    title: 'Allowance from Mom',
    subtitle: 'DuitNow Instant Transfer',
    amount: '+ RM 300.00 +',
    rawAmount: 300.0,
    category: 'Income / Allowance',
    categoryType: 'transfer',
    iconBg: '#FFCE00',
    iconType: 'maybank',
    timestamp: '05 Oct, 11:00 AM',
    paymentMethod: 'Maybank MAE Account',
    referenceId: 'MAE-11029-INC',
    aiCategorizationNote: 'Inbound family allowance. Added to monthly survival liquidity.',
    aiConfidence: 99,
  },
  {
    id: 'act-13',
    title: 'Unifi Home Fiber 100Mbps',
    subtitle: 'Monthly Internet Utility',
    amount: '- RM 89.00 -',
    rawAmount: 89.0,
    category: 'Utilities',
    categoryType: 'bills',
    iconBg: '#CC0000',
    iconType: 'publicbank',
    timestamp: '03 Oct, 2:10 PM',
    paymentMethod: 'Public Bank Auto-Debit',
    referenceId: 'PB-44019-UNIFI',
    aiCategorizationNote: 'Fixed commitment utility bill. Cleared.',
    aiConfidence: 98,
  },
  {
    id: 'act-14',
    title: 'Watsons Pharmacy',
    subtitle: 'Personal Care & Vitamins',
    amount: '- RM 22.50 -',
    rawAmount: 22.5,
    category: 'Health & Care',
    categoryType: 'shopping',
    iconBg: '#00A099',
    iconType: 'grab',
    timestamp: '01 Oct, 5:40 PM',
    paymentMethod: 'GrabPay Balance',
    referenceId: 'GP-10294-WAT',
    aiCategorizationNote: 'Categorized as Health & Personal Care.',
    aiConfidence: 94,
  },
  {
    id: 'act-15',
    title: 'Steam Summer Game',
    subtitle: 'Indie Game Bundle',
    amount: '- RM 42.00 -',
    rawAmount: 42.0,
    category: 'Entertainment',
    categoryType: 'entertainment',
    iconBg: '#171A21',
    iconType: 'custom',
    timestamp: '28 Sep, 10:15 PM',
    paymentMethod: 'Mastercard *4829',
    referenceId: 'STM-77301-GAM',
    aiCategorizationNote: 'Discretionary gaming expenditure.',
    aiConfidence: 96,
  },
];

/**
 * Maps arbitrary category and merchant strings into one of the 6 Campus Cash Dashboard categories
 * and generates appropriate ActivityItem UI attributes.
 */
export function mapToDashboardCategory(
  category: string,
  merchant = ''
): {
  categoryName: string;
  categoryType: ActivityItem['categoryType'];
  iconType: ActivityItem['iconType'];
  iconBg: string;
} {
  const c = (category || '').toLowerCase();
  const m = (merchant || '').toLowerCase();

  // Dining & Food
  if (
    c.includes('food') ||
    c.includes('beverage') ||
    c.includes('dining') ||
    c.includes('meal') ||
    c.includes('snack') ||
    c.includes('cafe') ||
    c.includes('coffee') ||
    c.includes('tea') ||
    c.includes('bubble') ||
    c.includes('restaurant') ||
    m.includes('coffee') ||
    m.includes('tea') ||
    m.includes('zus') ||
    m.includes('starbucks') ||
    m.includes('mcdonald') ||
    m.includes('kfc') ||
    m.includes('burger') ||
    m.includes('steamboat') ||
    m.includes('bebek') ||
    m.includes('cafeteria') ||
    m.includes('subway')
  ) {
    let iconType: ActivityItem['iconType'] = 'custom';
    let iconBg = '#FEF3C7';
    if (m.includes('mcdonald') || m.includes('burger')) {
      iconType = 'mcdonalds';
      iconBg = '#DA291C';
    } else if (m.includes('zus') || m.includes('tng') || m.includes('touch')) {
      iconType = 'tng';
      iconBg = '#0055B8';
    } else if (m.includes('grab')) {
      iconType = 'grab';
      iconBg = '#00B14F';
    }
    return {
      categoryName: 'Dining & Food',
      categoryType: 'food',
      iconType,
      iconBg,
    };
  }

  // Transport
  if (
    c.includes('transport') ||
    c.includes('ride') ||
    c.includes('car') ||
    c.includes('bus') ||
    c.includes('train') ||
    c.includes('mrt') ||
    c.includes('lrt') ||
    c.includes('petrol') ||
    c.includes('fuel') ||
    c.includes('parking') ||
    m.includes('grab') ||
    m.includes('tng') ||
    m.includes('rapid') ||
    m.includes('petronas') ||
    m.includes('shell')
  ) {
    return {
      categoryName: 'Transport',
      categoryType: 'transfer',
      iconType: m.includes('grab') ? 'grab' : 'tng',
      iconBg: m.includes('grab') ? '#00B14F' : '#0055B8',
    };
  }

  // Bills & Utilities
  if (
    c.includes('bill') ||
    c.includes('utilit') ||
    c.includes('telecom') ||
    c.includes('phone') ||
    c.includes('wifi') ||
    c.includes('internet') ||
    c.includes('electric') ||
    c.includes('water') ||
    m.includes('unifi') ||
    m.includes('maxis') ||
    m.includes('celcom') ||
    m.includes('digi') ||
    m.includes('tnb')
  ) {
    return {
      categoryName: 'Bills & Utilities',
      categoryType: 'bills',
      iconType: 'publicbank',
      iconBg: '#CC0000',
    };
  }

  // Entertainment
  if (
    c.includes('entertain') ||
    c.includes('stream') ||
    c.includes('game') ||
    c.includes('movie') ||
    c.includes('cinema') ||
    c.includes('music') ||
    m.includes('spotify') ||
    m.includes('netflix') ||
    m.includes('steam') ||
    m.includes('apple') ||
    m.includes('youtube') ||
    m.includes('disney')
  ) {
    let iconType: ActivityItem['iconType'] = 'custom';
    let iconBg = '#171A21';
    if (m.includes('spotify')) {
      iconType = 'spotify';
      iconBg = '#1DB954';
    } else if (m.includes('apple')) {
      iconType = 'apple';
      iconBg = '#000000';
    }
    return {
      categoryName: 'Entertainment',
      categoryType: 'entertainment',
      iconType,
      iconBg,
    };
  }

  // Living & Home
  if (
    c.includes('living') ||
    c.includes('home') ||
    c.includes('grocer') ||
    c.includes('rent') ||
    c.includes('dorm') ||
    c.includes('educat') ||
    c.includes('book') ||
    c.includes('stationery') ||
    c.includes('supplies') ||
    c.includes('health') ||
    c.includes('pharmacy') ||
    m.includes('watson') ||
    m.includes('guardian') ||
    m.includes('bookstore') ||
    m.includes('popular') ||
    m.includes('campus')
  ) {
    return {
      categoryName: 'Living & Home',
      categoryType: 'shopping',
      iconType: 'custom',
      iconBg: '#4F46E5',
    };
  }

  // Other / General Shopping
  return {
    categoryName: 'Other',
    categoryType: 'shopping',
    iconType: 'custom',
    iconBg: '#10B981',
  };
}
