import * as XLSX from 'xlsx'

const ONLINE_URL =
  "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&usp=sharing"

export interface CitySlide {
  cityName: string
  imageUrl: string
}

export interface ClientLogo {
  logoUrl: string
  companyName: string
}

async function loadWorkbook(): Promise<XLSX.WorkBook> {
  try {
    console.log('[MediaService] محاولة تحميل ملف الإكسل...')
    
    const cacheBuster = Date.now()
    const urlWithCacheBuster = `${ONLINE_URL}&cachebuster=${cacheBuster}`
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    
    const res = await fetch(urlWithCacheBuster, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })
    clearTimeout(timeout)
    
    if (!res.ok) {
      throw new Error(`فشل تحميل الملف: ${res.status}`)
    }
    
    const buffer = await res.arrayBuffer()
    console.log('[MediaService] تم تحميل الملف:', buffer.byteLength, 'بايت')
    
    return XLSX.read(buffer, { type: 'array' })
  } catch (error: any) {
    console.warn('[MediaService] فشل تحميل الملف من الإنترنت:', error.message)
    
    // محاولة تحميل الملف المحلي
    console.log('[MediaService] محاولة تحميل الملف المحلي...')
    const response = await fetch('/billboards.xlsx')
    
    if (!response.ok) {
      throw new Error('فشل في تحميل الملف المحلي')
    }
    
    const buffer = await response.arrayBuffer()
    return XLSX.read(buffer, { type: 'array' })
  }
}

/**
 * تحميل صور السلايدر من الصفحة الثالثة
 * الأعمدة: "الرابط المباشر" و "اسم العنصر" و "ترقيم"
 */
export async function loadCitySlides(): Promise<CitySlide[]> {
  try {
    const workbook = await loadWorkbook()
    
    // الصفحة الثالثة (index 2)
    const sheetName = workbook.SheetNames[2]
    if (!sheetName) {
      console.warn('[MediaService] الصفحة الثالثة غير موجودة')
      return []
    }
    
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    
    console.log('[MediaService] صفحة السلايدر:', sheetName)
    console.log('[MediaService] أعمدة الصفحة:', Object.keys(jsonData[0] || {}))
    
    const slides: { cityName: string; imageUrl: string; order: number }[] = []
    
    for (const row of jsonData as any[]) {
      const cityName = row['اسم العنصر'] || row['اسم المدينة'] || row['المدينة'] || ''
      let imageUrl = row['الرابط المباشر'] || row['رابط الصورة'] || row['الصورة'] || ''
      const order = parseInt(row['ترقيم'] || row['الترتيب'] || '999', 10) || 999
      
      if (!cityName || !imageUrl) continue
      
      // تحويل روابط Google Drive
      if (imageUrl.includes('drive.google.com') || imageUrl.includes('lh3.googleusercontent.com')) {
        if (!imageUrl.includes('lh3.googleusercontent.com')) {
          const fileId = imageUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || 
                         imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
                         imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
          if (fileId) {
            imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`
          }
        }
      }
      
      slides.push({
        cityName: cityName.toString().trim(),
        imageUrl: imageUrl.toString().trim(),
        order
      })
    }
    
    // ترتيب حسب عمود "ترقيم"
    slides.sort((a, b) => a.order - b.order)
    
    console.log('[MediaService] تم تحميل', slides.length, 'صورة للسلايدر (مرتبة)')
    return slides.map(({ cityName, imageUrl }) => ({ cityName, imageUrl }))
  } catch (error) {
    console.error('[MediaService] خطأ في تحميل صور السلايدر:', error)
    return []
  }
}

/**
 * تحميل شعارات العملاء من الصفحة الرابعة
 * الأعمدة: "الرابط المباشر" و "اسم العنصر" و "ترقيم"
 */
export async function loadClientLogos(): Promise<ClientLogo[]> {
  try {
    const workbook = await loadWorkbook()
    
    // الصفحة الرابعة (index 3)
    const sheetName = workbook.SheetNames[3]
    if (!sheetName) {
      console.warn('[MediaService] الصفحة الرابعة غير موجودة')
      return []
    }
    
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    
    console.log('[MediaService] صفحة الشعارات:', sheetName)
    console.log('[MediaService] أعمدة الصفحة:', Object.keys(jsonData[0] || {}))
    
    const logos: { logoUrl: string; companyName: string; order: number }[] = []
    
    for (const row of jsonData as any[]) {
      let logoUrl = row['الرابط المباشر'] || row['رابط شعار الشركة'] || row['الشعار'] || ''
      const companyName = row['اسم العنصر'] || row['اسم الشركة'] || row['الشركة'] || ''
      const order = parseInt(row['ترقيم'] || row['الترتيب'] || '999', 10) || 999
      
      if (!logoUrl) continue
      
      // تحويل روابط Google Drive
      if (logoUrl.includes('drive.google.com') || logoUrl.includes('lh3.googleusercontent.com')) {
        if (!logoUrl.includes('lh3.googleusercontent.com')) {
          const fileId = logoUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || 
                         logoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
                         logoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
          if (fileId) {
            logoUrl = `https://lh3.googleusercontent.com/d/${fileId}`
          }
        }
      }
      
      logos.push({
        logoUrl: logoUrl.toString().trim(),
        companyName: companyName.toString().trim(),
        order
      })
    }
    
    // ترتيب حسب عمود "ترقيم"
    logos.sort((a, b) => a.order - b.order)
    
    console.log('[MediaService] تم تحميل', logos.length, 'شعار للعملاء (مرتبة)')
    return logos.map(({ logoUrl, companyName }) => ({ logoUrl, companyName }))
  } catch (error) {
    console.error('[MediaService] خطأ في تحميل شعارات العملاء:', error)
    return []
  }
}
