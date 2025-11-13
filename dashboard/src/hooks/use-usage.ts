import { useState, useEffect, useCallback } from 'react'
import type { UsageResponse } from '@/types/api'

const API_BASE = '/api'

export function useUsage(autoRefresh = true, refreshInterval = 10000) {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/usage`)
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }
      const data = await response.json()
      setData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()

    if (autoRefresh) {
      const interval = setInterval(fetchUsage, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchUsage, autoRefresh, refreshInterval])

  return { data, loading, error, refetch: fetchUsage }
}
