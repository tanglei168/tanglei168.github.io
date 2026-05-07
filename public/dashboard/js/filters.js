export const state = {
  market: 'all',
  tier: 'all',
  search: '',
  sort: { key: 'weight', dir: 'desc' },
  rawData: null,
}

const SORT_KEYS = ['name', 'ticker', 'price', 'change_pct', 'pe_ttm', 'from_high_pct', 'weight']

export function applyFilters(data) {
  if (!data) return []

  let combined = []
  if (state.market === 'all' || state.market === 'cn') {
    combined = combined.concat((data.cn || []).map((x) => ({ ...x, market: 'cn' })))
  }
  if (state.market === 'all' || state.market === 'us') {
    combined = combined.concat((data.us || []).map((x) => ({ ...x, market: 'us' })))
  }

  if (state.tier !== 'all') {
    combined = combined.filter((x) => x.tier === state.tier)
  }

  if (state.search) {
    const q = state.search.toLowerCase().trim()
    combined = combined.filter(
      (x) => x.ticker.toLowerCase().includes(q) || (x.name || '').toLowerCase().includes(q)
    )
  }

  const { key, dir } = state.sort
  if (SORT_KEYS.includes(key)) {
    combined.sort((a, b) => {
      const va = a[key]
      const vb = b[key]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      let cmp
      if (typeof va === 'string') cmp = va.localeCompare(vb, 'zh-CN')
      else cmp = va - vb
      return dir === 'asc' ? cmp : -cmp
    })
  }

  return combined
}

export function bindFilterTabs(onChange) {
  document.querySelectorAll('.filter-tabs .tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filterKey = btn.dataset.filter
      const value = btn.dataset.value
      btn.parentElement.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      state[filterKey] = value
      onChange()
    })
  })
}

export function bindSearch(onChange) {
  const input = document.getElementById('holdings-search')
  if (!input) return
  let timer = null
  input.addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      state.search = input.value
      onChange()
    }, 200)
  })
}

export function bindSortHeaders(onChange) {
  document.querySelectorAll('.holdings-table th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc'
      } else {
        state.sort.key = key
        state.sort.dir = 'desc'
      }
      document.querySelectorAll('.holdings-table th').forEach((t) => {
        t.classList.remove('sorted-asc', 'sorted-desc')
      })
      th.classList.add(state.sort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc')
      onChange()
    })
  })
}
