import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Modal from '../components/Modal.jsx'
import { Loading, Empty, FadeIn, Item } from '../components/Common.jsx'
import { COURSE_COLORS, fmtMinutes, hoursOf, todayStr, WEEKDAYS } from '../utils.js'

const blankSession = () => ({
  subject: '',
  course_id: null,
  minutes: 60,
  date: todayStr(),
  note: '',
})

function fmtMD(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function StudyStats() {
  const [offset, setOffset] = useState(0)
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [courses, setCourses] = useState([])
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  async function loadStats(o = offset) {
    setStats(await api.study.stats(o))
  }
  async function loadRest() {
    const [s, c] = await Promise.all([api.study.list(), api.courses.list()])
    setSessions(s)
    setCourses(c)
  }
  useEffect(() => {
    loadStats()
  }, [offset])
  useEffect(() => {
    loadRest()
  }, [])

  function openNew() {
    setEditing(blankSession())
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault()
    const body = {
      ...editing,
      minutes: Number(editing.minutes),
      course_id: editing.course_id || null,
    }
    await api.study.create(body)
    setOpen(false)
    loadStats()
    loadRest()
  }
  async function remove(s) {
    await api.study.remove(s.id)
    loadStats()
    loadRest()
  }

  if (!stats) return <Loading />

  const maxDay = Math.max(1, ...stats.daily.map((d) => d.minutes))
  const maxSub = Math.max(1, ...stats.by_subject.map((s) => s.minutes))
  const today = todayStr()
  const weekLabel =
    offset === 0 ? '本周' : offset === -1 ? '上一周' : offset === 1 ? '下一周' : `${offset} 周`

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">study time</div>
          <h1 className="page-title">
            学习<span className="accent">统计</span>
          </h1>
          <p className="page-sub">
            {fmtMD(stats.week_start)} – {fmtMD(stats.week_end)} · {weekLabel}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 记录学习
        </button>
      </div>

      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset - 1)}>
          ‹ 上一周
        </button>
        {offset !== 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>
            回到本周
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + 1)}>
          下一周 ›
        </button>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        {/* 每日柱状图 */}
        <div className="card">
          <div className="card-title">
            <span className="tick" /> 每日学习时长
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-soft)', fontWeight: 400 }}>
              总计 <b className="countdown calm">{hoursOf(stats.total_minutes)}h</b>
            </span>
          </div>
          {stats.total_minutes === 0 ? (
            <Empty icon="📊">这一周还没有学习记录</Empty>
          ) : (
            <div className="bars">
              {stats.daily.map((d, i) => {
                const isToday = d.date === today
                return (
                  <div className="bar-col" key={d.date}>
                    <div className="bar-track">
                      {d.minutes > 0 && (
                        <div
                          className={`bar ${isToday ? 'today' : ''}`}
                          style={{ height: `${(d.minutes / maxDay) * 130}px` }}
                        >
                          <span className="bar-val">{fmtMinutes(d.minutes)}</span>
                        </div>
                      )}
                    </div>
                    <div className={`bar-label ${isToday ? 'is-today' : ''}`}>
                      {WEEKDAYS[i].slice(1)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 科目分布 */}
        <div className="card">
          <div className="card-title">
            <span className="tick" style={{ background: 'var(--teal)' }} /> 各科目分布
          </div>
          {stats.by_subject.length === 0 ? (
            <Empty icon="📚">暂无数据</Empty>
          ) : (
            stats.by_subject.map((s, i) => (
              <div className="sbar" key={s.subject}>
                <div className="sbar-head">
                  <span>{s.subject}</span>
                  <span className="m">{fmtMinutes(s.minutes)}</span>
                </div>
                <div className="sbar-track">
                  <div
                    className="sbar-fill"
                    style={{
                      width: `${(s.minutes / maxSub) * 100}%`,
                      background: COURSE_COLORS[i % COURSE_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 最近记录 */}
      <div className="card">
        <div className="card-title">
          <span className="tick" style={{ background: 'var(--gold)' }} /> 最近学习记录
        </div>
        {sessions.length === 0 ? (
          <Empty icon="🕮">还没有任何记录</Empty>
        ) : (
          <FadeIn>
            {sessions.slice(0, 12).map((s, i) => (
              <Item className="row" key={s.id} index={i}>
                <div className="grow">
                  <div className="row-title">{s.subject}</div>
                  <div className="row-meta">
                    {fmtMD(s.date)}
                    {s.note && <span>· {s.note}</span>}
                  </div>
                </div>
                <span className="countdown calm">{fmtMinutes(s.minutes)}</span>
                <button className="icon-btn danger" onClick={() => remove(s)} title="删除">
                  🗑
                </button>
              </Item>
            ))}
          </FadeIn>
        )}
      </div>

      <Modal open={open} title="记录学习时长" onClose={() => setOpen(false)}>
        {editing && (
          <form onSubmit={save}>
            <div className="field">
              <label>关联课程（可选，会自动填科目）</label>
              <select
                value={editing.course_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null
                  const c = courses.find((x) => x.id === id)
                  setEditing({
                    ...editing,
                    course_id: id,
                    subject: c ? c.name : editing.subject,
                  })
                }}
              >
                <option value="">（无）</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>科目</label>
              <input
                required
                value={editing.subject}
                onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                placeholder="例如：数据结构与算法"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>时长（分钟）</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editing.minutes}
                  onChange={(e) => setEditing({ ...editing, minutes: e.target.value })}
                />
              </div>
              <div className="field">
                <label>日期</label>
                <input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label>备注</label>
              <input
                value={editing.note}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                placeholder="复习 / 做题 / 写报告…"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                保存
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
