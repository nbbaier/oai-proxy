import { useState, useCallback } from 'react'
import type { ReconcileResponse } from '@/types/api'

const API_BASE = '/api'

export function useReconcile() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<ReconcileResponse | null>(null)

  const reconcile = useCallback(async (date?: string) => {
    try {
      setLoading(true)
      setError(null)

      const url = date
        ? `${API_BASE}/reconcile?date=${date}`
        : `${API_BASE}/reconcile`

      const response = await fetch(url, {
        method: 'POST',
      })

      const responseData = await response.json()

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Reconciliation failed')
      }

      setData(responseData)
      return responseData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return { reconcile, loading, error, data }
}
