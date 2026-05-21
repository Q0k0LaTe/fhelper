// 与 FastAPI 后端通信的薄封装。开发环境经 Vite 代理到 :8000。
const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail || detail
    } catch {
      /* 忽略 */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

const crud = (resource) => ({
  list: (qs = '') => request(`/${resource}${qs}`),
  create: (body) => request(`/${resource}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/${resource}/${id}`, { method: 'DELETE' }),
})

export const api = {
  dashboard: () => request('/dashboard'),
  courses: crud('courses'),
  assignments: crud('assignments'),
  todos: crud('todos'),
  favorites: crud('favorites'),
  study: {
    ...crud('study'),
    stats: (offset = 0) => request(`/study/stats?offset=${offset}`),
  },
  chat: {
    send: (messages) =>
      request('/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
    status: () => request('/chat/status'),
  },
}
