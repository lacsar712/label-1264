import { computed, reactive } from 'vue'
import { api } from './api'

const state = reactive({
  list: [],
  unreadCount: 0,
  unreadByType: { system: 0, recommendation: 0, homework: 0 },
  loading: false,
})

export function useNotification() {
  async function fetchNotifications(type) {
    state.loading = true
    try {
      const res = await api.get('/actions/notifications', {
        params: type ? { type } : {},
      })
      state.list = res.data.data.list
      state.unreadCount = res.data.data.unreadCount
      return res.data.data
    } finally {
      state.loading = false
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await api.get('/actions/notifications/unread-count')
      state.unreadCount = res.data.data.total
      state.unreadByType = res.data.data.byType
      return res.data.data
    } catch (e) {
      // ignore
    }
  }

  async function markAsRead(notificationId) {
    await api.post(`/actions/notifications/${notificationId}/read`)
    const item = state.list.find((x) => x.id === notificationId)
    if (item && !item.isRead) {
      item.isRead = true
      state.unreadCount = Math.max(0, state.unreadCount - 1)
      if (state.unreadByType[item.type] > 0) {
        state.unreadByType[item.type]--
      }
    }
  }

  async function markAllAsRead() {
    await api.post('/actions/notifications/read-all')
    state.list.forEach((item) => {
      item.isRead = true
    })
    state.unreadCount = 0
    state.unreadByType = { system: 0, recommendation: 0, homework: 0 }
  }

  async function deleteNotification(notificationId) {
    await api.delete(`/actions/notifications/${notificationId}`)
    const idx = state.list.findIndex((x) => x.id === notificationId)
    if (idx >= 0) {
      const item = state.list[idx]
      if (!item.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1)
        if (state.unreadByType[item.type] > 0) {
          state.unreadByType[item.type]--
        }
      }
      state.list.splice(idx, 1)
    }
  }

  async function clearRead() {
    await api.delete('/actions/notifications/clear-read')
    state.list = state.list.filter((x) => !x.isRead)
  }

  const systemNotifications = computed(() =>
    state.list.filter((x) => x.type === 'system')
  )
  const recommendationNotifications = computed(() =>
    state.list.filter((x) => x.type === 'recommendation')
  )
  const homeworkNotifications = computed(() =>
    state.list.filter((x) => x.type === 'homework')
  )

  return {
    state,
    unreadCount: computed(() => state.unreadCount),
    unreadByType: computed(() => state.unreadByType),
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearRead,
    systemNotifications,
    recommendationNotifications,
    homeworkNotifications,
  }
}
