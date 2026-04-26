/**
 * دوال التواريخ المشتركة - Date Utilities
 * مرجع واحد لجميع عمليات التواريخ في المشروع
 */

/**
 * تحليل تاريخ الانتهاء من نص (يدعم YYYY-MM-DD و DD/MM/YYYY)
 */
export const parseExpiryDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null

  const trimmed = dateStr.trim()

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number)
    if (y >= 2020 && y < 2100) return new Date(y, m - 1, d)
  }

  // DD/MM/YYYY أو DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[/-]/)
    const day = Number(parts[0])
    const month = Number(parts[1]) - 1
    const year = Number(parts[2])
    if (year >= 2020 && year < 2100) return new Date(year, month, day)
  }

  return null
}

/**
 * حساب الأيام المتبقية حتى تاريخ الانتهاء
 * موجب = لم ينته، سالب = انتهى
 */
export const getDaysRemaining = (expiryDate: string | null): number | null => {
  const parsed = parseExpiryDate(expiryDate)
  if (!parsed || isNaN(parsed.getTime())) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = parsed.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * تنسيق تاريخ الانتهاء للعرض بالعربية
 */
export const formatExpiryDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  const parsed = parseExpiryDate(dateStr)
  if (!parsed || isNaN(parsed.getTime())) return dateStr
  return parsed.toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * تحديد حالة اللوحة بناءً على تاريخ الانتهاء
 */
export const getStatusFromExpiry = (expiryDate: string | null): 'متاح' | 'قريباً' | 'محجوز' => {
  const days = getDaysRemaining(expiryDate)
  if (days === null || days <= 0) return 'متاح'
  if (days <= 20) return 'قريباً'
  return 'محجوز'
}
