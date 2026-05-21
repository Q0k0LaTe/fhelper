import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api.js'

// 示例提示，空状态时给用户灵感
const SUGGESTIONS = [
  '这周还有哪些 deadline？紧不紧张？',
  '周三下午 2 点加一节《机器学习》，在三教 305',
  '按我的作业 deadline，帮我规划这周复习时间',
  '加个待办：明天去图书馆还书',
]

// entity → 对应页面 tab + 图标
const ENTITY = {
  course: { icon: '🗓️', tab: 'schedule' },
  assignment: { icon: '📌', tab: 'assignments' },
  todo: { icon: '✅', tab: 'todos' },
  favorite: { icon: '⭐', tab: 'favorites' },
  study: { icon: '📈', tab: 'study' },
}

export default function Assistant({ goTo }) {
  const [messages, setMessages] = useState([]) // {role, content, actions?}
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null) // {configured, model}
  const logRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    // 状态查询带重试：Render 免费实例冷启动时首个请求可能 404/超时，
    // 不能据此误判“未配置”——只有后端明确返回 configured:false 才提示。
    async function check(triesLeft) {
      try {
        const s = await api.chat.status()
        if (!cancelled) setConfig(s)
      } catch {
        // 拿不到状态时保持 config=null（不显示横幅），并隔几秒重试
        if (triesLeft > 0 && !cancelled) setTimeout(() => check(triesLeft - 1), 2500)
      }
    }
    check(3)
    return () => {
      cancelled = true
    }
  }, [])

  // 新消息 / 思考中 时滚到底部
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    setError('')
    if (taRef.current) taRef.current.style.height = 'auto'
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      const payload = next.map(({ role, content }) => ({ role, content }))
      const res = await api.chat.send(payload)
      setMessages([
        ...next,
        { role: 'assistant', content: res.reply, actions: res.actions || [] },
      ])
    } catch (e) {
      setError(e.message || '出错了，稍后再试')
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function onInput(e) {
    setInput(e.target.value)
    const el = taRef.current
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  const empty = messages.length === 0

  return (
    <div className="chat">
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="eyebrow">campus ai</div>
          <h1 className="page-title">
            AI <span className="accent">助手</span>
          </h1>
          <p className="page-sub">
            告诉我你的安排，我会读懂你的现状、帮你记下来、还能排复习计划
            {config?.configured && config.model ? ` · ${config.model}` : ''}
          </p>
        </div>
      </div>

      {config && !config.configured && (
        <div className="ai-banner">
          ⚙️ 还没接上模型。把 <code>backend/.env.example</code> 复制为{' '}
          <code>.env</code> 并填入 <code>LLM_API_KEY</code>（Kimi 密钥），重启后端即可对话。
          现在仍可浏览界面。
        </div>
      )}

      <div className="chat-log" ref={logRef}>
        {empty ? (
          <div className="chat-welcome">
            <div className="cw-emoji">🦊</div>
            <p className="cw-title">嗨，我是你的校园助手</p>
            <p className="cw-sub">试着这样跟我说：</p>
            <div className="chat-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggest-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <motion.div
              key={i}
              className={`msg ${m.role}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`bubble ${m.role}`}>
                {m.content && <div className="bubble-text">{m.content}</div>}
                {m.actions?.length > 0 && (
                  <div className="ai-actions">
                    {m.actions.map((a, j) => {
                      const meta = ENTITY[a.entity]
                      return (
                        <button
                          key={j}
                          className="action-chip"
                          onClick={() => meta?.tab && goTo(meta.tab)}
                          title={meta?.tab ? '去看看' : ''}
                        >
                          <span className="ac-ico">{meta?.icon || '✅'}</span>
                          <span className="ac-label">{a.label}</span>
                          {meta?.tab && <span className="ac-go">查看 ›</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}

        {loading && (
          <div className="msg assistant">
            <div className="bubble assistant typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        {error && <div className="chat-error">⚠️ {error}</div>}
      </div>

      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={taRef}
          className="chat-input"
          rows={1}
          placeholder="想加点什么、或让我帮你规划…（Enter 发送，Shift+Enter 换行）"
          value={input}
          onChange={onInput}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          className="btn btn-primary chat-send"
          disabled={loading || !input.trim()}
        >
          {loading ? '思考中' : '发送'}
        </button>
      </form>
    </div>
  )
}
