/**
 * خدمة الأسعار - Pricing Service
 * تقرأ الأسعار من الصفحة الثانية في ملف Excel الأونلاين
 */

import * as XLSX from 'xlsx'

export interface PriceEntry {
  regular: number      // عادي
  marketer: number     // مسوق
  company: number      // شركات
}

// فترات الإيجار
export const RENTAL_PERIODS = [
  { value: 'monthly', label: 'شهرياً' },
  { value: 'bimonthly', label: 'كل شهرين' },
  { value: 'quarterly', label: 'كل 3 أشهر' },
  { value: 'semiannual', label: 'كل 6 أشهر' },
  { value: 'annual', label: 'سنوي' },
  { value: 'daily', label: 'يومي' },
]

// خريطة تحويل أسماء الفترات من العربية إلى الإنجليزية
const PERIOD_MAP: { [key: string]: string } = {
  'شهرياً': 'monthly',
  'كل شهرين': 'bimonthly',
  'كل 3 أشهر': 'quarterly',
  'كل 6 أشهر': 'semiannual',
  'سنوي': 'annual',
  'يومي': 'daily',
}

// خريطة المقاسات مع size_id
export const SIZE_MAP: { [key: string]: number } = {
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

// جدول الأسعار المحملة من Excel
let PRICING_DATA: { [level: string]: { [period: string]: { [sizeId: number]: PriceEntry } } } = {}
let pricingLoaded = false

/**
 * تحميل الأسعار من ملف Excel
 */
export async function loadPricingFromExcel(): Promise<void> {
  if (pricingLoaded) return
  
  const ONLINE_URL = "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&usp=sharing"
  
  try {
    console.log('[Pricing] تحميل الأسعار من Google Sheets...')
    
    const cacheBuster = Date.now()
    const res = await fetch(`${ONLINE_URL}&cachebuster=${cacheBuster}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    })
    
    if (!res.ok) {
      throw new Error(`فشل تحميل ملف الأسعار: ${res.status}`)
    }
    
    const buffer = await res.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // قراءة الصفحة الثانية (الأسعار)
    const pricesSheetName = workbook.SheetNames[1]
    if (!pricesSheetName) {
      console.warn('[Pricing] لا توجد صفحة ثانية للأسعار، استخدام القيم الافتراضية')
      loadDefaultPricing()
      return
    }
    
    const pricesSheet = workbook.Sheets[pricesSheetName]
    const pricesData = XLSX.utils.sheet_to_json(pricesSheet, { defval: '' })
    
    console.log('[Pricing] أعمدة صفحة الأسعار:', Object.keys(pricesData[0] || {}))
    console.log('[Pricing] عدد صفوف الأسعار:', pricesData.length)
    
    // تحليل بيانات الأسعار
    // الأعمدة المتوقعة: billboard_level, الفترة, size_id, المقاس, عادي, مسوق, شركات
    PRICING_DATA = {}
    
    pricesData.forEach((row: any) => {
      const level = (row['billboard_level'] || row['الفئة'] || 'A').toString().toUpperCase()
      const periodArabic = row['الفترة'] || row['period'] || ''
      const period = PERIOD_MAP[periodArabic] || periodArabic
      const sizeIdRaw = row['size_id'] || row['ID الحجم'] || ''
      const sizeId = parseInt(sizeIdRaw) || getSizeIdFromSize(row['المقاس'] || row['size'] || '')
      
      const regular = parseFloat(row['عادي'] || row['regular'] || 0) || 0
      const marketer = parseFloat(row['مسوق'] || row['marketer'] || 0) || 0
      const company = parseFloat(row['شركات'] || row['company'] || 0) || 0
      
      if (!level || !period || !sizeId) return
      
      if (!PRICING_DATA[level]) {
        PRICING_DATA[level] = {}
      }
      if (!PRICING_DATA[level][period]) {
        PRICING_DATA[level][period] = {}
      }
      
      PRICING_DATA[level][period][sizeId] = { regular, marketer, company }
    })
    
    console.log('[Pricing] تم تحميل الأسعار بنجاح:', Object.keys(PRICING_DATA))
    pricingLoaded = true
    
  } catch (error) {
    console.error('[Pricing] خطأ في تحميل الأسعار:', error)
    console.log('[Pricing] استخدام القيم الافتراضية')
    loadDefaultPricing()
  }
}

/**
 * تحميل الأسعار الافتراضية
 */
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
      'bimonthly': {
        5: { regular: 17500, marketer: 15750, company: 19000 },
        3: { regular: 21100, marketer: 18990, company: 21000 },
        1: { regular: 24000, marketer: 21600, company: 24000 },
        34: { regular: 0, marketer: 18990, company: 21000 },
      },
      'quarterly': {
        5: { regular: 22800, marketer: 21600, company: 24000 },
        3: { regular: 25650, marketer: 24300, company: 27000 },
        1: { regular: 27550, marketer: 26100, company: 29000 },
        13: { regular: 0, marketer: 0, company: 10000 },
        11: { regular: 3135, marketer: 3000, company: 3300 },
        9: { regular: 0, marketer: 4000, company: 6500 },
        7: { regular: 0, marketer: 0, company: 7500 },
        34: { regular: 0, marketer: 24300, company: 27000 },
      },
      'semiannual': {
        5: { regular: 29000, marketer: 30600, company: 34000 },
        3: { regular: 35000, marketer: 33300, company: 37000 },
        1: { regular: 36800, marketer: 35100, company: 39000 },
        13: { regular: 0, marketer: 0, company: 18000 },
        11: { regular: 5700, marketer: 5130, company: 5700 },
        8: { regular: 5700, marketer: 0, company: 0 },
        9: { regular: 7500, marketer: 0, company: 9500 },
        7: { regular: 8400, marketer: 0, company: 11500 },
        34: { regular: 0, marketer: 33300, company: 37000 },
      },
      'annual': {
        5: { regular: 51300, marketer: 48600, company: 54000 },
        3: { regular: 60800, marketer: 57600, company: 64000 },
        1: { regular: 65550, marketer: 62100, company: 69000 },
        13: { regular: 0, marketer: 0, company: 30000 },
        11: { regular: 8250, marketer: 7850, company: 8700 },
        9: { regular: 0, marketer: 0, company: 17500 },
        7: { regular: 15000, marketer: 0, company: 19500 },
        34: { regular: 1000, marketer: 57600, company: 64000 },
      },
      'daily': {
        5: { regular: 211, marketer: 190, company: 320 },
        3: { regular: 278, marketer: 250, company: 350 },
        1: { regular: 320, marketer: 288, company: 400 },
        11: { regular: 36, marketer: 32, company: 37 },
        7: { regular: 0, marketer: 0, company: 90 },
        34: { regular: 0, marketer: 250, company: 300 },
      },
    },
    'B': {
      'monthly': {
        5: { regular: 8833, marketer: 7950, company: 10556 },
        3: { regular: 11722, marketer: 10550, company: 11667 },
        11: { regular: 1000, marketer: 900, company: 1500 },
        9: { regular: 1611, marketer: 1450, company: 2500 },
        7: { regular: 2167, marketer: 1950, company: 3056 },
      },
      'quarterly': {
        5: { regular: 19200, marketer: 16800, company: 21600 },
        3: { regular: 21600, marketer: 18900, company: 27000 },
        13: { regular: 0, marketer: 0, company: 10000 },
        11: { regular: 3300, marketer: 2600, company: 3300 },
        8: { regular: 3300, marketer: 0, company: 3300 },
        9: { regular: 5200, marketer: 4550, company: 6500 },
        7: { regular: 6000, marketer: 5250, company: 7500 },
        34: { regular: 0, marketer: 0, company: 3500 },
      },
      'semiannual': {
        5: { regular: 27200, marketer: 23800, company: 34000 },
        3: { regular: 29600, marketer: 25900, company: 37000 },
        13: { regular: 0, marketer: 0, company: 18000 },
        11: { regular: 5100, marketer: 0, company: 5700 },
        8: { regular: 5100, marketer: 0, company: 5700 },
        9: { regular: 8500, marketer: 7600, company: 9500 },
        7: { regular: 10300, marketer: 8050, company: 11500 },
      },
      'annual': {
        5: { regular: 43200, marketer: 37800, company: 48600 },
        3: { regular: 51200, marketer: 45000, company: 57600 },
        1: { regular: 0, marketer: 0, company: 57000 },
        13: { regular: 0, marketer: 0, company: 30000 },
        11: { regular: 6000, marketer: 5000, company: 8700 },
        8: { regular: 0, marketer: 0, company: 8700 },
        9: { regular: 14000, marketer: 12250, company: 15800 },
        7: { regular: 15600, marketer: 13650, company: 17600 },
        34: { regular: 1000, marketer: 0, company: 0 },
      },
      'daily': {
        5: { regular: 186, marketer: 167, company: 267 },
        3: { regular: 250, marketer: 225, company: 300 },
        9: { regular: 39, marketer: 36, company: 72 },
        7: { regular: 49, marketer: 45, company: 83 },
      },
    },
    'S': {
      'monthly': {
        3: { regular: 0, marketer: 0, company: 80000 },
        1: { regular: 0, marketer: 0, company: 80000 },
        34: { regular: 0, marketer: 0, company: 80000 },
      },
      'quarterly': {
        3: { regular: 0, marketer: 0, company: 30000 },
      },
      'semiannual': {
        3: { regular: 0, marketer: 0, company: 40000 },
      },
      'annual': {
        3: { regular: 0, marketer: 0, company: 80000 },
        34: { regular: 0, marketer: 0, company: 80000 },
      },
      'daily': {
        3: { regular: 0, marketer: 0, company: 222 },
        1: { regular: 50, marketer: 50, company: 50 },
        34: { regular: 0, marketer: 0, company: 222 },
      },
    },
  }
  pricingLoaded = true
}

/**
 * الحصول على size_id من المقاس
 */
function getSizeIdFromSize(size: string): number | null {
  const cleanSize = size.trim().toUpperCase().replace('X', 'x')
  
  for (const [key, id] of Object.entries(SIZE_MAP)) {
    if (key.toUpperCase().replace('X', 'x') === cleanSize) {
      return id
    }
  }
  
  for (const [key, id] of Object.entries(SIZE_MAP)) {
    if (cleanSize.includes(key.toUpperCase().replace('X', 'x')) || 
        key.toUpperCase().replace('X', 'x').includes(cleanSize)) {
      return id
    }
  }
  
  return null
}

/**
 * الحصول على size_id من المقاس
 */
export function getSizeId(size: string): number | null {
  return getSizeIdFromSize(size)
}

/**
 * الحصول على السعر
 */
export function getPrice(
  level: string,
  size: string,
  period: string,
  customerType: 'regular' | 'marketer' | 'company'
): number {
  const sizeId = getSizeId(size)
  if (!sizeId) return 0
  
  const levelData = PRICING_DATA[level.toUpperCase()]
  if (!levelData) return 0
  
  const periodData = levelData[period]
  if (!periodData) return 0
  
  const sizeData = periodData[sizeId]
  if (!sizeData) return 0
  
  return sizeData[customerType] || 0
}

/**
 * تنسيق السعر بالدينار الليبي
 */
export function formatPrice(price: number): string {
  if (price === 0) return '-'
  return price.toLocaleString('ar-LY') + ' د.ل'
}

/**
 * حساب السعر بعد التخفيض
 */
export function calculateDiscountedPrice(
  price: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return price * (1 - discountValue / 100)
  }
  return Math.max(0, price - discountValue)
}

/**
 * حساب نسبة التخفيض
 */
export function calculateDiscountPercentage(originalPrice: number, discountedPrice: number): number {
  if (originalPrice === 0) return 0
  return ((originalPrice - discountedPrice) / originalPrice) * 100
}
