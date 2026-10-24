import { getLocales } from "expo-localization";

export const CURRENCY_OPTIONS = [
  "USD — US Dollar",
  "EUR — Euro",
  "GBP — British Pound",
  "INR — Indian Rupee",
  "CAD — Canadian Dollar",
  "AUD — Australian Dollar",
  "PKR — Pakistani Rupee",
  "BDT — Bangladeshi Taka",
  "AED — UAE Dirham",
  "SAR — Saudi Riyal",
  "IDR — Indonesian Rupiah",
  "JPY — Japanese Yen",
  "NGN — Nigerian Naira",
  "ZAR — South African Rand",
  "TRY — Turkish Lira",
  "CHF — Swiss Franc",
  "SEK — Swedish Krona",
  "NOK — Norwegian Krone",
  "DKK — Danish Krone",
  "NZD — New Zealand Dollar",
  "SGD — Singapore Dollar",
  "MYR — Malaysian Ringgit",
  "THB — Thai Baht",
  "PHP — Philippine Peso",
  "LKR — Sri Lankan Rupee",
  "KWD — Kuwaiti Dinar",
  "QAR — Qatari Riyal",
  "EGP — Egyptian Pound",
  "MAD — Moroccan Dirham",
  "KES — Kenyan Shilling",
  "GHS — Ghanaian Cedi",
  "ETB — Ethiopian Birr",
  "TZS — Tanzanian Shilling",
  "UGX — Ugandan Shilling",
  "RUB — Russian Ruble",
  "UAH — Ukrainian Hryvnia",
  "PLN — Polish Zloty",
  "CZK — Czech Koruna",
  "HUF — Hungarian Forint",
  "RON — Romanian Leu",
  "ILS — Israeli New Shekel",
  "JOD — Jordanian Dinar",
  "OMR — Omani Rial",
  "BHD — Bahraini Dinar",
  "MXN — Mexican Peso",
  "BRL — Brazilian Real",
  "ARS — Argentine Peso",
  "CLP — Chilean Peso",
  "COP — Colombian Peso",
  "PEN — Peruvian Sol",
  "VND — Vietnamese Dong",
  "KRW — South Korean Won",
  "CNY — Chinese Yuan",
] as const;

const REGION_CURRENCIES: Record<string, string> = {
  IN: "INR", US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", PK: "PKR",
  BD: "BDT", AE: "AED", SA: "SAR", ID: "IDR", JP: "JPY", NG: "NGN",
  ZA: "ZAR", TR: "TRY", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK",
  NZ: "NZD", SG: "SGD", MY: "MYR", TH: "THB", PH: "PHP", LK: "LKR",
  KW: "KWD", QA: "QAR", EG: "EGP", MA: "MAD", KE: "KES", GH: "GHS",
  ET: "ETB", TZ: "TZS", UG: "UGX", RU: "RUB", UA: "UAH", PL: "PLN",
  CZ: "CZK", HU: "HUF", RO: "RON", IL: "ILS", JO: "JOD", OM: "OMR",
  BH: "BHD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP",
  PE: "PEN", VN: "VND", KR: "KRW", CN: "CNY", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR",
  NL: "EUR", IE: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR",
};

export function getDeviceRegion() {
  const locale = getLocales()[0];
  const regionCode = locale?.regionCode ?? null;
  const currencyCode = locale?.currencyCode ?? (regionCode ? REGION_CURRENCIES[regionCode] : null) ?? "USD";
  let regionName = regionCode;
  if (regionCode && typeof Intl.DisplayNames === "function") {
    try {
      regionName =
        new Intl.DisplayNames([locale?.languageTag ?? "en-US"], { type: "region" }).of(regionCode) ?? regionCode;
    } catch {
      // Hermes and some older JS runtimes do not implement region display names.
    }
  }
  return {
    locale: locale?.languageTag ?? "en-US",
    regionCode,
    regionName,
    currencyCode,
  };
}

export function formatCurrency(price: number, currencyCode: string | null = "INR"): string {
  const { locale } = getDeviceRegion();
  const safeCurrencyCode = currencyCode?.trim().toUpperCase() || "INR";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${safeCurrencyCode} ${price.toLocaleString()}`;
  }
}
