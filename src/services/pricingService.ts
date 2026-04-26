/**
 * خدمة الأسعار - Pricing Service
 */

import { getSheet } from './sheetLoader'

export interface PriceEntry {
  regular: number
  marketer: number
  company: number
}

export const RENTAL_PERIODS = [
  { value: 'monthly', label: 'شهرياً' },
  { value: 'bimonthly', label: 'كل شهرين' },
  { value: 'quarterly', label: 'كل 3 أشهر' },
  { value: 'semiannual', label: 'كل 6 أشهر' },
  { value: 'annual', label: 'سنوي' },
  { value: 'daily', label: 'يومي' },
]

const PERIOD_MAP: Record<string, string> = {
  'شهرياً': 'monthly',
  'كل شهرين': 'bimonthly',
  'كل 3 أشهر': 'quarterly',
  'كل 6 أشهر': 'semiannual',
  'سنوي': 'annual',
  'يومي': 'daily',
}

export const SIZE_MAP: Record<string, number> = {
  '10x4': 5,
  '12x4': 3,
  '13x5': 1,
  '13X8-T': 13,
  '14x3': 11,
  '5x3': 8,
  '6x3': 9,
  '8x3': 7,
  'سوسيت': 34,
}

let PRICING_DATA: Record<string, Record<string, Record<number, PriceEntry>>> = {}
let pricingLoaded = false

export async function loadPricingFromExcel(): Promise<void> {
  if (pricingLoaded) return

  try {
    const pricesData = await getSheet(1)
    if (!pricesData.length) {
      loadDefaultPricing()
      return
    }

    console.log('[Pricing] أعمدة الأسعار:', Object.keys(pricesData[0] || {}))
    PRICING_DATA = {}

    pricesData.forEach((row: any) => {
      const level = (row['billboard_level'] || row['الفئة'] || 'A').toString().toUpperCase()
      const periodArabic = row['الفترة'] || row['period'] || ''
      const period = PERIOD_MAP[periodArabic] || periodArabic
      const sizeId = parseInt(row['size_id'] || row['ID الحجم'] || '0') || getSizeIdFromSize(row['المقاس'] || '')

      const regular = parseFloat(row['عادي'] || 0) || 0
      const marketer = parseFloat(row['مسوق'] || 0) || 0
      const company = parseFloat(row['شركات'] || 0) || 0

      if (!level || !period || !sizeId) return

      if (!PRICING_DATA[level]) PRICING_DATA[level] = {}
      if (!PRICING_DATA[level][period]) PRICING_DATA[level][period] = {}
      PRICING_DATA[level][period][sizeId] = { regular, marketer, company }
    })

    console.log('[Pricing] تم تحميل الأسعار:', Object.keys(PRICING_DATA))
    pricingLoaded = true
  } catch (error) {
    console.warn('[Pricing] استخدام الأسعار الافتراضية:', error)
    loadDefaultPricing()
  }
}

function getSizeIdFromSize(size: string): number | null {
  const clean = size.trim().toUpperCase().replace('X', 'x')
  for (const [key, id] of Object.entries(SIZE_MAP)) {
    if (key.toUpperCase().replace('X', 'x') === clean) return id
  }
  return null
}

export function getSizeId(size: string): number | null {
  return getSizeIdFromSize(size)
}

export function getPrice(level: string, size: string, period: string, customerType: 'regular' | 'marketer' | 'company'): number {
  const sizeId = getSizeId(size)
  if (!sizeId) return 0
  return PRICING_DATA[level.toUpperCase()]?.[period]?.[sizeId]?.[customerType] || 0
}

export function formatPrice(price: number): string {
  if (price === 0) return '-'
  return price.toLocaleString('ar-LY') + ' د.ل'
}

export function calculateDiscountedPrice(price: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
  if (discountType === 'percentage') return price * (1 - discountValue / 100)
  return Math.max(0, price - discountValue)
}

export function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  if (originalPrice === 0) return 0
  return ((originalPrice - discountedPrice) / originalPrice) * 100
}

function loadDefaultPricing() {
  PRICING_DATA = {
    'A': {
      'monthly': {
        5: { regular: 9722, marketer: 8750, company: 10556 },
        3: { regular: 11722, marketer: 10550, company: 11667 },
        1: { regular: 13333, marketer: 12000, company: 13333 },
        11: { regular: 1700, marketer: 1530, company: 1700 },
        34: { regular: 0, marketer: 10550, company: 11667 },
      },
      'quarterly': {
        5: { regular: 22800, marketer: 21600, company: 24000 },
        3: { regular: 25650, marketer: 24300, company: 27000 },
        1: { regular: 27550, marketer: 26100, company: 29000 },
        34: { regular: 0, marketer: 24300, company: 27000 },
      },
      'semiannual': {
        5: { regular: 29000, marketer: 30600, company: 34000 },
        3: { regular: 35000, marketer: 33300, company: 37000 },
        1: { regular: 36800, marketer: 35100, company: 39000 },
        34: { regular: 0, marketer: 33300, company: 37000 },
      },
      'annual': {
        5: { regular: 51300, marketer: 48600, company: 54000 },
        3: { regular: 60800, marketer: 57600, company: 64000 },
        1: { regular: 65550, marketer: 62100, company: 69000 },
        34: { regular: 1000, marketer: 57600, company: 64000 },
      },
      'daily': {
        5: { regular: 211, marketer: 190, company: 320 },
        3: { regular: 278, marketer: 250, company: 350 },
        1: { regular: 320, marketer: 288, company: 400 },
        34: { regular: 0, marketer: 250, company: 300 },
      },
    },
    'B': {
      'monthly': {
        5: { regular: 8833, marketer: 7950, company: 10556 },
        3: { regular: 11722, marketer: 10550, company: 11667 },
      },
      'quarterly': {
        5: { regular: 19200, marketer: 16800, company: 21600 },
        3: { regular: 21600, marketer: 18900, company: 27000 },
      },
      'annual': {
        5: { regular: 43200, marketer: 37800, company: 48600 },
        3: { regular: 51200, marketer: 45000, company: 57600 },
      },
    },
  }
  pricingLoaded = true
}
