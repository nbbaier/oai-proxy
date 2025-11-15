import type { UsageResponse, UsageResult } from './types';

/**
 * Fetch usage data from OpenAI's Usage API
 * Handles pagination automatically
 */
export async function fetchOpenAIUsage(
  startTime: number,
  endTime: number,
  adminKey: string
): Promise<UsageResult[]> {
  const params = new URLSearchParams({
    start_time: startTime.toString(),
    end_time: endTime.toString(),
    bucket_width: '1d',
    group_by: 'model',
  });

  const baseUrl = `https://api.openai.com/v1/organization/usage/completions?${params}`;
  const allResults: UsageResult[] = [];
  let nextPage: string | undefined;
  let pageCount = 0;

  // Handle pagination
  do {
    pageCount++;
    const fetchUrl = nextPage || baseUrl;

    console.log(`Fetching usage data (page ${pageCount})...`);

    const response = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to fetch usage from OpenAI: ${response.status} - ${error}`
      );
    }

    const data = (await response.json()) as UsageResponse;

    // Flatten all results from all buckets
    for (const bucket of data.data) {
      allResults.push(...bucket.results);
    }

    nextPage = data.next_page ?? undefined;
  } while (nextPage);

  console.log(`Fetched ${allResults.length} usage results across ${pageCount} page(s)`);

  return allResults;
}

/**
 * Get UTC date string in YYYY-MM-DD format
 */
export function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start and end timestamps for a specific UTC date
 */
export function getDateTimestamps(dateString?: string): { startTime: number; endTime: number } {
  const date = dateString || getUTCDateString();
  const startDate = new Date(`${date}T00:00:00Z`);
  const startTime = Math.floor(startDate.getTime() / 1000);
  const endTime = startTime + 86400; // +24 hours

  return { startTime, endTime };
}
