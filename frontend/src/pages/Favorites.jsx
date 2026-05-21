import { useEffect, useState } from 'react'
import { api } from '../api.js'
import Modal from '../components/Modal.jsx'
import { Loading, Empty, FadeIn, Item } from '../components/Common.jsx'
import { CATEGORIES } from '../utils.js'

const blank = () => ({
  name: '',
  category: 'canteen',
  location: '',
  note: '',
  rating: 5,
})

function Stars({ value, onChange }) {
  return (
    <div className="stars" style={{ fontSize: 24, cursor: onChange ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= value ? '' : 'off'}
          onClick={onChange ? () => onChange(n) : undefined}
        >
          {n <= value ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

export default function Favorites() {
  const [items, setItems] = useState(null)
  const [cat, setCat] = useState('all')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  async function load() {
    setItems(await api.favorites.list())
  }
  useEffect(() => {
    load()
  }, [])

  function openNew() {
    setEditing(blank())
    setOpen(true)
  }
  function openEdit(f) {
    setEditing({ ...f })
    setOpen(true)
  }
  async function save(e) {
    e.preventDefault()
    if (editing.id) await api.favorites.update(editing.id, editing)
    else await api.favorites.create(editing)
    setOpen(false)
    load()
  }
  async function remove(f) {
    await api.favorites.remove(f.id)
    load()
  }

  if (!items) return <Loading />

  const filtered = cat === 'all' ? items : items.filter((f) => f.category === cat)

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">favorites</div>
          <h1 className="page-title">
            我的<span className="accent">收藏</span>
          </h1>
          <p className="page-sub">食堂 · 咖啡店 · 图书馆，校园里的私藏好去处</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          ＋ 新增收藏
        </button>
      </div>

      <div className="toolbar">
        <div className="segmented">
          <button className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}>
            全部
          </button>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <button key={k} className={cat === k ? 'active' : ''} onClick={() => setCat(k)}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <Empty icon="⭐">还没有收藏，点右上角添加一个</Empty>
        </div>
      ) : (
        <FadeIn className="grid grid-3">
          {filtered.map((f, i) => (
            <Item className="fav-card" key={f.id} index={i}>
              <span className="fav-cat">{CATEGORIES[f.category]?.icon}</span>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 17, paddingRight: 24 }}>
                {f.name}
              </div>
              <Stars value={f.rating} />
              {f.location && <div className="row-meta">📍 {f.location}</div>}
              {f.note && (
                <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{f.note}</div>
              )}
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button className="icon-btn" onClick={() => openEdit(f)} title="编辑">
                  ✎
                </button>
                <button className="icon-btn danger" onClick={() => remove(f)} title="删除">
                  🗑
                </button>
              </div>
            </Item>
          ))}
        </FadeIn>
      )}

      <Modal
        open={open}
        title={editing?.id ? '编辑收藏' : '新增收藏'}
        onClose={() => setOpen(false)}
      >
        {editing && (
          <form onSubmit={save}>
            <div className="field">
              <label>名称</label>
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="例如：第一食堂麻辣香锅"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>类别</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.icon} {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>地点</label>
                <input
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  placeholder="一食堂 2F"
                />
              </div>
            </div>
            <div className="field">
              <label>评分</label>
              <Stars
                value={editing.rating}
                onChange={(n) => setEditing({ ...editing, rating: n })}
              />
            </div>
            <div className="field">
              <label>备注</label>
              <textarea
                value={editing.note}
                onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                placeholder="推荐理由 / 营业时间…"
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
