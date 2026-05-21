import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Dashboard from './pages/Dashboard.jsx'
import Schedule from './pages/Schedule.jsx'
import Assignments from './pages/Assignments.jsx'
import Todos from './pages/Todos.jsx'
import Favorites from './pages/Favorites.jsx'
import StudyStats from './pages/StudyStats.jsx'
import Assistant from './pages/Assistant.jsx'

const NAV = [
  { key: 'home', label: '今日', icon: '☀️', Comp: Dashboard },
  { key: 'assistant', label: 'AI 助手', icon: '🤖', Comp: Assistant },
  { key: 'schedule', label: '课程表', icon: '🗓️', Comp: Schedule },
  { key: 'assignments', label: '作业', icon: '📌', Comp: Assignments },
  { key: 'todos', label: '待办', icon: '✅', Comp: Todos },
  { key: 'favorites', label: '收藏', icon: '⭐', Comp: Favorites },
  { key: 'study', label: '学习统计', icon: '📈', Comp: StudyStats },
]

const VALID = NAV.map((n) => n.key)
const tabFromHash = () => {
  const h = window.location.hash.replace('#', '')
  return VALID.includes(h) ? h : 'home'
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const Active = NAV.find((n) => n.key === tab).Comp

  // 与地址栏 hash 双向同步：刷新保留当前页，链接可分享
  useEffect(() => {
    window.location.hash = tab
  }, [tab])
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">校园手账</span>
          <span className="brand-sub">campus</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${tab === n.key ? 'active' : ''}`}
              onClick={() => setTab(n.key)}
            >
              {tab === n.key && (
                <motion.span layoutId="nav-dot" className="nav-dot" />
              )}
              <span className="nav-ico">{n.icon}</span>
              <span className="label">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          记录每一天的课程、作业与心情 ☕
        </div>
      </aside>

      <main className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Active goTo={setTab} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
