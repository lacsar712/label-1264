<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  ElCard,
  ElCol,
  ElRow,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTabs,
  ElTabPane,
  ElIcon,
  ElAvatar,
  ElEmpty,
} from 'element-plus'
import {
  Trophy,
  Medal,
  Rank,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  Files,
  CircleCheck,
  Refresh,
} from '@element-plus/icons-vue'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import {
  BLUE_50,
  DEFAULT_AVATAR_COLOR,
  GREEN_500,
  PURPLE_500,
  RED_500,
  SLATE_100,
  SLATE_500,
} from '../lib/themeColors'

const { isAdmin, state } = useAuth()
const loading = ref(false)
const activeTab = ref('studyTime')
const leaderboardData = ref(null)

const mockLeaderboardData = {
  grade: '高三',
  weekRange: '2026-06-15 ~ 2026-06-21',
  rankings: {
    studyTime: [
      { rank: 1, userId: 'u001', name: '张明远', studyMinutes: 1860, completedResources: 42, accuracy: 92.5, avatarColor: '#ef4444' },
      { rank: 2, userId: 'u002', name: '李思琪', studyMinutes: 1720, completedResources: 38, accuracy: 88.2, avatarColor: '#f97316' },
      { rank: 3, userId: 'u003', name: '王浩然', studyMinutes: 1650, completedResources: 35, accuracy: 90.1, avatarColor: '#eab308' },
      { rank: 4, userId: 'u004', name: '刘雨萱', studyMinutes: 1580, completedResources: 32, accuracy: 85.7, avatarColor: '#22c55e' },
      { rank: 5, userId: 'u005', name: '陈子轩', studyMinutes: 1490, completedResources: 30, accuracy: 87.3, avatarColor: '#06b6d4' },
      { rank: 6, userId: 'u006', name: '杨紫涵', studyMinutes: 1420, completedResources: 28, accuracy: 83.6, avatarColor: '#3b82f6' },
      { rank: 7, userId: 'u007', name: '赵文博', studyMinutes: 1380, completedResources: 27, accuracy: 81.9, avatarColor: '#8b5cf6' },
      { rank: 8, userId: 'u008', name: '黄诗涵', studyMinutes: 1320, completedResources: 25, accuracy: 84.2, avatarColor: '#ec4899' },
      { rank: 9, userId: 'u009', name: '周俊杰', studyMinutes: 1260, completedResources: 24, accuracy: 79.8, avatarColor: '#ef4444' },
      { rank: 10, userId: 'u010', name: '吴佳怡', studyMinutes: 1180, completedResources: 22, accuracy: 82.5, avatarColor: '#f97316' },
      { rank: 11, userId: 'u011', name: '郑浩然', studyMinutes: 1120, completedResources: 21, accuracy: 80.1, avatarColor: '#eab308' },
      { rank: 12, userId: 'u012', name: '孙雨萱', studyMinutes: 1050, completedResources: 19, accuracy: 78.7, avatarColor: '#22c55e' },
      { rank: 13, userId: 'u013', name: '马子轩', studyMinutes: 980, completedResources: 18, accuracy: 77.3, avatarColor: '#06b6d4' },
      { rank: 14, userId: 'u014', name: '朱梓涵', studyMinutes: 920, completedResources: 16, accuracy: 75.6, avatarColor: '#3b82f6' },
      { rank: 15, userId: 'u015', name: '胡文博', studyMinutes: 860, completedResources: 15, accuracy: 73.9, avatarColor: '#8b5cf6' },
    ],
    completedResources: [
      { rank: 1, userId: 'u002', name: '李思琪', studyMinutes: 1720, completedResources: 38, accuracy: 88.2, avatarColor: '#f97316' },
      { rank: 2, userId: 'u001', name: '张明远', studyMinutes: 1860, completedResources: 42, accuracy: 92.5, avatarColor: '#ef4444' },
      { rank: 3, userId: 'u005', name: '陈子轩', studyMinutes: 1490, completedResources: 30, accuracy: 87.3, avatarColor: '#06b6d4' },
      { rank: 4, userId: 'u003', name: '王浩然', studyMinutes: 1650, completedResources: 35, accuracy: 90.1, avatarColor: '#eab308' },
      { rank: 5, userId: 'u004', name: '刘雨萱', studyMinutes: 1580, completedResources: 32, accuracy: 85.7, avatarColor: '#22c55e' },
      { rank: 6, userId: 'u006', name: '杨紫涵', studyMinutes: 1420, completedResources: 28, accuracy: 83.6, avatarColor: '#3b82f6' },
      { rank: 7, userId: 'u007', name: '赵文博', studyMinutes: 1380, completedResources: 27, accuracy: 81.9, avatarColor: '#8b5cf6' },
      { rank: 8, userId: 'u009', name: '周俊杰', studyMinutes: 1260, completedResources: 24, accuracy: 79.8, avatarColor: '#ef4444' },
      { rank: 9, userId: 'u008', name: '黄诗涵', studyMinutes: 1320, completedResources: 25, accuracy: 84.2, avatarColor: '#ec4899' },
      { rank: 10, userId: 'u011', name: '郑浩然', studyMinutes: 1120, completedResources: 21, accuracy: 80.1, avatarColor: '#eab308' },
      { rank: 11, userId: 'u010', name: '吴佳怡', studyMinutes: 1180, completedResources: 22, accuracy: 82.5, avatarColor: '#f97316' },
      { rank: 12, userId: 'u013', name: '马子轩', studyMinutes: 980, completedResources: 18, accuracy: 77.3, avatarColor: '#06b6d4' },
      { rank: 13, userId: 'u012', name: '孙雨萱', studyMinutes: 1050, completedResources: 19, accuracy: 78.7, avatarColor: '#22c55e' },
      { rank: 14, userId: 'u015', name: '胡文博', studyMinutes: 860, completedResources: 15, accuracy: 73.9, avatarColor: '#8b5cf6' },
      { rank: 15, userId: 'u014', name: '朱梓涵', studyMinutes: 920, completedResources: 16, accuracy: 75.6, avatarColor: '#3b82f6' },
    ],
    accuracy: [
      { rank: 1, userId: 'u001', name: '张明远', studyMinutes: 1860, completedResources: 42, accuracy: 92.5, avatarColor: '#ef4444' },
      { rank: 2, userId: 'u003', name: '王浩然', studyMinutes: 1650, completedResources: 35, accuracy: 90.1, avatarColor: '#eab308' },
      { rank: 3, userId: 'u002', name: '李思琪', studyMinutes: 1720, completedResources: 38, accuracy: 88.2, avatarColor: '#f97316' },
      { rank: 4, userId: 'u005', name: '陈子轩', studyMinutes: 1490, completedResources: 30, accuracy: 87.3, avatarColor: '#06b6d4' },
      { rank: 5, userId: 'u004', name: '刘雨萱', studyMinutes: 1580, completedResources: 32, accuracy: 85.7, avatarColor: '#22c55e' },
      { rank: 6, userId: 'u008', name: '黄诗涵', studyMinutes: 1320, completedResources: 25, accuracy: 84.2, avatarColor: '#ec4899' },
      { rank: 7, userId: 'u006', name: '杨紫涵', studyMinutes: 1420, completedResources: 28, accuracy: 83.6, avatarColor: '#3b82f6' },
      { rank: 8, userId: 'u010', name: '吴佳怡', studyMinutes: 1180, completedResources: 22, accuracy: 82.5, avatarColor: '#f97316' },
      { rank: 9, userId: 'u007', name: '赵文博', studyMinutes: 1380, completedResources: 27, accuracy: 81.9, avatarColor: '#8b5cf6' },
      { rank: 10, userId: 'u011', name: '郑浩然', studyMinutes: 1120, completedResources: 21, accuracy: 80.1, avatarColor: '#eab308' },
      { rank: 11, userId: 'u009', name: '周俊杰', studyMinutes: 1260, completedResources: 24, accuracy: 79.8, avatarColor: '#ef4444' },
      { rank: 12, userId: 'u012', name: '孙雨萱', studyMinutes: 1050, completedResources: 19, accuracy: 78.7, avatarColor: '#22c55e' },
      { rank: 13, userId: 'u013', name: '马子轩', studyMinutes: 980, completedResources: 18, accuracy: 77.3, avatarColor: '#06b6d4' },
      { rank: 14, userId: 'u014', name: '朱梓涵', studyMinutes: 920, completedResources: 16, accuracy: 75.6, avatarColor: '#3b82f6' },
      { rank: 15, userId: 'u015', name: '胡文博', studyMinutes: 860, completedResources: 15, accuracy: 73.9, avatarColor: '#8b5cf6' },
    ],
  },
  currentUser: {
    userId: 'u007',
    name: '赵文博',
    ranks: {
      studyTime: 7,
      completedResources: 6,
      accuracy: 9,
    },
    lastWeekRanks: {
      studyTime: 9,
      completedResources: 8,
      accuracy: 11,
    },
    prevUserGap: {
      studyTime: 40,
      completedResources: 1,
      accuracy: 0.6,
    },
    avatarColor: '#8b5cf6',
  },
}

async function fetchLeaderboard() {
  loading.value = true
  try {
    const res = await api.get('/pages/leaderboard', { _skipErrorHandler: true })
    if (res.data.ok) {
      leaderboardData.value = res.data.data
    }
  } catch (e) {
    leaderboardData.value = mockLeaderboardData
  } finally {
    loading.value = false
  }
}

onMounted(fetchLeaderboard)

function maskName(name) {
  if (isAdmin.value) return name
  if (!name || name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}min`
  }
  return `${mins}min`
}

function getRankIcon(rank) {
  if (rank === 1) return Trophy
  if (rank === 2) return Medal
  if (rank === 3) return Rank
  return null
}

function getRankColor(rank) {
  if (rank === 1) return '#fbbf24'
  if (rank === 2) return '#9ca3af'
  if (rank === 3) return '#d97706'
  return '#64748b'
}

const currentRankList = computed(() => {
  if (!leaderboardData.value) return []
  return leaderboardData.value.rankings[activeTab.value] || []
})

const currentUserRank = computed(() => {
  if (!leaderboardData.value) return null
  return leaderboardData.value.currentUser.ranks[activeTab.value]
})

const currentUserLastWeekRank = computed(() => {
  if (!leaderboardData.value) return null
  return leaderboardData.value.currentUser.lastWeekRanks[activeTab.value]
})

const rankChange = computed(() => {
  if (currentUserLastWeekRank.value === null || currentUserRank.value === null) return 0
  return currentUserLastWeekRank.value - currentUserRank.value
})

const currentGap = computed(() => {
  if (!leaderboardData.value) return null
  return leaderboardData.value.currentUser.prevUserGap[activeTab.value]
})

const currentUserInfo = computed(() => {
  if (!leaderboardData.value) return null
  return leaderboardData.value.currentUser
})

function getGapText() {
  const gap = currentGap.value
  if (gap === null) return ''
  if (activeTab.value === 'studyTime') {
    return `${gap} 分钟`
  } else if (activeTab.value === 'completedResources') {
    return `${gap} 个资源`
  } else {
    return `${gap}%`
  }
}

function getCurrentValue() {
  const userId = currentUserInfo.value?.userId
  const list = currentRankList.value
  const user = list.find(item => item.userId === userId)
  if (!user) return '-'
  if (activeTab.value === 'studyTime') {
    return formatMinutes(user.studyMinutes)
  } else if (activeTab.value === 'completedResources') {
    return `${user.completedResources} 个`
  } else {
    return `${user.accuracy}%`
  }
}

function getUserRowBackground(userId) {
  return userId === state.user?.id ? BLUE_50 : 'transparent'
}

function getRankChangeColor() {
  if (rankChange.value > 0) return GREEN_500
  if (rankChange.value < 0) return RED_500
  return SLATE_500
}

function formatRankChange() {
  if (rankChange.value > 0) return `+${rankChange.value}`
  if (rankChange.value < 0) return String(rankChange.value)
  return '持平'
}

function getSortValue(row) {
  if (activeTab.value === 'studyTime') return row.studyMinutes
  if (activeTab.value === 'completedResources') return row.completedResources
  return row.accuracy
}

function getSortLabel() {
  if (activeTab.value === 'studyTime') return '学习时长'
  if (activeTab.value === 'completedResources') return '完成资源数'
  return '正确率'
}

function getSortUnit() {
  if (activeTab.value === 'studyTime') return 'min'
  if (activeTab.value === 'completedResources') return '个'
  return '%'
}
</script>

<template>
  <div class="leaderboard-page">
    <div style="padding: 16px 16px 120px">
      <ElRow :gutter="16">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
              <div style="display: flex; align-items: center; gap: 14px">
                <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0">
                  <el-icon :size="26"><Trophy /></el-icon>
                </div>
                <div>
                  <div style="font-weight: 800; font-size: 18px">学习排行榜</div>
                  <div style="font-size: 13px; opacity: 0.92; margin-top: 2px">
                    {{ leaderboardData?.grade || '高三' }}年级 · 本周 ({{ leaderboardData?.weekRange || '2026-06-15 ~ 2026-06-21' }})
                  </div>
                </div>
              </div>
              <el-button text style="color: white; padding: 6px 12px" @click="fetchLeaderboard">
                <el-icon style="margin-right: 4px"><Refresh /></el-icon>
                刷新数据
              </el-button>
            </div>
          </ElCard>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16" style="margin-top: 16px">
        <ElCol :span="24">
          <ElCard style="border-radius: 14px">
            <ElTabs v-model="activeTab" type="card" class="leaderboard-tabs">
              <ElTabPane label="学习时长" name="studyTime">
                <template #label>
                  <div style="display: flex; align-items: center; gap: 6px">
                    <el-icon><Clock /></el-icon>
                    <span>学习时长</span>
                  </div>
                </template>
              </ElTabPane>
              <ElTabPane label="资源完成数" name="completedResources">
                <template #label>
                  <div style="display: flex; align-items: center; gap: 6px">
                    <el-icon><Files /></el-icon>
                    <span>资源完成数</span>
                  </div>
                </template>
              </ElTabPane>
              <ElTabPane label="答题正确率" name="accuracy">
                <template #label>
                  <div style="display: flex; align-items: center; gap: 6px">
                    <el-icon><CircleCheck /></el-icon>
                    <span>答题正确率</span>
                  </div>
                </template>
              </ElTabPane>
            </ElTabs>

            <ElSkeleton :loading="loading" animated>
              <template v-if="currentRankList.length">
                <ElTable :data="currentRankList" size="default" class="rank-table" style="width: 100%">
                  <ElTableColumn label="排名" width="80" align="center">
                    <template #default="{ row }">
                      <div style="display: flex; align-items: center; justify-content: center">
                        <template v-if="row.rank <= 3">
                          <div
                            :style="{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: getRankColor(row.rank),
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 16,
                            }"
                          >
                            <el-icon><component :is="getRankIcon(row.rank)" /></el-icon>
                          </div>
                        </template>
                        <template v-else>
                          <div
                            :style="{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: SLATE_100,
                              color: SLATE_500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: 14,
                            }"
                          >
                            {{ row.rank }}
                          </div>
                        </template>
                      </div>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="学生" min-width="180">
                    <template #default="{ row }">
                      <div
                        :style="{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: getUserRowBackground(row.userId),
                          padding: '4px 8px',
                          borderRadius: '8px',
                          margin: '-4px -8px',
                        }"
                      >
                        <ElAvatar :size="36" :style="{ backgroundColor: row.avatarColor, fontWeight: 600 }">
                          {{ maskName(row.name).slice(0, 1) }}
                        </ElAvatar>
                        <div>
                          <div style="font-weight: 600; display: flex; align-items: center; gap: 6px">
                            {{ maskName(row.name) }}
                            <ElTag v-if="row.userId === state.user?.id" size="small" type="primary" effect="plain">我</ElTag>
                          </div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px">
                            学号: {{ row.userId }}
                          </div>
                        </div>
                      </div>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn :label="getSortLabel()" width="140" align="right">
                    <template #default="{ row }">
                      <div style="font-weight: 700; font-size: 16px; color: #1e293b">
                        <template v-if="activeTab === 'studyTime'">
                          {{ formatMinutes(row.studyMinutes) }}
                        </template>
                        <template v-else-if="activeTab === 'completedResources'">
                          {{ row.completedResources }} 个
                        </template>
                        <template v-else>
                          {{ row.accuracy }}%
                        </template>
                      </div>
                    </template>
                  </ElTableColumn>
                  <ElTableColumn label="其他指标" min-width="240">
                    <template #default="{ row }">
                      <div style="display: flex; flex-direction: column; gap: 4px">
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px">
                          <ElIcon style="color: #64748b"><Clock /></ElIcon>
                          <span style="color: #64748b">学习时长:</span>
                          <span style="font-weight: 500">{{ formatMinutes(row.studyMinutes) }}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px">
                          <ElIcon style="color: #64748b"><Files /></ElIcon>
                          <span style="color: #64748b">完成资源:</span>
                          <span style="font-weight: 500">{{ row.completedResources }} 个</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 12px">
                          <ElIcon style="color: #64748b"><CircleCheck /></ElIcon>
                          <span style="color: #64748b">正确率:</span>
                          <span style="font-weight: 500">{{ row.accuracy }}%</span>
                        </div>
                      </div>
                    </template>
                  </ElTableColumn>
                </ElTable>
              </template>
              <template v-else>
                <ElEmpty description="暂无排行数据" style="padding: 60px 0" />
              </template>
            </ElSkeleton>
          </ElCard>
        </ElCol>
      </ElRow>
    </div>

    <div class="current-user-bar">
      <ElCard shadow="never" :body-style="{ padding: '12px 16px' }" style="border-radius: 0">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0">
            <ElAvatar :size="44" :style="{ backgroundColor: currentUserInfo?.avatarColor || PURPLE_500, fontWeight: 600 }">
              {{ maskName(state.user?.name || '我').slice(0, 1) }}
            </ElAvatar>
            <div style="min-width: 0">
              <div style="font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px">
                {{ maskName(state.user?.name || '我') }}
                <ElTag size="small" type="primary">当前用户</ElTag>
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                <span>
                  <ElIcon style="vertical-align: middle; margin-right: 2px"><Clock /></ElIcon>
                  本周 {{ getSortLabel() }}: <span style="font-weight: 600; color: #1e293b">{{ getCurrentValue() }}</span>
                </span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap">
            <div style="text-align: center">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">当前排名</div>
              <div style="font-weight: 800; font-size: 22px; color: #2563eb">
                #{{ currentUserRank || '-' }}
              </div>
            </div>

            <div style="text-align: center">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">与上一名差距</div>
              <div style="font-weight: 600; font-size: 15px; color: #f59e0b">
                {{ currentGap !== null ? getGapText() : '-' }}
              </div>
            </div>

            <div style="text-align: center">
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">较上周变化</div>
              <div
                :style="{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  fontWeight: 700,
                  fontSize: 16,
                  color: getRankChangeColor(),
                }"
              >
                <el-icon v-if="rankChange > 0"><ArrowUp /></el-icon>
                <el-icon v-else-if="rankChange < 0"><ArrowDown /></el-icon>
                <el-icon v-else><Minus /></el-icon>
                <span>{{ formatRankChange() }}</span>
              </div>
            </div>
          </div>
        </div>
      </ElCard>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  min-height: 100%;
  position: relative;
}

.leaderboard-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.leaderboard-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.leaderboard-tabs :deep(.el-tabs__item) {
  border-radius: 10px !important;
  margin-right: 8px;
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
}

.leaderboard-tabs :deep(.el-tabs__item.is-active) {
  background: #2563eb !important;
  color: white !important;
  border-color: #2563eb !important;
}

.rank-table :deep(.el-table__row) {
  transition: background-color 0.2s;
}

.rank-table :deep(.el-table__row:hover) {
  background-color: #f8fafc;
}

.current-user-bar {
  position: fixed;
  bottom: 0;
  left: 240px;
  right: 0;
  z-index: 100;
  border-top: 1px solid #e2e8f0;
  background: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .current-user-bar {
    left: 0;
  }
}
</style>
