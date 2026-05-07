import { loadLocalJson, fetchLiveQuotes, mergeQuotes, dataFreshness } from './data-loader.js'
import { state, applyFilters, bindFilterTabs, bindSearch, bindSortHeaders } from './filters.js'
import { renderRadar, renderCapexHistory } from './charts.js'

const DATA = {
  prices: '/dashboard/snapshots/prices-latest.json',
  indicators: '/dashboard/snapshots/indicators.json',
  hypeScores: '/dashboard/snapshots/hype-scores.json',
}

const dashboardData = {
  prices: null,
  indicators: null,
  hypeScores: null,
}

function renderHeader() {
  const lastUpdated = dashboardData.prices?.last_updated
  const dot = document.getElementById('status-dot')
  const text = document.getElementById('last-updated')
  if (!lastUpdated) {
    dot.className = 'status-dot error'
    text.textContent = '数据加载失败，请触发 GitHub Actions 更新'
    return
  }
  const fresh = dataFreshness(lastUpdated)
  dot.className = `status-dot ${fresh}`
  const date = new Date(lastUpdated)
  text.textContent = `数据更新于 ${date.toLocaleString('zh-CN', { hour12: false })}`
}

function renderIndicators() {
  const grid = document.getElementById('indicators-grid')
  if (!grid || !dashboardData.indicators) return
  grid.innerHTML = dashboardData.indicators.indicators
    .map((ind) => `
      <div class="indicator-card ${ind.status}">
        <div class="indicator-header">
          <span class="indicator-signal ${ind.status}"></span>
          <span class="indicator-name">${ind.name}</span>
        </div>
        <div class="indicator-value">${ind.current_value ?? '—'}</div>
        <div class="indicator-note">${ind.note ?? ind.threshold ?? ''}</div>
      </div>
    `)
    .join('')
}

function formatNum(v, digits = 2) {
  if (v == null) return '—'
  return Number(v).toFixed(digits)
}

function formatMarketCap(v, currency) {
  if (v == null) return '—'
  if (currency === 'USD') {
    if (v >= 1e12) return (v / 1e12).toFixed(1) + 'T'
    if (v >= 1e9)  return (v / 1e9).toFixed(0) + 'B'
    return (v / 1e6).toFixed(0) + 'M'
  }
  if (v >= 1e12) return (v / 1e12).toFixed(1) + '万亿'
  if (v >= 1e8)  return (v / 1e8).toFixed(0) + '亿'
  return v.toLocaleString()
}

function renderHoldings() {
  const table = document.getElementById('holdings-table')
  const empty = document.getElementById('holdings-empty')
  if (!table) return

  const filtered = applyFilters(dashboardData.prices)

  table.querySelectorAll('tbody').forEach((el) => el.remove())

  if (filtered.length === 0) {
    empty.hidden = false
    return
  }
  empty.hidden = true

  const frag = document.createDocumentFragment()
  filtered.forEach((item) => {
    const changeClass = item.change_pct > 0 ? 'price-up' : item.change_pct < 0 ? 'price-down' : ''
    const changeSign = item.change_pct > 0 ? '+' : ''
    const highClass = item.from_high_pct != null && item.from_high_pct < -20 ? 'price-down' : ''
    const range = (item.week52_high ?? 0) - (item.week52_low ?? 0)
    const pos = range > 0 ? Math.round(((item.price - item.week52_low) / range) * 100) : 50

    const tbody = document.createElement('tbody')
    tbody.className = 'holding-group'
    tbody.innerHTML = `
      <tr class="holding-row">
        <td>${item.name}</td>
        <td><span class="ticker-code">${item.ticker}</span></td>
        <td class="num">${formatNum(item.price)}</td>
        <td class="num ${changeClass}">${changeSign}${formatNum(item.change_pct)}%</td>
        <td class="num">${formatNum(item.pe_ttm, 1)}</td>
        <td class="num ${highClass}">${item.from_high_pct != null ? formatNum(item.from_high_pct, 1) + '%' : '—'}</td>
        <td class="num">${item.weight > 0 ? item.weight + '%' : '—'}</td>
        <td><span class="tier-badge ${item.tier}">${tierLabel(item.tier)}</span></td>
        <td class="thesis-cell">${item.thesis}</td>
      </tr>
      <tr class="holding-detail">
        <td colspan="9">
          <div class="detail-expand">
            <div class="detail-inner">
              <div class="detail-item">
                <span class="detail-label">PE Forward</span>
                <span class="detail-value">${formatNum(item.pe_forward, 1)}×</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">市值</span>
                <span class="detail-value">${formatMarketCap(item.market_cap, item.currency)}</span>
              </div>
              <div class="detail-item detail-range">
                <span class="detail-label">52 周区间</span>
                <div class="range-bar">
                  <span class="range-bound">${formatNum(item.week52_low)}</span>
                  <div class="range-track">
                    <div class="range-marker" style="left:${pos}%"></div>
                  </div>
                  <span class="range-bound">${formatNum(item.week52_high)}</span>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `
    frag.appendChild(tbody)
  })
  table.appendChild(frag)
}

function tierLabel(tier) {
  return { core: '核心', satellite: '卫星', theme: '主题', avoid: '回避', watch: '观察' }[tier] || tier
}

function renderHype() {
  if (!dashboardData.hypeScores) return
  const { dimensions, domains } = dashboardData.hypeScores

  renderRadar('hype-radar', dimensions, domains)

  const scoresEl = document.getElementById('hype-scores')
  if (scoresEl) {
    scoresEl.innerHTML = domains
      .map(
        (d) => `
      <div class="hype-domain-card" data-domain-id="${d.id}">
        <div>
          <div class="hype-domain-name">${d.name}</div>
          <div class="hype-domain-verdict">${d.verdict}</div>
        </div>
        <span class="hype-score ${d.level}">${d.total}/${d.max}</span>
      </div>
    `
      )
      .join('')

    const visibleIds = new Set(domains.map((d) => d.id))
    scoresEl.querySelectorAll('.hype-domain-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.domainId
        if (visibleIds.has(id)) {
          visibleIds.delete(id)
          card.classList.add('dimmed')
        } else {
          visibleIds.add(id)
          card.classList.remove('dimmed')
        }
        renderRadar('hype-radar', dimensions, domains, [...visibleIds])
      })
    })
  }
}

function renderSystemic() {
  if (!dashboardData.indicators?.systemic) return
  const sys = dashboardData.indicators.systemic
  document.getElementById('capex-ratio').textContent = sys.capex_to_revenue_ratio
  document.getElementById('capex-hint').textContent = sys.capex_to_revenue_note
  renderCapexHistory('capex-history', sys.history)
}

async function init() {
  const [prices, indicators, hypeScores] = await Promise.all([
    loadLocalJson(DATA.prices),
    loadLocalJson(DATA.indicators),
    loadLocalJson(DATA.hypeScores),
  ])

  dashboardData.prices = prices
  dashboardData.indicators = indicators
  dashboardData.hypeScores = hypeScores
  state.rawData = prices

  renderHeader()
  renderIndicators()
  renderHype()
  renderSystemic()
  renderHoldings()

  if (prices) {
    const allTickers = [
      ...(prices.cn || []).map((x) => x.ticker),
      ...(prices.us || []).map((x) => x.ticker),
    ]
    fetchLiveQuotes(allTickers).then((liveQuotes) => {
      const merged = mergeQuotes(prices, liveQuotes)
      dashboardData.prices = merged
      state.rawData = merged
      renderHoldings()

      const text = document.getElementById('last-updated')
      const liveCount = Object.keys(liveQuotes).length
      if (text && liveCount > 0) {
        text.textContent += ` · 实时价格 ${liveCount}/${allTickers.length}`
      }
    })
  }

  bindFilterTabs(renderHoldings)
  bindSearch(renderHoldings)
  bindSortHeaders(renderHoldings)
}

function waitForChart(callback) {
  if (window.Chart) callback()
  else setTimeout(() => waitForChart(callback), 50)
}

waitForChart(init)
