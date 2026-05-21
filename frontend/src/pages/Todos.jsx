import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Loading, Empty, FadeIn, Item } from '../components/Common.jsx'
import { todayStr, WEEKDAYS, ymd } from '../utils.js'

export default function Todos() {
  const [date, setDate] = useState(todayStr())
  const [items, setItems] = useState(null)
  const [draft, setDraft] = useState('')

  async function load() {
    setItems(await api.todos.list(`?date=${date}`))
  }
  useEffect(() => {
    load()
  }, [date])

  async function add(e) {
    e.preventDefault()
    const content = draft.trim()
    if (!content) return
    setDraft('')
    await api.todos.create({ content, date })
    load()
  }
  async function toggle(t) {
    await api.todos.update(t.id, { completed: !t.completed })
    load()
  }
  async function remove(t) {
    await api.todos.remove(t.id)
    load()
  }

  const d = new Date(date + 'T00:00:00')
  const wd = WEEKDAYS[(d.getDay() + 6) % 7]
  const isToday = date === todayStr()
  const done = (items || []).filter((t) => t.completed).length
  const total = items?.length || 0
  const pct = total ? Math.round((done / total) * 100) : 0

  function shiftDay(n) {
    const nd = new Date(date + 'T00:00:00')
    nd.setDate(nd.getDate() + n)
    setDate(ymd(nd))
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">to-do</div>
          <h1 className="page-title">
            待办<span className="accent">清单</span>
          </h1>
          <p className="page-sub">
            {d.getMonth() + 1} 月 {d.getDate()} 日 · {wd}
            {isToday && ' · 今天'} — 已完成 {done}/{total}
          </p>
        </div>
        <div className="toolbar" style={{ margin: 0 }}>
          <button className="icon-btn" onClick={() => shiftDay(-1)} title="前一天">
            ‹
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: 'auto' }}
          />
          <button className="icon-btn" onClick={() => shiftDay(1)} title="后一天">
            ›
          </button>
          {!isToday && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setDate(todayStr())}
            >
              今天
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <form onSubmit={add} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="添加一件待办，回车确认…"
          />
          <button type="submit" className="btn btn-primary">
            ＋ 添加
          </button>
        </form>

        {total > 0 && (
          <div className="sbar-track" style={{ margin: '14px 0 6px' }}>
            <div
              className="sbar-fill"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? 'var(--sage)' : 'var(--plum)',
                transition: 'width 0.4s',
              }}
            />
          </div>
        )}

        {!items ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty icon="📝">这一天还没有待办</Empty>
        ) : (
          <FadeIn>
            {items.map((t, i) => (
              <Item className="row" key={t.id} index={i}>
                <input
                  type="checkbox"
                  className="check"
                  checked={t.completed}
                  onChange={() => toggle(t)}
                />
                <span
                  className={`grow row-title ${t.completed ? 'done-text' : ''}`}
                >
                  {t.content}
                </span>
                <button
                  className="icon-btn danger"
                  onClick={() => remove(t)}
                  title="删除"
                >
                  🗑
                </button>
              </Item>
            ))}
          </FadeIn>
        )}
      </div>
    </div>
  )
}
