const ENDPOINTS = {
  yahooQuote: (ticker) =>
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`,
}

export async function loadLocalJson(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`${path}: ${res.status}`)
    return await res.json()
  } catch (e) {
    console.warn(`[data-loader] Failed to load ${path}:`, e)
    return null
  }
}

export async function fetchLiveQuote(ticker) {
  try {
    const res = await fetch(ENDPOINTS.yahooQuote(ticker), {
      mode: 'cors',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) throw new Error('No result in response')

    const meta = result.meta
    const price = meta.regularMarketPrice
    const prevClose = meta.chartPreviousClose ?? meta.previousClose
    const change_pct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0

    return {
      ticker,
      price,
      change_pct,
      currency: meta.currency,
      market_state: meta.marketState,
      fetched_at: new Date().toISOString(),
      source: 'yahoo-live',
    }
  } catch (e) {
    console.warn(`[data-loader] Live quote failed for ${ticker}:`, e)
    return null
  }
}

export async function fetchLiveQuotes(tickers, timeoutMs = 8000) {
  const promises = tickers.map((t) =>
    Promise.race([
      fetchLiveQuote(t),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])
  )
  const results = await Promise.all(promises)
  const map = {}
  results.forEach((r) => { if (r) map[r.ticker] = r })
  return map
}

export function mergeQuotes(dailyData, liveQuotes) {
  if (!dailyData) return null

  const mergeOne = (item) => {
    const live = liveQuotes[item.ticker]
    if (live && live.price) {
      return {
        ...item,
        price: live.price,
        change_pct: live.change_pct,
        market_state: live.market_state,
        live_fetched_at: live.fetched_at,
        is_live: true,
      }
    }
    return { ...item, is_live: false }
  }

  return {
    ...dailyData,
    cn: (dailyData.cn || []).map(mergeOne),
    us: (dailyData.us || []).map(mergeOne),
  }
}

export function dataFreshness(timestamp) {
  if (!timestamp) return 'error'
  const ageMs = Date.now() - new Date(timestamp).getTime()
  if (ageMs < 24 * 3600 * 1000) return 'fresh'
  if (ageMs < 72 * 3600 * 1000) return 'stale'
  return 'error'
}
