import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Loading, Empty, FadeIn, Item } from '../components/Common.jsx'
import { countdown, fmtDue, fmtMinutes, hoursOf, weekdayLabel } from '../utils.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function Dashboard({ goTo }) {
  const [data, setData] = useState(null)

  async function load() {
    setData(await api.dashboard())
  }
  useEffect(() => {
    load()
  }, [])

  async function toggleTodo(t) {
    await api.todos.update(t.id, { completed: !t.completed })
    load()
  }

  if (!data) return <Loading />

  const now = new Date()
  const dateStr = `${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${weekdayLabel(
    data.weekday,
  )}`
  const pendingTodos = data.todos_today.filter((t) => !t.completed).length

  return (
    <FadeIn>
      <Item className="page-head">
        <div>
          <div className="eyebrow">{dateStr}</div>
          <h1 className="page-title">
            {greeting()}，<span className="accent">今天也要加油</span>
          </h1>
          <p className="page-sub">
            今天有 {data.courses_today.length} 节课，{pendingTodos} 件待办，
            {data.upcoming_assignments.length} 个临近 deadline。
          </p>
        </div>
      </Item>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* 今日课程 */}
        <Item className="card">
          <div className="card-title">
            <span className="tick" /> 今日课程
          </div>
          {data.courses_today.length === 0 ? (
            <Empty icon="🌤️">今天没有课，好好放松～</Empty>
          ) : (
            data.courses_today.map((c) => (
              <div className="row" key={c.id}>
                <span
                  style={{
                    width: 10,
                    height: 38,
                    borderRadius: 4,
                    background: c.color,
                  }}
                />
                <div className="grow">
                  <div className="row-title">{c.name}</div>
                  <div className="row-meta">
                    📍 {c.location || '待定'} · {c.teacher}
                  </div>
                </div>
                <span className="countdown calm">
                  {c.start_time}–{c.end_time}
                </span>
              </div>
            ))
          )}
        </Item>

        {/* 本周学习 */}
        <Item
          className="card"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div className="card-title">
            <span className="tick" style={{ background: 'var(--teal)' }} /> 本周学习
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div>
              <span className="stat-big" style={{ color: 'var(--teal)' }}>
                {hoursOf(data.study_minutes_this_week)}
              </span>
              <span className="stat-unit">小时</span>
              <p className="page-sub" style={{ marginTop: 8 }}>
                累计 {fmtMinutes(data.study_minutes_this_week)}，
                继续保持节奏 💪
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => goTo('study')}>
            查看学习统计 →
          </button>
        </Item>
      </div>

      <div className="grid grid-2">
        {/* 临近 deadline */}
        <Item className="card">
          <div className="card-title">
            <span className="tick" style={{ background: 'var(--gold)' }} /> 临近
            deadline
          </div>
          {data.upcoming_assignments.length === 0 ? (
            <Empty icon="🎉">最近没有要交的作业！</Empty>
          ) : (
            data.upcoming_assignments.map((a) => {
              const cd = countdown(a.due_date)
              return (
                <div className="row" key={a.id}>
                  <div className="grow">
                    <div className="row-title">{a.title}</div>
                    <div className="row-meta">
                      {a.course && (
                        <span style={{ color: a.course.color, fontWeight: 600 }}>
                          {a.course.name}
                        </span>
                      )}
                      <span>{fmtDue(a.due_date)}</span>
                    </div>
                  </div>
                  <span className={`countdown ${cd.level}`}>{cd.text}</span>
                </div>
              )
            })
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => goTo('assignments')}
          >
            管理全部作业 →
          </button>
        </Item>

        {/* 今日待办 */}
        <Item className="card">
          <div className="card-title">
            <span className="tick" style={{ background: 'var(--plum)' }} /> 今日待办
          </div>
          {data.todos_today.length === 0 ? (
            <Empty icon="📝">还没有待办，点下方添加一个吧</Empty>
          ) : (
            data.todos_today.map((t) => (
              <div className="row" key={t.id}>
                <input
                  type="checkbox"
                  className="check"
                  checked={t.completed}
                  onChange={() => toggleTodo(t)}
                />
                <span className={`grow row-title ${t.completed ? 'done-text' : ''}`}>
                  {t.content}
                </span>
              </div>
            ))
          )}
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => goTo('todos')}
          >
            去待办清单 →
          </button>
        </Item>
      </div>
    </FadeIn>
  )
}
