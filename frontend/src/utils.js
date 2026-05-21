// 通用工具：日期、时间、文案等

export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function weekdayLabel(n) {
  return WEEKDAYS[n - 1] || ''
}

// 课程颜色备选
export const COURSE_COLORS = [
  '#cf4b22', '#1f5e5b', '#c28a1e', '#7a5c9e', '#5c7a52', '#b23a48', '#356a8c',
]

export const CATEGORIES = {
  canteen: { label: '食堂', icon: '🍜' },
  cafe: { label: '咖啡店', icon: '☕' },
  library: { label: '图书馆', icon: '📚' },
  other: { label: '其他', icon: '📍' },
}

export const PRIORITIES = {
  high: '高',
  medium: '中',
  low: '低',
}

// 把分钟数转成 "Xh Ym" / "Ym"
export function fmtMinutes(min) {
  if (!min) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

export function hoursOf(min) {
  return (min / 60).toFixed(1)
}

// 本地 YYYY-MM-DD（避免时区偏移）
export function todayStr() {
  const d = new Date()
  return ymd(d)
}

export function ymd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 倒计时文案 + 紧急度，输入 ISO datetime 字符串
export function countdown(due) {
  const now = new Date()
  const target = new Date(due)
  const diffMs = target - now
  const dayMs = 24 * 3600 * 1000
  if (diffMs < 0) {
    const days = Math.ceil(-diffMs / dayMs)
    return { text: days <= 0 ? '已逾期' : `逾期 ${days} 天`, level: 'overdue' }
  }
  const days = Math.floor(diffMs / dayMs)
  const hours = Math.floor((diffMs % dayMs) / (3600 * 1000))
  if (days === 0) {
    return { text: hours <= 1 ? '不到 1 小时' : `今天 · 还剩 ${hours} 小时`, level: 'soon' }
  }
  if (days === 1) return { text: '明天截止', level: 'soon' }
  return { text: `还剩 ${days} 天`, level: days <= 3 ? 'soon' : 'calm' }
}

// 友好日期 "5月22日 周五 23:59"
export function fmtDue(iso) {
  const d = new Date(iso)
  const wd = (d.getDay() + 6) % 7 // 周日=6
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[wd]} ${hh}:${mm}`
}

export function stars(n) {
  const full = '★'.repeat(n)
  const empty = '☆'.repeat(5 - n)
  return { full, empty }
}
