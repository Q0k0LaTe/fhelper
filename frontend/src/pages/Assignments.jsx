import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Modal from '../components/Modal.jsx'
import { Loading, Empty, FadeIn, Item } from '../components/Common.jsx'
import { countdown, fmtDue, PRIORITIES } from '../utils.js'

function defaultDue() {
  const d = new Date()
  d.setHours(23, 59, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`
}

const blank = () => ({
  title: '',
  course_id: null,
  due_date: defaultDue(),
  priority: 'medium',
  notes: '',
  completed: false,
})

export default function Assignments() {
  const [items, setItems] = useState(null)
  const [courses, setCourses] = useState([])
  const [filter, setFilter] = useState('open') // all/open/done
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  async function load() {
    const [a, c] = await Promise.all([api.assignments.list(), api.courses.list()])
    setItems(a)
    setCourses(c)
  }
  useEffect(() => {
    load()
  }, [])

  async function toggle(a) {
    await api.assignments.update(a.id, { completed: !a.completed })
    load()
  }
  function openNew() {
    setEditing(blank())
    setOpen(true)
  }
  function openEdit(a) {
    setEditing({
      ...a,
      due_date: a.due_date.slice(0, 16),
      course_id: a.course_id ?? null,
    })
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault()
    const body = {
      ...editing,
      course_id: editing.course_id || null,
    }
    if (editing.id) await api.assignments.update(editing.id, body)
    else await api.assignments.create(body)
    setOpen(false)
    load()
  }
  async function remove(a) {
    await api.assignments.remove(a.id)
    load()
  }

  if (!items) return <Loading />

  const filtered = items.filter((a) =>
    filter === 'all' ? true : filter === 'open' ? !a.completed : a.completed,
  )
  const openCount = items.filter((a) => !a.completed).length

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">deadlines</div>
          <h1 className="page-title">
            作业 <span className="accent">提醒</span>
          </h1>
          <p className="page-sub">{openCount} 个未完成 · 按截止时间排序</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 新增作业
        </button>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {[
            ['open', '未完成'],
            ['all', '全部'],
            ['done', '已完成'],
          ].map(([k, label]) => (
            <button
              key={k}
              className={filter === k ? 'active' : ''}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <Empty icon="🎯">这里空空如也</Empty>
        </div>
      ) : (
        <FadeIn className="card">
          {filtered.map((a, i) => {
            const cd = countdown(a.due_date)
            return (
              <Item className="row" key={a.id} index={i}>
                <input
                  type="checkbox"
                  className="check"
                  checked={a.completed}
                  onChange={() => toggle(a)}
                />
                <div className="grow">
                  <div className={`row-title ${a.completed ? 'done-text' : ''}`}>
                    {a.title}
                  </div>
                  <div className="row-meta">
                    {a.course && (
                      <span style={{ color: a.course.color, fontWeight: 600 }}>
                        {a.course.name}
                      </span>
                    )}
                    <span>{fmtDue(a.due_date)}</span>
                    <span className={`badge ${a.priority}`}>
                      {PRIORITIES[a.priority]}优先级
                    </span>
                    {a.notes && <span>· {a.notes}</span>}
                  </div>
                </div>
                {!a.completed && (
                  <span className={`countdown ${cd.level}`}>{cd.text}</span>
                )}
                <button className="icon-btn" onClick={() => openEdit(a)} title="编辑">
                  ✎
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => remove(a)}
                  title="删除"
                >
                  🗑
                </button>
              </Item>
            )
          })}
        </FadeIn>
      )}

      <Modal
        open={open}
        title={editing?.id ? '编辑作业' : '新增作业'}
        onClose={() => setOpen(false)}
      >
        {editing && (
          <form onSubmit={save}>
            <div className="field">
              <label>作业标题</label>
              <input
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="例如：算法第三章习题"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>关联课程</label>
                <select
                  value={editing.course_id ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      course_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
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
                <label>优先级</label>
                <select
                  value={editing.priority}
                  onChange={(e) =>
                    setEditing({ ...editing, priority: e.target.value })
                  }
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>截止时间</label>
              <input
                type="datetime-local"
                required
                value={editing.due_date}
                onChange={(e) =>
                  setEditing({ ...editing, due_date: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>备注</label>
              <textarea
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                placeholder="重点 / 提交要求…"
              />
            </div>
            <div className="modal-actions">
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
