<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElScrollbar, ElBadge } from 'element-plus'
import {
  DataAnalysis,
  DataBoard,
  Files,
  Setting,
  User,
  TrendCharts,
  School,
  SwitchButton,
  Notebook,
  Bell,
  Message,
  Guide,
  EditPen,
  Histogram,
  Trophy,
  Calendar,
  UserFilled,
  Connection,
  ChatDotRound,
} from '@element-plus/icons-vue'

import ErrorBoundary from '../components/ErrorBoundary.vue'
import NotificationCenter from '../components/NotificationCenter.vue'
import { useAuth } from '../stores/auth'
import { useNotification } from '../lib/useNotification'

const route = useRoute()
const router = useRouter()
const { state, isAdmin, clearAuth } = useAuth()
const { unreadCount, fetchUnreadCount } = useNotification()

const active = computed(() => route.path)
const notificationVisible = ref(false)
let refreshTimer = null

function toggleNotification() {
  notificationVisible.value = !notificationVisible.value
}

function logout() {
  clearAuth()
  router.replace('/login')
}

onMounted(() => {
  if (state.token) {
    fetchUnreadCount()
    refreshTimer = setInterval(() => {
      fetchUnreadCount()
    }, 60000)
  }
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<template>
  <div class="app-shell">
    <el-container style="height: 100%">
      <el-aside width="240px" style="padding: 16px 12px">
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 12px">
          <School style="width: 20px; height: 20px; color: #2563eb" />
          <div style="font-weight: 700; letter-spacing: 0.2px">教学资源推荐</div>
        </div>

        <el-menu :default-active="active" router style="border-right: none">
          <el-menu-item index="/home">
            <el-icon><DataBoard /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/learning-path">
            <el-icon><Guide /></el-icon>
            <span>学习路径</span>
          </el-menu-item>
          <el-menu-item index="/resources">
            <el-icon><Files /></el-icon>
            <span>资源库</span>
          </el-menu-item>
          <el-menu-item index="/recommendation-analysis">
            <el-icon><DataAnalysis /></el-icon>
            <span>推荐分析</span>
          </el-menu-item>
          <el-menu-item index="/progress">
            <el-icon><TrendCharts /></el-icon>
            <span>学习进度</span>
          </el-menu-item>
          <el-menu-item index="/calendar">
            <el-icon><Calendar /></el-icon>
            <span>学习日历</span>
          </el-menu-item>
          <el-menu-item index="/leaderboard">
            <el-icon><Trophy /></el-icon>
            <span>学习排行榜</span>
          </el-menu-item>
          <el-menu-item index="/study-group">
            <el-icon><Connection /></el-icon>
            <span>学习小组</span>
          </el-menu-item>
          <el-menu-item index="/resource-qa">
            <el-icon><ChatDotRound /></el-icon>
            <span>资源问答</span>
          </el-menu-item>
          <el-menu-item :index="isAdmin ? '/admin/notes' : '/notes'">
            <el-icon><Notebook /></el-icon>
            <span>{{ isAdmin ? '笔记管理' : '学习笔记' }}</span>
          </el-menu-item>

          <el-menu-item index="/settings">
            <el-icon><UserFilled /></el-icon>
            <span>个人设置</span>
          </el-menu-item>

          <el-sub-menu index="/quiz-submenu">
            <template #title>
              <el-icon><EditPen /></el-icon>
              <span>自测练习</span>
            </template>
            <el-menu-item index="/quiz/create">
              <el-icon><EditPen /></el-icon>
              <span>发起自测</span>
            </el-menu-item>
            <el-menu-item index="/quiz/history">
              <el-icon><Histogram /></el-icon>
              <span>历史记录</span>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu v-if="isAdmin" index="/admin">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>管理员</span>
            </template>
            <el-menu-item index="/admin/users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/resources">
              <el-icon><Files /></el-icon>
              <span>资源管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/system">
              <el-icon><Setting /></el-icon>
              <span>系统配置</span>
            </el-menu-item>
            <el-menu-item index="/admin/notes">
              <el-icon><Notebook /></el-icon>
              <span>笔记管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/notifications">
              <el-icon><Message /></el-icon>
              <span>通知管理</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header height="56px" style="display: flex; align-items: center; justify-content: space-between">
          <div style="display: flex; align-items: baseline; gap: 10px">
            <div style="font-weight: 700">智能教学资源个性化推荐系统</div>
            <div style="font-size: 12px; color: #64748b">教育风格 · 全景数据</div>
          </div>

          <div style="display: flex; align-items: center; gap: 12px">
            <el-button
              text
              class="bell-btn"
              @click="toggleNotification"
            >
              <el-badge :value="unreadCount" :max="99" :hidden="unreadCount === 0" class="bell-badge">
                <el-icon :size="20"><Bell /></el-icon>
              </el-badge>
            </el-button>

            <el-dropdown>
              <div class="user-badge">
                <div class="user-avatar-sm" :style="{ backgroundColor: state.user?.avatarColor || '#2563eb' }">
                  {{ (state.user?.name || '?').charAt(0) }}
                </div>
                <span class="user-name-text">{{ state.user?.name || '未登录' }}</span>
                <SwitchButton style="width: 14px; height: 14px; color: #94a3b8" />
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>{{ state.user?.role === 'admin' ? '管理员' : '学习者' }}</el-dropdown-item>
                  <el-dropdown-item @click="$router.push('/settings')">个人设置</el-dropdown-item>
                  <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main style="padding: 0; height: calc(100vh - 56px)">
          <el-scrollbar class="page-scroll">
            <ErrorBoundary>
              <router-view />
            </ErrorBoundary>
          </el-scrollbar>
        </el-main>
      </el-container>
    </el-container>

    <NotificationCenter v-model:visible="notificationVisible" />
  </div>
</template>

<style scoped>
.bell-btn {
  color: #475569;
  padding: 6px 8px;
}

.bell-btn:hover {
  color: #2563eb;
  background-color: #eff6ff;
}

.bell-badge :deep(.el-badge__content) {
  top: 4px;
  right: 2px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
}

.user-badge:hover {
  background-color: #f1f5f9;
}

.user-avatar-sm {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.user-name-text {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
