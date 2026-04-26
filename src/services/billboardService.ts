import { getSheet } from './sheetLoader'
import { Billboard } from '@/types'
import { parseExpiryDate } from '@/utils/dateUtils'

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

function getStatusFromDate(expiryDate: string | null): 'متاح' | 'قريباً' | 'محجوز' {
  if (!expiryDate) return 'متاح'
  const parsed = parseExpiryDate(expiryDate)
  if (!parsed) return 'متاح'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.ceil((parsed.getTime() - today.getTime()) / 86400000)
  if (days <= 0) return 'متاح'
  if (days <= 20) return 'قريباً'
  return 'محجوز'
}

function parseDateValue(raw: any): Date | null {
  if (!raw) return null
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw
  const str = raw.toString().trim()
  if (!str) return null

  const serial = parseFloat(str)
  if (!isNaN(serial) && serial > 30000 && serial < 60000) {
    return new Date((serial - 25569) * 86400 * 1000)
  }

  const parsed = parseExpiryDate(str)
  return parsed
}

export async function loadBillboardsFromExcel(): Promise<Billboard[]> {
  try {
    console.log('[BillboardService] تحميل البيانات...')
    const jsonData = await getSheet(0)
    if (jsonData.length === 0) throw new Error('لا توجد بيانات')

    console.log('[BillboardService] أعمدة:', Object.keys(jsonData[0] || {}))

    const billboards: Billboard[] = jsonData
      .filter((row: any) => {
        const contract = row['رقم العقد']
        return !contract || contract === '#N/A'
      })
      .map((row: any, index: number) => {
        const id = (row['ر.م'] || row['رقم اللوحة'] || `BB-${index + 1}`).toString().trim()
        const name = (row['اسم لوحة'] || row['اسم اللوحة'] || `لوحة-${index + 1}`).toString().trim()
        const location = (row['اقرب نقطة دالة'] || row['أقرب نقطة دالة'] || 'موقع غير محدد').toString().trim()
        const municipality = (row['البلدية'] || 'غير محدد').toString().trim()
        const city = (row['مدينة'] || row['المدينة'] || 'غير محدد').toString().trim()
        const area = (row['منطقة'] || row['المنطقة'] || municipality).toString().trim()
        const size = (row['حجم'] || row['الحجم'] || row['المقاس مع الدغاية'] || '12X4').toString().trim()
        const coordinates = row['احداثي - GPS'] || row['الإحداثيات GPS'] || '32.8872,13.1913'

        let imageUrl = row['image_url'] || row['@IMAGE'] || '/roadside-billboard.png'
        if (imageUrl.includes('drive.google.com')) {
          const fileId = imageUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] ||
                         imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
          if (fileId) imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
        }

        const expiryRaw = row['تاريخ انتهاء الإيجار'] || row['تاريخ الانتهاء'] || row['تاريخ انتهاء العقد'] || ''
        const parsedDate = parseDateValue(expiryRaw)
        const expiryDate = parsedDate ? formatYmd(parsedDate) : null
        const status = getStatusFromDate(expiryDate)

        const coords = coordinates.toString().split(',').map((c: string) => c.trim())
        const gpsLink = coords.length >= 2
          ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
          : 'https://www.google.com/maps?q=32.8872,13.1913'

        return {
          id: id.toString(),
          name: name.toString(),
          location: location.toString(),
          municipality: municipality.toString(),
          city: city.toString(),
          area: area.toString(),
          size: size.toString(),
          level: (row['الفئة'] || row['مستوى'] || row['level'] || 'A').toString(),
          status,
          expiryDate,
          coordinates: coordinates.toString(),
          imageUrl: imageUrl.toString(),
          gpsLink,
          billboardType: (row['نوع اللوحة'] || row['نوع'] || '').toString().trim(),
          facesCount: (row['عدد الاوجه'] || row['عدد الأوجه'] || row['الاوجه'] || '').toString().trim(),
          landmark: location.toString(),
        }
      })

    console.log('[BillboardService] تم تحميل', billboards.length, 'لوحة')
    return billboards
  } catch (error) {
    console.error('[BillboardService] خطأ:', error)
    throw error
  }
}
