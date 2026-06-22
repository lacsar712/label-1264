<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  ElButton,
  ElTabs,
  ElTabPane,
  ElEmpty,
  ElBadge,
  ElPopconfirm,
  ElMessage,
  ElScrollbar,
} from 'element-plus'
import { Bell, Check, Delete, Reading, Promotion, Edit } from '@element-plus/icons-vue'
import { useNotification } from '../lib/useNotification'

const props = defineProps({
  visible: Boolean,
})

const emit = defineEmits(['update:visible'])

const {
  state,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearRead,
  unreadByType,
} = useNotification()

const activeTab = ref('all')

const tabs = [
  { name: 'all', label: '全部', type: null, icon: Bell, color: '#2563eb' },
  { name: 'system', label: '系统公告', type: 'system', icon: Bell, color: '#ef4444' },
  { name: 'recommendation', label: '推荐变动', type: 'recommendation', icon: Promotion, color: '#10b981' },
  { name: 'homework', label: '作业提醒', type: 'homework', icon: Edit, color: '#f59e0b' },
]

const filteredList = computed(() => {
  if (activeTab.value === 'all') return state.list
  return state.list.filter((item) => item.type === activeTab.value)
})

const currentUnreadCount = computed(() => {
  if (activeTab.value === 'all') return state.unreadCount
  return unreadByType.value[activeTab.value] || 0
})

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

function getTypeInfo(type) {
  return tabs.find((t) => t.type === type) || tabs[0]
}

async function handleMarkRead(item) {
  if (item.isRead) return
  await markAsRead(item.id)
}

async function handleMarkAll() {
  if (state.unreadCount === 0) {
    ElMessage.info('没有未读消息')
    return
  }
  await markAllAsRead()
  ElMessage.success('已全部标记为已读')
}

async function handleDelete(item) {
  await deleteNotification(item.id)
  ElMessage.success('已删除')
}

async function handleClearRead() {
  const hasRead = state.list.some((x) => x.isRead)
  if (!hasRead) {
    ElMessage.info('没有已读消息可清理')
    return
  }
  await clearRead()
  ElMessage.success('已清理已读消息')
}

function handleLinkClick(item) {
  if (!item.isRead) {
    markAsRead(item.id)
  }
  if (item.linkUrl) {
    if (item.linkUrl.startsWith('http')) {
      window.open(item.linkUrl, '_blank')
    } else {
      location.href = item.linkUrl
    }
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      fetchNotifications()
      fetchUnreadCount()
    } else {
      fetchUnreadCount()
    }
  }
)

onMounted(() => {
  if (props.visible) {
    fetchNotifications()
  }
})
</script>

<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="emit('update:visible', $event)"
    title="消息通知"
    direction="rtl"
    size="420px"
    :with-header="false"
  >
    <div class="notification-drawer">
      <div class="drawer-header">
        <div style="display: flex; align-items: center; gap: 10px">
          <el-icon :size="20" color="#2563eb"><Bell /></el-icon>
          <div style="font-weight: 700; font-size: 16px">消息通知</div>
        </div>
        <div class="header-actions">
          <el-button size="small" @click="handleMarkAll">
            <el-icon><Check /></el-icon>
            <span>全部已读</span>
          </el-button>
          <el-button size="small" type="danger" plain @click="handleClearRead">
            <el-icon><Delete /></el-icon>
            <span>清理已读</span>
          </el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="notification-tabs">
        <el-tab-pane v-for="tab in tabs" :key="tab.name" :name="tab.name">
          <template #label>
            <div style="display: flex; align-items: center; gap: 6px">
              <span>{{ tab.label }}</span>
              <el-badge
                v-if="tab.name === 'all' ? state.unreadCount > 0 : (unreadByType[tab.name] || 0) > 0"
                :value="tab.name === 'all' ? state.unreadCount : unreadByType[tab.name]"
                :max="99"
                class="tab-badge"
              />
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>

      <el-scrollbar class="notification-list">
        <el-empty v-if="filteredList.length === 0" description="暂无消息" />
        <div v-else class="notification-items">
          <div
            v-for="item in filteredList"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.isRead }"
            @click="handleMarkRead(item)"
          >
            <div class="item-left">
              <div
                class="type-icon"
                :style="{ backgroundColor: getTypeInfo(item.type).color + '15', color: getTypeInfo(item.type).color }"
              >
                <el-icon><component :is="getTypeInfo(item.type).icon" /></el-icon>
              </div>
              <div v-if="!item.isRead" class="unread-dot"></div>
            </div>

            <div class="item-content" style="flex: 1">
              <div class="item-header">
                <span class="item-title" :class="{ 'unread-title': !item.isRead }">{{ item.title }}</span>
                <span class="item-time">{{ formatTime(item.createdAt) }}</span>
              </div>
              <div class="item-body">{{ item.content }}</div>
              <div v-if="item.linkUrl" class="item-link" @click.stop="handleLinkClick(item)">
                <span>{{ item.linkText || '查看详情' }}</span>
                <el-icon><Reading /></el-icon>
              </div>
            </div>

            <div class="item-actions">
              <el-popconfirm
                title="确认删除这条消息？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                @confirm="handleDelete(item)"
              >
                <template #reference>
                  <el-button text type="danger" size="small" @click.stop>
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<style scoped>
.notification-drawer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.notification-tabs {
  padding: 0 12px;
}

.notification-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.tab-badge {
  margin-left: 0;
}

.notification-list {
  flex: 1;
  padding: 8px 12px 20px;
}

.notification-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.notification-item:hover {
  background: #f1f5f9;
}

.notification-item.unread {
  background: #eff6ff;
  border: 1px solid #dbeafe;
}

.notification-item.unread:hover {
  background: #dbeafe;
}

.item-left {
  position: relative;
  flex-shrink: 0;
}

.type-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #eff6ff;
}

.item-content {
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.item-title {
  font-weight: 600;
  font-size: 14px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-title {
  color: #1e293b;
  font-weight: 700;
}

.item-time {
  font-size: 12px;
  color: #94a3b8;
  flex-shrink: 0;
}

.item-body {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #2563eb;
  font-weight: 500;
}

.item-link:hover {
  color: #1d4ed8;
}

.item-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-item:hover .item-actions {
  opacity: 1;
}
</style>
