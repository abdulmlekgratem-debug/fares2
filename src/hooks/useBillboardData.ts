/**
 * Hook لتحميل بيانات اللوحات الإعلانية
 * يتولى جلب البيانات والتعامل مع حالات التحميل والخطأ
 */

import { useState, useEffect } from "react"
import { Billboard } from "@/types"
import { loadBillboardsFromExcel } from "@/services/billboardService"
import { loadPricingFromExcel } from "@/services/pricingService"

interface UseBillboardDataReturn {
  billboards: Billboard[]
  loading: boolean
  loadError: boolean
  reload: () => void
}

export function useBillboardData(): UseBillboardDataReturn {
  const [billboards, setBillboards] = useState<Billboard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const loadWithTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
      const timeoutPromise = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
      try {
        return await Promise.race([promise, timeoutPromise])
      } catch {
        console.warn('[useBillboardData] timeout or error, using fallback')
        return fallback
      }
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setLoadError(false)

        const [data] = await Promise.all([
          loadWithTimeout(loadBillboardsFromExcel(), 20000, []),
          loadWithTimeout(loadPricingFromExcel(), 15000, undefined),
        ])

        if (data.length > 0) {
          setBillboards(data)
        } else {
          setLoadError(true)
        }
      } catch (error) {
        console.error('[useBillboardData] خطأ في التحميل:', error)
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(loadData, 100)
    return () => clearTimeout(timer)
  }, [reloadKey])

  const reload = () => setReloadKey(k => k + 1)

  return { billboards, loading, loadError, reload }
}
