import { useState, useEffect, useCallback } from 'react'
import type { HistoryResponse } from '@/types/api'

const API_BASE = '/api'

export function useHistory(limit = 20, offset = 0) {
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentOffset, setCurrentOffset] = useState(offset)

  const fetchHistory = useCallback(async (newOffset?: number) => {
    const offsetToUse = newOffset !== undefined ? newOffset : currentOffset
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/history?limit=${limit}&offset=${offsetToUse}`)
      if (!response.ok) {
        throw new Error('Failed to fetch history data')
      }
      const data = await response.json()
      setData(data)
      setError(null)
      if (newOffset !== undefined) {
        setCurrentOffset(newOffset)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [limit, currentOffset])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const nextPage = useCallback(() => {
    if (data?.pagination.hasMore) {
      const newOffset = currentOffset + limit
      setCurrentOffset(newOffset)
      fetchHistory(newOffset)
    }
  }, [data?.pagination.hasMore, currentOffset, limit, fetchHistory])

  const prevPage = useCallback(() => {
    if (currentOffset > 0) {
      const newOffset = Math.max(0, currentOffset - limit)
      setCurrentOffset(newOffset)
      fetchHistory(newOffset)
    }
  }, [currentOffset, limit, fetchHistory])

  const currentPage = Math.floor(currentOffset / limit) + 1
  const totalPages = data ? Math.ceil(data.pagination.total / limit) : 1

  return {
    data,
    loading,
    error,
    refetch: fetchHistory,
    nextPage,
    prevPage,
    currentPage,
    totalPages,
    canGoNext: data?.pagination.hasMore ?? false,
    canGoPrev: currentOffset > 0,
  }
}
