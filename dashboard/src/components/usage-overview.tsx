import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn, formatNumber, formatPercentage } from '@/lib/utils'
import type { TierUsage, ReconcileResponse } from '@/types/api'

interface UsageOverviewProps {
  date: string
  premium: TierUsage
  mini: TierUsage
  onReconcile: () => Promise<ReconcileResponse>
  isReconciling: boolean
  reconcileStatus?: {
    type: 'loading' | 'success' | 'error'
    message: string
  }
}

interface TierCardProps {
  title: string
  limit: string
  models: string
  usage: TierUsage
  variant: 'premium' | 'mini'
}

function TierCard({ title, limit, models, usage, variant }: TierCardProps) {
  const percentage = usage.percentage
  const isWarning = percentage >= 75 && percentage < 90
  const isDanger = percentage >= 90

  const progressColor = isDanger
    ? 'bg-red-500'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-primary'

  const percentageColor = isDanger
    ? 'text-red-500'
    : isWarning
      ? 'text-yellow-500'
      : 'text-primary'

  return (
    <div className="space-y-4 rounded-lg border bg-card/50 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant={variant === 'premium' ? 'default' : 'secondary'}>
          {limit}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">{models}</p>

      <div className="space-y-2">
        <Progress value={Math.min(percentage, 100)} className="h-3" />
        <div className={cn('relative h-3 w-full overflow-hidden rounded-full bg-primary/20')}>
          <div
            className={cn('h-full transition-all', progressColor)}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>
            {formatNumber(usage.used)} / {formatNumber(usage.limit)} tokens
          </span>
          <span className={cn('font-semibold', percentageColor)}>
            {formatPercentage(percentage)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function UsageOverview({
  date,
  premium,
  mini,
  onReconcile,
  isReconciling,
  reconcileStatus,
}: UsageOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Token Usage Overview</CardTitle>
            <CardDescription className="mt-1">
              Updated: {new Date().toLocaleString()} ({date})
            </CardDescription>
          </div>
          <Button
            onClick={onReconcile}
            disabled={isReconciling}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isReconciling && 'animate-spin')} />
            Reconcile with OpenAI
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {reconcileStatus && (
          <div
            className={cn(
              'rounded-md border p-4 text-sm',
              reconcileStatus.type === 'loading' && 'border-blue-500 bg-blue-500/10 text-blue-500',
              reconcileStatus.type === 'success' && 'border-green-500 bg-green-500/10 text-green-500',
              reconcileStatus.type === 'error' && 'border-red-500 bg-red-500/10 text-red-500'
            )}
          >
            {reconcileStatus.message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <TierCard
            title="Premium Tier"
            limit="1M tokens/day"
            models="gpt-5, gpt-5-codex, gpt-5-chat-latest, gpt-4.1, gpt-4o, o1, o3"
            usage={premium}
            variant="premium"
          />

          <TierCard
            title="Mini Tier"
            limit="10M tokens/day"
            models="gpt-5-mini, gpt-5-nano, gpt-4.1-mini, gpt-4.1-nano, gpt-4o-mini, o1-mini, o3-mini, o4-mini, codex-mini-latest"
            usage={mini}
            variant="mini"
          />
        </div>
      </CardContent>
    </Card>
  )
}
