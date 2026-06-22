<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElAvatar,
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElEmpty,
  ElPopconfirm,
  ElRow,
  ElSkeleton,
  ElNotification,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus'
import {
  Star,
  UserFilled,
  SwitchButton,
  Remove,
  Connection,
  Clock,
  Trophy,
} from '@element-plus/icons-vue'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import EChart from '../components/EChart.vue'

const route = useRoute()
const router = useRouter()
const { state } = useAuth()

const loading = ref(false)
const detail = ref(null)
const showTransferDialog = ref(false)
const transferTargetId = ref(null)
const actionLoading = ref(false)

const groupId = computed(() => route.params.groupId)

async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.get(`/pages/study-groups/${groupId.value}`)
    if (res.data.ok) {
      detail.value = res.data.data
    }
  } catch {
    ElNotification({ title: '无权访问', message: '您不是该小组成员，无法查看详情', type: 'error', duration: 2500 })
    router.replace('/study-group')
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)

const isLeader = computed(() => detail.value?.myRole === 'leader')

const chartOption = computed(() => {
  if (!detail.value?.stats?.length) return {}
  const stats = detail.value.stats
  const names = stats.map((s) => s.name)
  const studyMinutes = stats.map((s) => s.studyMinutes)
  const completedCount = stats.map((s) => s.weeklyCompletedResources)

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['本周学习时长(min)', '本周完成资源数'], top: 0 },
    grid: { left: 60, right: 30, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { fontSize: 11, rotate: names.length > 6 ? 30 : 0 },
    },
    yAxis: [
      { type: 'value', name: '分钟', nameTextStyle: { fontSize: 11 } },
      { type: 'value', name: '个', nameTextStyle: { fontSize: 11 } },
    ],
    series: [
      {
        name: '本周学习时长(min)',
        type: 'bar',
        data: studyMinutes,
        barMaxWidth: 32,
        itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '本周完成资源数',
        type: 'bar',
        yAxisIndex: 1,
        data: completedCount,
        barMaxWidth: 32,
        itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
})

function formatMinutes(m) {
  if (!m) return '0min'
  const h = Math.floor(m / 60)
  const min = m % 60
  return h > 0 ? `${h}h ${min}min` : `${min}min`
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}小时前`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function activityIcon(type) {
  switch (type) {
    case 'create': return '🏆'
    case 'join': return '👋'
    case 'leave': return '🚪'
    case 'remove': return '❌'
    case 'transfer': return '🔄'
    default: return '📝'
  }
}

async function handleLeave() {
  actionLoading.value = true
  try {
    const res = await api.post(`/actions/study-groups/${groupId.value}/leave`)
    if (res.data.ok) {
      ElNotification({ title: '已退出', message: '您已退出该学习小组', type: 'success', duration: 2000 })
      router.replace('/study-group')
    }
  } catch {
  } finally {
    actionLoading.value = false
  }
}

async function handleRemove(targetUserId, targetName) {
  actionLoading.value = true
  try {
    const res = await api.post(`/actions/study-groups/${groupId.value}/remove-member`, { targetUserId })
    if (res.data.ok) {
      ElNotification({ title: '已移除', message: `已将 ${targetName} 移出小组`, type: 'success', duration: 2000 })
      fetchDetail()
    }
  } catch {
  } finally {
    actionLoading.value = false
  }
}

function openTransferDialog(targetUserId) {
  transferTargetId.value = targetUserId
  showTransferDialog.value = true
}

async function handleTransfer() {
  if (!transferTargetId.value) return
  actionLoading.value = true
  try {
    const res = await api.post(`/actions/study-groups/${groupId.value}/transfer-leader`, {
      targetUserId: transferTargetId.value,
    })
    if (res.data.ok) {
      ElNotification({ title: '转让成功', message: '组长权限已转让', type: 'success', duration: 2000 })
      showTransferDialog.value = false
      fetchDetail()
    }
  } catch {
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <div class="study-group-detail-page">
    <ElSkeleton :loading="loading" animated>
      <template v-if="detail">
        <ElRow :gutter="16">
          <ElCol :span="24">
            <ElCard class="panel-card header-card">
              <div class="header-main">
                <div class="header-left">
                  <div class="group-icon-lg">
                    <el-icon :size="28"><Connection /></el-icon>
                  </div>
                  <div>
                    <div class="page-title">{{ detail.name }}</div>
                    <div class="page-subtitle">
                      <span>人数上限: {{ detail.maxMembers }}</span>
                      <span class="dot-sep">·</span>
                      <span>当前成员: {{ detail.memberCount }} 人</span>
                      <span class="dot-sep">·</span>
                      <span>邀请码: <span class="invite-highlight">{{ detail.inviteCode }}</span></span>
                    </div>
                  </div>
                </div>
                <div class="header-right">
                  <ElTag v-if="isLeader" type="warning" effect="dark" size="small">组长</ElTag>
                  <ElTag v-else type="info" effect="plain" size="small">成员</ElTag>
                  <ElPopconfirm
                    v-if="!isLeader"
                    title="确定要退出该小组吗？"
                    confirm-button-text="退出"
                    cancel-button-text="取消"
                    @confirm="handleLeave"
                  >
                    <template #reference>
                      <ElButton size="small" type="danger" plain :loading="actionLoading">退出小组</ElButton>
                    </template>
                  </ElPopconfirm>
                </div>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>

        <ElRow v-if="detail.weeklyStar" :gutter="16" class="section-row">
          <ElCol :span="24">
            <ElCard class="panel-card star-card">
              <div class="star-content">
                <div class="star-badge">
                  <el-icon :size="20" color="#f59e0b"><Trophy /></el-icon>
                </div>
                <div class="star-text">
                  <span class="star-label">本周活跃之星</span>
                  <span class="star-name">{{ detail.weeklyStar.name }}</span>
                  <span class="star-stat">学习 {{ formatMinutes(detail.weeklyStar.studyMinutes) }}</span>
                </div>
              </div>
            </ElCard>
          </ElCol>
        </ElRow>

        <ElRow :gutter="16" class="section-row">
          <ElCol :xs="24" :lg="14">
            <ElCard class="panel-card">
              <div class="card-title">成员名册</div>
              <div class="member-list">
                <div
                  v-for="member in detail.members"
                  :key="member.userId"
                  class="member-row"
                >
                  <ElAvatar :size="36" :style="{ backgroundColor: member.avatarColor, fontWeight: 600 }">
                    {{ member.name.charAt(0) }}
                  </ElAvatar>
                  <div class="member-info">
                    <div class="member-name">
                      {{ member.name }}
                      <ElTag v-if="member.role === 'leader'" type="warning" size="small">组长</ElTag>
                    </div>
                    <div class="member-stat">
                      本周学习 {{ formatMinutes(detail.stats.find(s => s.userId === member.userId)?.studyMinutes || 0) }}
                      · 本周完成 {{ detail.stats.find(s => s.userId === member.userId)?.weeklyCompletedResources || 0 }} 资源
                    </div>
                  </div>
                  <div v-if="isLeader && member.role !== 'leader'" class="member-actions">
                    <ElPopconfirm
                      title="确定要移除该成员吗？"
                      confirm-button-text="移除"
                      cancel-button-text="取消"
                      @confirm="handleRemove(member.userId, member.name)"
                    >
                      <template #reference>
                        <ElButton size="small" text type="danger">移除</ElButton>
                      </template>
                    </ElPopconfirm>
                    <ElButton size="small" text type="primary" @click="openTransferDialog(member.userId)">转让组长</ElButton>
                  </div>
                </div>
              </div>
            </ElCard>
          </ElCol>

          <ElCol :xs="24" :lg="10">
            <ElCard class="panel-card">
              <div class="card-title">近期动态</div>
              <div v-if="detail.activities.length" class="timeline-area">
                <ElTimeline>
                  <ElTimelineItem
                    v-for="act in detail.activities"
                    :key="act.id"
                    :timestamp="formatTime(act.createdAt)"
                    placement="top"
                  >
                    <div class="activity-item">
                      <span class="activity-icon">{{ activityIcon(act.type) }}</span>
                      <span class="activity-content">{{ act.content }}</span>
                    </div>
                  </ElTimelineItem>
                </ElTimeline>
              </div>
              <ElEmpty v-else description="暂无动态" :image-size="60" />
            </ElCard>
          </ElCol>
        </ElRow>

        <ElRow :gutter="16" class="section-row">
          <ElCol :span="24">
            <ElCard class="panel-card">
              <div class="card-title">成员本周学习数据对比</div>
              <EChart v-if="detail.stats.length" :option="chartOption" height="340" />
              <ElEmpty v-else description="暂无数据" :image-size="60" />
            </ElCard>
          </ElCol>
        </ElRow>
      </template>
    </ElSkeleton>

    <ElDialog v-model="showTransferDialog" title="转让组长权限" width="400px" :close-on-click-modal="false">
      <div style="font-size: 14px; color: #475569; line-height: 1.7">
        转让后您将成为普通成员，新组长将获得移除成员和管理权限。确定要转让吗？
      </div>
      <template #footer>
        <ElButton @click="showTransferDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="actionLoading" @click="handleTransfer">确认转让</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.study-group-detail-page {
  padding: 16px 16px 22px;
}

.section-row {
  margin-top: 16px;
}

.panel-card {
  border-radius: 14px;
  border: 1px solid #e7edf5;
}

.header-card :deep(.el-card__body) {
  padding: 16px 18px;
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.group-icon-lg {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.dot-sep {
  color: #cbd5e1;
}

.invite-highlight {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: #3b82f6;
  letter-spacing: 1px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.star-card :deep(.el-card__body) {
  padding: 12px 18px;
}

.star-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.star-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.star-text {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.star-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.star-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.star-stat {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
}

.card-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.member-row:hover {
  background-color: #f8fafc;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-stat {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.timeline-area {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
}

.activity-icon {
  flex-shrink: 0;
}

.activity-content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 992px) {
  .study-group-detail-page {
    padding: 12px 12px 20px;
  }
}
</style>
