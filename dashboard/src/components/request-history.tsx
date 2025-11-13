import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber, formatTimestamp } from '@/lib/utils'
import type { RequestHistoryEntry, HistoryResponse } from '@/types/api'

interface RequestHistoryProps {
  data: HistoryResponse | null
  loading: boolean
  onRefresh: () => void
  onNextPage: () => void
  onPrevPage: () => void
  currentPage: number
  totalPages: number
  canGoNext: boolean
  canGoPrev: boolean
}

function StatusBadge({ status }: { status: number }) {
  const isSuccess = status >= 200 && status < 300
  return (
    <Badge variant={isSuccess ? 'success' : 'destructive'}>
      {status}
    </Badge>
  )
}

function TierBadge({ tier }: { tier: 'premium' | 'mini' }) {
  return (
    <Badge variant={tier === 'premium' ? 'default' : 'secondary'}>
      {tier.toUpperCase()}
    </Badge>
  )
}

export function RequestHistory({
  data,
  loading,
  onRefresh,
  onNextPage,
  onPrevPage,
  currentPage,
  totalPages,
  canGoNext,
  canGoPrev,
}: RequestHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Request History</CardTitle>
          <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Prompt</TableHead>
                <TableHead className="text-right">Completion</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}

              {!loading && data && data.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No requests yet
                  </TableCell>
                </TableRow>
              )}

              {data?.data.map((entry: RequestHistoryEntry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatTimestamp(entry.timestamp)}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {entry.model}
                    </code>
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={entry.tier} />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(entry.prompt_tokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(entry.completion_tokens)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatNumber(entry.total_tokens)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data && data.data.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!canGoNext}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
