interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  rate: number;
  name: string;
  lastUpdated: string;
}

type CurrencyCode = keyof typeof CURRENCIES;

const CURRENCIES: Record<string, CurrencyInfo> = {
  IDR: { code: 'IDR', symbol: 'Rp', locale: 'id-ID', rate: 1, name: 'Indonesian Rupiah', lastUpdated: '2026-01' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', rate: 0.000062, name: 'US Dollar', lastUpdated: '2026-01' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', rate: 0.000057, name: 'Euro', lastUpdated: '2026-01' },
  SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG', rate: 0.000083, name: 'Singapore Dollar', lastUpdated: '2026-01' },
  MYR: { code: 'MYR', symbol: 'RM', locale: 'ms-MY', rate: 0.00029, name: 'Malaysian Ringgit', lastUpdated: '2026-01' },
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', rate: 0.0093, name: 'Japanese Yen', lastUpdated: '2026-01' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', rate: 0.000049, name: 'British Pound', lastUpdated: '2026-01' },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', rate: 0.000094, name: 'Australian Dollar', lastUpdated: '2026-01' },
  CNY: { code: 'CNY', symbol: '¥', locale: 'zh-CN', rate: 0.00045, name: 'Chinese Yuan', lastUpdated: '2026-01' },
};

export const getSupportedCurrencies = (): CurrencyInfo[] => Object.values(CURRENCIES);

export const getCurrencyInfo = (code: string): CurrencyInfo => CURRENCIES[code] || CURRENCIES.IDR;

export const convertAmount = (amountInIDR: number, targetCurrency: string): number => {
  const info = getCurrencyInfo(targetCurrency);
  return amountInIDR * info.rate;
};

export const formatCurrency = (amountInIDR: number, currencyCode: string, options: { round?: boolean } = {}): string => {
  const info = getCurrencyInfo(currencyCode);
  const converted = convertAmount(amountInIDR, currencyCode);
  const rounded = options.round !== false ? Math.round(converted) : converted;
  return `${info.symbol}${rounded.toLocaleString(info.locale)}`;
};

export const formatIDR = (val: number): string => {
  const rounded = Math.round(val);
  return rounded.toLocaleString('id-ID');
};
