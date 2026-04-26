import { getSheet } from './sheetLoader'

export interface CitySlide {
  cityName: string
  imageUrl: string
}

export interface ClientLogo {
  logoUrl: string
  companyName: string
}

function convertGoogleDriveUrl(url: string): string {
  if (!url) return url
  if (url.includes('drive.google.com') && !url.includes('lh3.googleusercontent.com')) {
    const fileId = url.match(/id=([a-zA-Z0-9_-]+)/)?.[1] ||
                   url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
                   url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`
  }
  return url
}

export async function loadCitySlides(): Promise<CitySlide[]> {
  try {
    const rows = await getSheet(2)
    const slides = rows
      .map((row: any) => ({
        cityName: (row['اسم العنصر'] || row['اسم المدينة'] || '').toString().trim(),
        imageUrl: convertGoogleDriveUrl((row['الرابط المباشر'] || row['رابط الصورة'] || '').toString().trim()),
        order: parseInt(row['ترقيم'] || row['الترتيب'] || '999', 10) || 999,
      }))
      .filter((s: any) => s.cityName && s.imageUrl)
      .sort((a: any, b: any) => a.order - b.order)
      .map(({ cityName, imageUrl }: any) => ({ cityName, imageUrl }))

    console.log('[MediaService] تم تحميل', slides.length, 'صورة')
    return slides
  } catch (error) {
    console.error('[MediaService] خطأ في تحميل السلايدر:', error)
    return []
  }
}

export async function loadClientLogos(): Promise<ClientLogo[]> {
  try {
    const rows = await getSheet(3)
    const logos = rows
      .map((row: any) => ({
        logoUrl: convertGoogleDriveUrl((row['الرابط المباشر'] || row['رابط شعار الشركة'] || '').toString().trim()),
        companyName: (row['اسم العنصر'] || row['اسم الشركة'] || '').toString().trim(),
        order: parseInt(row['ترقيم'] || row['الترتيب'] || '999', 10) || 999,
      }))
      .filter((l: any) => l.logoUrl)
      .sort((a: any, b: any) => a.order - b.order)
      .map(({ logoUrl, companyName }: any) => ({ logoUrl, companyName }))

    console.log('[MediaService] تم تحميل', logos.length, 'شعار')
    return logos
  } catch (error) {
    console.error('[MediaService] خطأ في تحميل الشعارات:', error)
    return []
  }
}
