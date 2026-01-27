import * as XLSX from 'xlsx'
import { Billboard } from '@/types'

const ONLINE_URL =
  "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&gid=0&usp=sharing"
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=csv&gid=0&usp=sharing"

const pad2 = (n: number) => String(n).padStart(2, "0")

const formatYmd = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

const normalizeHeader = (s: string) => s.replace(/\s+/g, " ").trim()

const getRowValue = (row: any, candidates: string[]) => {
  for (const key of candidates) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key]
  }
  const rowKeys = Object.keys(row || {})
  for (const key of candidates) {
    const match = rowKeys.find((k) => normalizeHeader(k) === normalizeHeader(key))
    if (match) return row[match]
  }
  return ""
}

const parseDateValue = (raw: any): Date | null => {
  if (raw === null || raw === undefined) return null
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw

  const str = raw.toString().trim()
  if (!str) return null

  // Excel serial date
  const serialDate = parseFloat(str)
  if (!isNaN(serialDate) && serialDate > 30000 && serialDate < 60000) {
    const unixDays = serialDate - 25569
    return new Date(unixDays * 86400 * 1000)
  }

  // ISO: YYYY-MM-DD (مثل 2026-02-18)
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split("-").map((x) => parseInt(x))
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 2000 && y < 2100) {
      return new Date(y, m - 1, d)
    }
  }

  // DD/MM/YYYY أو DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(str)) {
    const parts = str.split(/[/-]/)
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000 && year < 2100) {
      return new Date(year, month, day)
    }
  }

  return null
}
async function testUrlAccess(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" })
    console.log(`[Service] اختبار الوصول للرابط: ${response.status} ${response.statusText}`)
    return response.ok
  } catch (error: any) {
    console.log(`[Service] فشل اختبار الوصول للرابط: ${error.message}`)
    return false
  }
}

async function readCsvFromUrl(url: string, timeoutMs = 10000) {
  try {
    console.log(`[Service] محاولة تحميل ملف CSV من الرابط: ${url}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const cacheBuster = Date.now()
    const urlWithCacheBuster = `${url}&cachebuster=${cacheBuster}`

    const res = await fetch(urlWithCacheBuster, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })
    clearTimeout(timeout)

    console.log(`[Service] استجابة CSV: ${res.status} ${res.statusText}`)
    console.log(`[Service] الرابط النهائي بعد التوجيه: ${res.url}`)

    if (res.status === 307 || res.status === 308) {
      const location = res.headers.get("location")
      console.log(`[Service] تم توجيه الطلب إلى: ${location}`)
      if (location) {
        return await readCsvFromUrl(location, timeoutMs)
      }
    }

    if (!res.ok) {
      throw new Error(`فشل تحميل ملف CSV: ${res.status} ${res.statusText}`)
    }

    const csvText = await res.text()
    console.log(`[Service] تم تحميل ${csvText.length} حرف من ملف CSV`)

    if (csvText.length === 0) {
      throw new Error("ملف CSV فارغ")
    }

    const workbook = XLSX.read(csvText, { type: "string" })
    return workbook
  } catch (error: any) {
    console.error(`[Service] خطأ في قراءة CSV: ${error.message}`)
    throw error
  }
}

async function readExcelFromUrl(url: string, timeoutMs = 10000, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Service] محاولة ${attempt} من ${retries} لتحميل الملف من الرابط...`)

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const cacheBuster = Date.now()
      const urlWithCacheBuster = `${url}&cachebuster=${cacheBuster}`

      console.log(`[Service] الرابط المستخدم: ${urlWithCacheBuster}`)

      const res = await fetch(urlWithCacheBuster, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
      clearTimeout(timeout)

      console.log(`[Service] استجابة الخادم: ${res.status} ${res.statusText}`)
      console.log(`[Service] الرابط النهائي بعد التوجيه: ${res.url}`)
      console.log(`[Service] نوع المحتوى: ${res.headers.get("content-type")}`)
      console.log(`[Service] حجم المحتوى: ${res.headers.get("content-length")}`)

      if (res.status === 307 || res.status === 308) {
        const location = res.headers.get("location")
        console.log(`[Service] تم توجيه الطلب إلى: ${location}`)
        if (location) {
          return await readExcelFromUrl(location, timeoutMs, retries)
        }
      }

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(`الملف غير متاح للوصول العام. تأكد من أن الملف مشارك للعامة. كود الخطأ: ${res.status}`)
        } else if (res.status === 404) {
          throw new Error(`الملف غير موجود. تأكد من صحة رابط Google Sheets. كود الخطأ: ${res.status}`)
        } else if (res.status === 429) {
          throw new Error(`تم تجاوز حد الطلبات. حاول مرة أخرى لاحقاً. كود الخطأ: ${res.status}`)
        } else {
          throw new Error(`فشل تحميل ملف الإكسل من الرابط: ${res.status} ${res.statusText}`)
        }
      }

      const buffer = await res.arrayBuffer()
      console.log(`[Service] تم تحميل ${buffer.byteLength} بايت من الرابط`)

      if (buffer.byteLength === 0) {
        throw new Error("الملف المحمل فارغ")
      }

      const uint8Array = new Uint8Array(buffer)
      const isExcel = uint8Array[0] === 0x50 && uint8Array[1] === 0x4b // ZIP signature (Excel files are ZIP-based)
      const isOldExcel = uint8Array[0] === 0xd0 && uint8Array[1] === 0xcf // OLE signature (old Excel format)

      if (!isExcel && !isOldExcel) {
        console.log(
          `[Service] تحذير: الملف المحمل قد لا يكون ملف إكسل صحيح. البايتات الأولى: ${Array.from(uint8Array.slice(0, 10))
            .map((b) => b.toString(16))
            .join(" ")}`,
        )
      }

      return buffer
    } catch (error: any) {
      console.warn(`[Service] فشلت المحاولة ${attempt}:`, error.message)

      if (attempt === retries) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw new Error("فشل في جميع المحاولات")
}

function safeReadExcel(fileBuffer: ArrayBuffer) {
  const readOptions = [
    { type: "array" as const, codepage: 65001 },
    { type: "array" as const, codepage: 1256 },
    { type: "array" as const, raw: true },
    { type: "array" as const, cellDates: true, dateNF: "yyyy-mm-dd" },
    { type: "array" as const, bookVBA: false, bookSheets: true },
  ]

  for (const options of readOptions) {
    try {
      console.log("[Service] محاولة قراءة الملف بخيارات:", JSON.stringify(options))
      const workbook = XLSX.read(fileBuffer, options)
      console.log("[Service] نجحت قراءة الملف بالخيارات:", JSON.stringify(options))
      return workbook
    } catch (error: any) {
      console.warn("[Service] فشل بالخيارات:", JSON.stringify(options), "الخطأ:", error.message)
      continue
    }
  }

  throw new Error("فشل في قراءة ملف الإكسل بجميع الخيارات المتاحة")
}

export async function loadBillboardsFromExcel(): Promise<Billboard[]> {
  try {
    console.log('[Service] تحميل بيانات اللوحات من Google Sheets...')
    
    let workbook: XLSX.WorkBook

    console.log(`[Service] التحقق من صحة الرابط: ${ONLINE_URL}`)

    const isUrlAccessible = await testUrlAccess(ONLINE_URL)
    console.log(`[Service] هل الرابط متاح؟ ${isUrlAccessible}`)

    try {
      console.log("[Service] محاولة قراءة البيانات بصيغة CSV...")
      workbook = await readCsvFromUrl(CSV_URL, 15000)
      console.log("[Service] تم تحميل البيانات بصيغة CSV بنجاح ✅")
    } catch (csvError: any) {
      console.warn("[Service] فشل تحميل CSV:", csvError.message)

      const alternativeUrls = [
        ONLINE_URL,
        ONLINE_URL.replace("&gid=0", ""),
        ONLINE_URL.replace("export?format=xlsx", "export?format=xlsx&exportFormat=xlsx"),
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx&id=1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0&usp=sharing",
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/gviz/tq?tqx=out:csv&sheet=Sheet1&usp=sharing",
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=xlsx",
        "https://docs.google.com/spreadsheets/d/1fF9BUgBcW9OW3nWT97Uke_z2Pq3y_LC0/export?format=csv",
      ]

      let fileBuffer: ArrayBuffer | null = null
      let lastError: Error | null = null

      for (const url of alternativeUrls) {
        try {
          console.log(`[Service] محاولة قراءة ملف الإكسل من الرابط: ${url}`)
          fileBuffer = await readExcelFromUrl(url, 15000, 2)
          console.log("[Service] تم تحميل ملف الإكسل من الرابط بنجاح ✅")
          break
        } catch (err: any) {
          console.warn(`[Service] فشل قراءة الملف من الرابط ${url}:`, err.message)
          lastError = err
          continue
        }
      }

      if (!fileBuffer) {
        console.log("[Service] محاولة قراءة ملف الإكسل من الملف المحلي...")
        try {
          const response = await fetch('/billboards.xlsx')
          
          if (!response.ok) {
            throw new Error('فشل في تحميل ملف Excel المحلي')
          }
          
          fileBuffer = await response.arrayBuffer()
          console.log("[Service] تم تحميل ملف الإكسل المحلي ✅")
        } catch (localError: any) {
          console.error("[Service] فشل في قراءة الملف المحلي أيضاً:", localError.message)
          throw new Error(
            `فشل في قراءة الملف من الرابط والملف المحلي. آخر خطأ من الرابط: ${lastError?.message}. خطأ الملف المحلي: ${localError.message}`,
          )
        }
      }

      if (!fileBuffer || fileBuffer.byteLength === 0) {
        throw new Error("ملف الإكسل فارغ أو تالف")
      }

      console.log("[Service] حجم الملف:", fileBuffer.byteLength, "بايت")
      workbook = safeReadExcel(fileBuffer)
    }

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new Error("لا توجد أوراق في ملف الإكسل")
    }

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      throw new Error("لا يمكن قراءة الورقة الأولى من ملف الإكسل")
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" })
    if (jsonData.length === 0) {
      throw new Error("ملف الإكسل فارغ")
    }

    console.log("[Service] أعمدة الملف المتاحة:", Object.keys(jsonData[0] || {}))

    // فلترة اللوحات المتاحة فقط (بدون رقم عقد)
    const billboards = jsonData
      .filter((billboard: any) => {
        const contractNumber = billboard['رقم العقد']
        return !contractNumber || contractNumber === '#N/A'
      })
      .map((billboard: any, index: number) => {
        const id = billboard['ر.م'] || billboard['رقم اللوحة'] || `BILLBOARD-${index + 1}`
        const name = billboard['اسم لوحة'] || billboard['اسم اللوحة'] || `لوحة-${index + 1}`
        const location = billboard['اقرب نقطة دالة'] || billboard['أقرب نقطة دالة'] || 'موقع غير محدد'
        const municipality = billboard['البلدية'] || 'غير محدد'
        const city = billboard['مدينة'] || billboard['المدينة'] || 'غير محدد'
        const area = billboard['منطقة'] || billboard['المنطقة'] || municipality
        const size = billboard['حجم'] || billboard['الحجم'] || billboard['المقاس مع الدغاية'] || '12X4'
        const coordinates = billboard['احداثي - GPS'] || billboard['الإحداثيات GPS'] || '32.8872,13.1913'
        
        let imageUrl = billboard['image_url'] || billboard['@IMAGE'] || '/roadside-billboard.png'
        if (imageUrl.includes('drive.google.com')) {
          const fileId = imageUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || 
                         imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
          if (fileId) {
            imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
          }
        }

        // قراءة تاريخ انتهاء الإيجار
        const expiryDateRaw = getRowValue(billboard, [
          'تاريخ انتهاء الإيجار',
          'تاريخ الانتهاء',
          'تاريخ انتهاء العقد',
        ])

        let status = 'متاح'
        let expiryDate: string | null = null

        const parsedDate = parseDateValue(expiryDateRaw)
        if (parsedDate) {
          // نخزّن التاريخ كسلسلة YYYY-MM-DD بدون تحويل UTC لتفادي فرق التوقيت
          expiryDate = formatYmd(parsedDate)

          const today = new Date()
          today.setHours(0, 0, 0, 0)

          // تطبيع التاريخ لمنتصف الليل محلياً قبل الحساب
          const normalizedParsed = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
          const diffTime = normalizedParsed.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays <= 0) {
            status = "متاح"
          } else if (diffDays <= 20) {
            status = "قريباً"
          } else {
            status = "محجوز"
          }
        }
        
        const coords = coordinates.toString().split(',').map((c: string) => c.trim())
        const gpsLink = coords.length >= 2 
          ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
          : 'https://www.google.com/maps?q=32.8872,13.1913'
        
        const billboardType = billboard['نوع اللوحة'] || billboard['نوع'] || ''
        const facesCount = billboard['عدد الاوجه'] || billboard['عدد الأوجه'] || billboard['الاوجه'] || ''
        
        return {
          id: id.toString(),
          name: name.toString(),
          location: location.toString(),
          municipality: municipality.toString(),
          city: city.toString(),
          area: area.toString(),
          size: size.toString(),
          level: billboard['الفئة'] || billboard['مستوى'] || billboard['level'] || 'A',
          status: status.toString(),
          expiryDate: expiryDate,
          coordinates: coordinates.toString(),
          imageUrl,
          gpsLink,
          billboardType: billboardType.toString(),
          facesCount: facesCount.toString(),
          landmark: location.toString(),  // أقرب نقطة دالة هي نفسها الموقع
        }
      })
    
    console.log('[Service] تم تحميل', billboards.length, 'لوحة متاحة من Google Sheets')
    return billboards
  } catch (error) {
    console.error('[Service] خطأ في تحميل ملف Excel من Google Sheets:', error)
    
    // محاولة تحميل الملف المحلي كبديل
    try {
      console.log('[Service] محاولة تحميل الملف المحلي كبديل...')
      const response = await fetch('/billboards.xlsx')
      
      if (!response.ok) {
        throw new Error('فشل في تحميل ملف Excel المحلي')
      }
      
      const buffer = await response.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        throw new Error('لا توجد أوراق في ملف Excel المحلي')
      }
      
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      
      if (jsonData.length === 0) {
        throw new Error('ملف Excel المحلي فارغ')
      }
      
      // معالجة البيانات المحلية بنفس الطريقة
      const billboards = jsonData
        .filter((billboard: any) => {
          const contractNumber = billboard['رقم العقد']
          return !contractNumber || contractNumber === '#N/A'
        })
        .map((billboard: any, index: number) => {
          const id = billboard['ر.م'] || `BILLBOARD-${index + 1}`
          const name = billboard['اسم لوحة'] || `لوحة-${index + 1}`
          const location = billboard['اقرب نقطة دالة'] || 'موقع غير محدد'
          const municipality = billboard['البلدية'] || 'غير محدد'
          const city = billboard['مدينة'] || 'غير محدد'
          const area = billboard['منطقة'] || municipality
          const size = billboard['حجم'] || '12X4'
          const coordinates = billboard['احداثي - GPS'] || '32.8872,13.1913'
          
          let imageUrl = billboard['image_url'] || '/roadside-billboard.png'
          if (imageUrl.includes('drive.google.com')) {
            const fileId = imageUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] || 
                           imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
            if (fileId) {
              imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
            }
          }
          
          const coords = coordinates.toString().split(',').map((c: string) => c.trim())
          const gpsLink = coords.length >= 2 
            ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
            : 'https://www.google.com/maps?q=32.8872,13.1913'
          
          // قراءة تاريخ انتهاء الإيجار + حساب الحالة
          const expiryDateRaw = getRowValue(billboard, [
            'تاريخ انتهاء الإيجار',
            'تاريخ الانتهاء',
            'تاريخ انتهاء العقد',
          ])

          let status = 'متاح'
          let expiryDate: string | null = null

          const parsedDate = parseDateValue(expiryDateRaw)
          if (parsedDate) {
            expiryDate = formatYmd(parsedDate)

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const normalizedParsed = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())
            const diffTime = normalizedParsed.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays <= 0) {
              status = "متاح"
            } else if (diffDays <= 20) {
              status = "قريباً"
            } else {
              status = "محجوز"
            }
          }

          const billboardType = billboard['نوع اللوحة'] || billboard['نوع'] || ''
          const facesCount = billboard['عدد الاوجه'] || billboard['عدد الأوجه'] || ''
          
          return {
            id: id.toString(),
            name: name.toString(),
            location: location.toString(),
            municipality: municipality.toString(),
            city: city.toString(),
            area: area.toString(),
            size: size.toString(),
            level: billboard['الفئة'] || billboard['مستوى'] || billboard['level'] || 'A',
            status: status.toString(),
            expiryDate: expiryDate,
            coordinates: coordinates.toString(),
            imageUrl,
            gpsLink,
            billboardType: billboardType.toString(),
            facesCount: facesCount.toString(),
            landmark: location.toString(),  // أقرب نقطة دالة هي نفسها الموقع
          }
        })
      
      console.log('[Service] تم تحميل', billboards.length, 'لوحة من الملف المحلي')
      return billboards
    } catch (localError) {
      console.error('[Service] فشل في تحميل الملف المحلي أيضاً:', localError)
      
      // بيانات احتياطية
      const today = new Date()
      const in5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000)
      const in10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)

      return [
        {
          id: "132",
          name: "KH-SK0132",
          location: "الجزيرة الجديدة مدخل شارع 20",
          municipality: "الخمس",
          city: "الخمس",
          area: "الخمس",
          size: "12X4",
          level: "B",
          status: "قريباً",
          expiryDate: in5Days.toISOString().split('T')[0],
          coordinates: "32.639466,14.265113",
          imageUrl: "https://lh3.googleusercontent.com/d/1IXWjRnWIqrRnsCIR1UEdsrWqqNeDW8eL",
          gpsLink: "https://www.google.com/maps?q=32.639466,14.265113",
          billboardType: "عادي",
          facesCount: "1",
        },
        {
          id: "943",
          name: "TR-TG0943",
          location: "امام كلية الهندسة العسكرية باتجاه الشرق",
          municipality: "تاجوراء",
          city: "طرابلس",
          area: "طرابلس",
          size: "12X4",
          level: "A",
          status: "قريباً",
          expiryDate: in10Days.toISOString().split('T')[0],
          coordinates: "32.77941062678118,13.202820303855821",
          imageUrl: "https://lh3.googleusercontent.com/d/1y3u807ziWfFgaYpsUlA3Rufmu7vyzY7u",
          gpsLink: "https://www.google.com/maps?q=32.77941062678118,13.202820303855821",
          billboardType: "عادي",
          facesCount: "2",
        },
        {
          id: "134",
          name: "KH-SK0134",
          location: "بجوار كوبري سوق الخميس باتجاه الشرق",
          municipality: "الخمس",
          city: "الخمس",
          area: "الخمس",
          size: "12X4",
          level: "B",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.566533,14.344944",
          imageUrl: "https://lh3.googleusercontent.com/d/1J1D2ZEhnQZbRuSKxNVE4XTifkhvHabYs",
          gpsLink: "https://www.google.com/maps?q=32.566533,14.344944",
          billboardType: "عادي",
          facesCount: "1",
        },
        {
          id: "917",
          name: "TR-JZ0917",
          location: "بعد مخرج السراج بـ800 متر",
          municipality: "جنزور",
          city: "طرابلس",
          area: "طرابلس",
          size: "12x4",
          level: "A",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.838179,13.071658",
          imageUrl: "/roadside-billboard.png",
          gpsLink: "https://www.google.com/maps?q=32.838179,13.071658",
          billboardType: "عادي",
          facesCount: "2",
        },
        {
          id: "130",
          name: "KH-SK0130",
          location: "بجوار جسر سوق الخميس باتجاه الغرب",
          municipality: "الخمس",
          city: "الخمس",
          area: "الخمس",
          size: "12X4",
          level: "B",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.566533,14.344944",
          imageUrl: "https://lh3.googleusercontent.com/d/1iHHF-cuvAvgs0-gpW65zkxFrLU2qV7bE",
          gpsLink: "https://www.google.com/maps?q=32.566533,14.344944",
          billboardType: "عادي",
          facesCount: "1",
        },
        {
          id: "140",
          name: "ZL-ZL0140",
          location: "مدخل المدينة الغربي بجوار كمرة كعام باتجاه الشرق",
          municipality: "زليتن",
          city: "زليتن",
          area: "زليتن",
          size: "12X4",
          level: "B",
          status: "متاح",
          expiryDate: null,
          coordinates: "32.498982,14.446801",
          imageUrl: "https://lh3.googleusercontent.com/d/1_js8MPBTvM_ymwPNm1oedZfjtDuMPIfj",
          gpsLink: "https://www.google.com/maps?q=32.498982,14.446801",
          billboardType: "عادي",
          facesCount: "1",
        },
      ]
    }
  }
}