import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import Modal from '../components/Modal.jsx'
import { Loading } from '../components/Common.jsx'
import { COURSE_COLORS, WEEKDAYS } from '../utils.js'

const START_HOUR = 8
const END_HOUR = 22
const PX_PER_MIN = 56 / 60 // 每行 56px = 1 小时

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const blank = {
  name: '',
  day_of_week: 1,
  start_time: '08:00',
  end_time: '09:50',
  location: '',
  teacher: '',
  color: COURSE_COLORS[0],
}

export default function Schedule() {
  const [courses, setCourses] = useState(null)
  const [editing, setEditing] = useState(null) // 课程对象或 null
  const [open, setOpen] = useState(false)

  async function load() {
    setCourses(await api.courses.list())
  }
  useEffect(() => {
    load()
  }, [])

  const todayDow = ((new Date().getDay() + 6) % 7) + 1

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    [],
  )
  const byDay = useMemo(() => {
    const map = {}
    for (let d = 1; d <= 7; d++) map[d] = []
    ;(courses || []).forEach((c) => map[c.day_of_week].push(c))
    return map
  }, [courses])

  function openNew() {
    setEditing({ ...blank })
    setOpen(true)
  }
  function openEdit(c) {
    setEditing({ ...c })
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault()
    const body = { ...editing }
    if (editing.id) await api.courses.update(editing.id, body)
    else await api.courses.create(body)
    setOpen(false)
    load()
  }
  async function remove() {
    await api.courses.remove(editing.id)
    setOpen(false)
    load()
  }

  if (!courses) return <Loading />

  const colHeight = (END_HOUR - START_HOUR) * 56

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">weekly schedule</div>
          <h1 className="page-title">
            我的<span className="accent">课程表</span>
          </h1>
          <p className="page-sub">共 {courses.length} 节课 · 点击任意课程可编辑</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 新增课程
        </button>
      </div>

      <div className="timetable">
        <div className="tt-corner" />
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`tt-dayhead ${i + 1 === todayDow ? 'today' : ''}`}>
            {w}
            {i + 1 === todayDow && <small>今天</small>}
          </div>
        ))}

        {/* 时间轴 */}
        <div className="tt-timecol">
          {hours.map((h) => (
            <div className="tt-hour" key={h}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* 7 天列 */}
        {WEEKDAYS.map((w, i) => {
          const day = i + 1
          return (
            <div className="tt-day" key={w} style={{ minHeight: colHeight }}>
              {hours.map((h) => (
                <div className="hourline" key={h} />
              ))}
              {byDay[day].map((c) => {
                const top = (toMin(c.start_time) - START_HOUR * 60) * PX_PER_MIN
                const height = (toMin(c.end_time) - toMin(c.start_time)) * PX_PER_MIN
                return (
                  <div
                    key={c.id}
                    className="tt-block"
                    style={{ top, height, background: c.color }}
                    onClick={() => openEdit(c)}
                  >
                    <div className="b-name">{c.name}</div>
                    <div className="b-meta">
                      {c.start_time}–{c.end_time}
                    </div>
                    {height > 54 && <div className="b-meta">📍 {c.location}</div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <Modal
        open={open}
        title={editing?.id ? '编辑课程' : '新增课程'}
        onClose={() => setOpen(false)}
      >
        {editing && (
          <form onSubmit={save}>
            <div className="field">
              <label>课程名称</label>
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="例如：数据结构与算法"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>星期</label>
                <select
                  value={editing.day_of_week}
                  onChange={(e) =>
                    setEditing({ ...editing, day_of_week: Number(e.target.value) })
                  }
                >
                  {WEEKDAYS.map((w, i) => (
                    <option key={w} value={i + 1}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>开始</label>
                <input
                  type="time"
                  value={editing.start_time}
                  onChange={(e) =>
                    setEditing({ ...editing, start_time: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>结束</label>
                <input
                  type="time"
                  value={editing.end_time}
                  onChange={(e) =>
                    setEditing({ ...editing, end_time: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>地点</label>
                <input
                  value={editing.location}
                  onChange={(e) =>
                    setEditing({ ...editing, location: e.target.value })
                  }
                  placeholder="逸夫楼 301"
                />
              </div>
              <div className="field">
                <label>老师</label>
                <input
                  value={editing.teacher}
                  onChange={(e) =>
                    setEditing({ ...editing, teacher: e.target.value })
                  }
                  placeholder="李教授"
                />
              </div>
            </div>
            <div className="field">
              <label>颜色</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COURSE_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setEditing({ ...editing, color: c })}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: c,
                      cursor: 'pointer',
                      border:
                        editing.color === c
                          ? '3px solid var(--ink)'
                          : '2px solid var(--line)',
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              {editing.id && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginRight: 'auto', color: 'var(--tomato-deep)' }}
                  onClick={remove}
                >
                  删除
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
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
