import { useState } from 'react'
import { UsageOverview } from '@/components/usage-overview'
import { RequestHistory } from '@/components/request-history'
import { useUsage } from '@/hooks/use-usage'
import { useHistory } from '@/hooks/use-history'
import { useReconcile } from '@/hooks/use-reconcile'
import { formatNumber } from '@/lib/utils'

function App() {
  const { data: usageData, loading: usageLoading, refetch: refetchUsage } = useUsage()
  const {
    data: historyData,
    loading: historyLoading,
    refetch: refetchHistory,
    nextPage,
    prevPage,
    currentPage,
    totalPages,
    canGoNext,
    canGoPrev,
  } = useHistory()

  const { reconcile, loading: isReconciling } = useReconcile()

  const [reconcileStatus, setReconcileStatus] = useState<{
    type: 'loading' | 'success' | 'error'
    message: string
  } | undefined>()

  const handleReconcile = async () => {
    setReconcileStatus({
      type: 'loading',
      message: 'Reconciling with OpenAI...',
    })

    try {
      const result = await reconcile()

      const premiumAdded = result.premium.added
      const miniAdded = result.mini.added
      const totalAdded = premiumAdded + miniAdded

      let message = `✓ Reconciliation complete for ${result.date}`

      if (totalAdded > 0) {
        const parts = []
        if (premiumAdded > 0) {
          parts.push(`Premium +${formatNumber(premiumAdded)} tokens`)
        }
        if (miniAdded > 0) {
          parts.push(`Mini +${formatNumber(miniAdded)} tokens`)
        }
        message += ` - Updated: ${parts.join(', ')}`
      } else {
        message += ' - No discrepancies found, usage already accurate!'
      }

      setReconcileStatus({
        type: 'success',
        message,
      })

      // Refresh usage data
      refetchUsage()

      // Hide success message after 5 seconds
      setTimeout(() => {
        setReconcileStatus(undefined)
      }, 5000)

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setReconcileStatus({
        type: 'error',
        message: `✗ Reconciliation failed: ${message}`,
      })

      // Hide error message after 10 seconds
      setTimeout(() => {
        setReconcileStatus(undefined)
      }, 10000)

      throw error
    }
  }

  const handleRefreshAll = () => {
    refetchUsage()
    refetchHistory()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <header className="mb-8 border-b pb-6 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
            OpenAI Token Tracker
          </h1>
          <p className="text-muted-foreground">
            Monitor your daily token usage across OpenAI models
          </p>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {/* Usage Overview */}
          {usageData && (
            <UsageOverview
              date={usageData.date}
              premium={usageData.premium}
              mini={usageData.mini}
              onReconcile={handleReconcile}
              isReconciling={isReconciling}
              reconcileStatus={reconcileStatus}
            />
          )}

          {usageLoading && !usageData && (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Loading usage data...</p>
            </div>
          )}

          {/* Request History */}
          <RequestHistory
            data={historyData}
            loading={historyLoading}
            onRefresh={handleRefreshAll}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            currentPage={currentPage}
            totalPages={totalPages}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
          />
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>
            Token limits reset daily at midnight (configured timezone).{' '}
            <a
              href="/api/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View API
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
