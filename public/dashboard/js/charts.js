const COLORS = {
  text: '#2C2C2C',
  muted: '#6B6B6B',
  border: '#E5E2DA',
  red: '#C8392E',
  amber: '#C9952B',
  green: '#3D6B4D',
  blue: '#3B5C7E',
}

export const DOMAIN_COLORS = {
  // 真实兑现（绿色系）
  ai_coding:        '#3D6B4D',
  customer_service: '#2E7D5A',
  data_analysis:    '#4A8C6A',
  cybersecurity:    '#1B5E3B',
  // 部分真实（琥珀/蓝色系）
  ai_legal:         '#C9952B',
  content_creation: '#D4A44C',
  financial_services:'#3B5C7E',
  medical_admin:    '#5B7EA0',
  sales_assist:     '#8B6914',
  ai_agent:         '#6B8CAD',
  // 主要炒作（红/棕色系）
  cn_ai_chip:       '#A86B5C',
  ai_manufacturing: '#C8392E',
  ai_education:     '#B5341F',
  ai_retail:        '#D4572A',
  ai_realestate:    '#C04A35',
  ai_agriculture:   '#A03020',
}

let radarChart = null
let capexChart = null

export function renderRadar(canvasId, dimensions, domains, visibleDomainIds = null) {
  const ctx = document.getElementById(canvasId)?.getContext('2d')
  if (!ctx || !window.Chart) return

  const datasets = domains
    .filter((d) => !visibleDomainIds || visibleDomainIds.includes(d.id))
    .map((d) => ({
      label: d.name,
      data: d.scores,
      backgroundColor: (DOMAIN_COLORS[d.id] || COLORS.blue) + '33',
      borderColor: DOMAIN_COLORS[d.id] || COLORS.blue,
      borderWidth: 2,
      pointBackgroundColor: DOMAIN_COLORS[d.id] || COLORS.blue,
      pointRadius: 4,
    }))

  if (radarChart) radarChart.destroy()
  radarChart = new window.Chart(ctx, {
    type: 'radar',
    data: { labels: dimensions, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: COLORS.text },
      },
      scales: {
        r: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 1,
            color: COLORS.muted,
            backdropColor: 'transparent',
          },
          grid: { color: COLORS.border },
          angleLines: { color: COLORS.border },
          pointLabels: { color: COLORS.text, font: { size: 11 } },
        },
      },
    },
  })
}

export function renderCapexHistory(canvasId, history) {
  const ctx = document.getElementById(canvasId)?.getContext('2d')
  if (!ctx || !window.Chart || !history) return

  const colors = history.map((h) => {
    if (h.status === 'bubble' || h.status === 'warning') return COLORS.red
    if (h.status === 'healthy') return COLORS.green
    return COLORS.muted
  })

  if (capexChart) capexChart.destroy()
  capexChart = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: history.map((h) => h.period),
      datasets: [
        {
          label: '资本开支 / 真实收入比例',
          data: history.map((h) => h.ratio),
          backgroundColor: colors,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: COLORS.border },
          ticks: { color: COLORS.muted },
        },
        x: {
          grid: { display: false },
          ticks: { color: COLORS.text },
        },
      },
    },
  })
}
