<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElRow,
  ElSkeleton,
  ElTag,
  ElCheckbox,
  ElProgress,
  ElTimeline,
  ElTimelineItem,
  ElIcon,
  ElTooltip,
  ElEmpty,
} from 'element-plus'
import {
  Lock,
  Unlock,
  Check,
  Clock,
  Aim,
  Star,
  ArrowLeft,
  Reading,
  VideoCamera,
  Files,
  DataLine,
} from '@element-plus/icons-vue'

import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const router = useRouter()
const { data, loading, refresh } = usePageData('/pages/learning-path')

const updatingResource = ref(null)

const overallProgressPercent = computed(() => {
  return Math.round((data.value?.overallProgress || 0) * 100)
})

const statusColorMap = {
  '未开始': '#94a3b8',
  '进行中': '#2563eb',
  '已完成': '#10b981',
  '已锁定': '#cbd5e1',
}

const difficultyColorMap = {
  '基础': '#10b981',
  '提高': '#f59e0b',
  '挑战': '#ef4444',
}

const typeIconMap = {
  '课程': Reading,
  '视频': VideoCamera,
  '课件': Files,
  '题库': DataLine,
}

const typeColorMap = {
  '课程': '#3b82f6',
  '视频': '#8b5cf6',
  '课件': '#06b6d4',
  '题库': '#f59e0b',
}

function formatHours(hours) {
  if (hours < 1) return `${hours * 60}分钟`
  if (hours === Math.floor(hours)) return `${hours}小时`
  return `${Math.floor(hours)}小时${Math.round((hours % 1) * 60)}分钟`
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

function getStatusIcon(status) {
  switch (status) {
    case '已完成': return Check
    case '进行中': return Unlock
    case '已锁定': return Lock
    default: return Clock
  }
}

async function toggleResource(resourceId, completed) {
  if (updatingResource.value) return
  updatingResource.value = resourceId
  try {
    const res = await api.post(`/actions/learning-path/resources/${resourceId}/toggle`, {
      completed: !completed,
    })
    if (res.ok) {
      data.value = res.data
    }
  } finally {
    updatingResource.value = null
  }
}

function goBack() {
  router.push('/home')
}

function scrollToPhase(phaseId) {
  const el = document.getElementById(`phase-${phaseId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
            <div style="display: flex; align-items: center; gap: 12px">
              <ElButton circle size="small" @click="goBack">
                <ElIcon><ArrowLeft /></ElIcon>
              </ElButton>
              <div>
                <div style="font-weight: 800; font-size: 18px">{{ data?.name || '学习路径' }}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px">
                  {{ data?.description || '个性化学习路线' }}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 16px">
              <div style="text-align: right">
                <div style="font-size: 12px; color: #64748b">整体进度</div>
                <div style="font-weight: 700; font-size: 20px; color: #2563eb">{{ overallProgressPercent }}%</div>
              </div>
              <ElProgress
                :percentage="overallProgressPercent"
                :width="80"
                :stroke-width="10"
                color="#2563eb"
              />
              <ElTag :type="data?.status === '已完成' ? 'success' : data?.status === '进行中' ? 'primary' : 'info'" effect="plain">
                {{ data?.status }}
              </ElTag>
              <ElButton :loading="loading" @click="refresh">刷新</ElButton>
            </div>
          </div>

          <ElRow :gutter="16" style="margin-top: 20px">
            <ElCol :xs="12" :md="6">
              <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 10px">
                <div style="font-size: 12px; color: #64748b">预计总学时</div>
                <div style="font-weight: 700; font-size: 18px; margin-top: 4px">
                  {{ formatHours(data?.totalEstimatedHours || 0) }}
                </div>
              </div>
            </ElCol>
            <ElCol :xs="12" :md="6">
              <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 10px">
                <div style="font-size: 12px; color: #64748b">阶段总数</div>
                <div style="font-weight: 700; font-size: 18px; margin-top: 4px">
                  {{ data?.phases?.length || 0 }}
                </div>
              </div>
            </ElCol>
            <ElCol :xs="12" :md="6">
              <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 10px">
                <div style="font-size: 12px; color: #64748b">已完成阶段</div>
                <div style="font-weight: 700; font-size: 18px; color: #10b981; margin-top: 4px">
                  {{ (data?.phases || []).filter(p => p.status === '已完成').length }}
                </div>
              </div>
            </ElCol>
            <ElCol :xs="12" :md="6">
              <div style="text-align: center; padding: 12px; background: #f8fafc; border-radius: 10px">
                <div style="font-size: 12px; color: #64748b">开始时间</div>
                <div style="font-weight: 700; font-size: 16px; margin-top: 4px">
                  {{ data?.startedAt ? new Date(data.startedAt).toLocaleDateString('zh-CN') : '未开始' }}
                </div>
              </div>
            </ElCol>
          </ElRow>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="6">
        <ElCard style="border-radius: 14px; position: sticky; top: 16px">
          <div style="font-weight: 700; margin-bottom: 12px">
            <ElIcon style="vertical-align: middle; margin-right: 6px"><Aim /></ElIcon>
            学习阶段导航
          </div>
          <ElSkeleton :loading="loading" animated>
            <ElTimeline style="padding-left: 8px">
              <ElTimelineItem
                v-for="phase in data?.phases || []"
                :key="phase.id"
                :color="statusColorMap[phase.status]"
                :timestamp="`${Math.round(phase.progress * 100)}%`"
                placement="top"
                style="cursor: pointer"
                @click="scrollToPhase(phase.id)"
              >
                <div style="display: flex; align-items: center; gap: 8px">
                  <ElIcon :color="statusColorMap[phase.status]">
                    <component :is="getStatusIcon(phase.status)" />
                  </ElIcon>
                  <span style="font-size: 13px; font-weight: 500">{{ phase.name }}</span>
                  <ElTag
                    v-if="phase.id === data?.currentPhaseId"
                    type="primary"
                    size="small"
                    effect="dark"
                  >
                    当前
                  </ElTag>
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px">
                  {{ formatHours(phase.estimatedHours) }} · {{ phase.completedResources }}/{{ phase.totalResources }}资源
                </div>
              </ElTimelineItem>
            </ElTimeline>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="18">
        <ElSkeleton :loading="loading" animated>
          <template v-if="data?.phases?.length > 0">
            <div
              v-for="phase in data.phases"
              :key="phase.id"
              :id="`phase-${phase.id}`"
              style="margin-bottom: 16px"
            >
              <ElCard
                style="border-radius: 14px"
                :class="{ 'opacity-60': phase.status === '已锁定' }"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px">
                  <div style="flex: 1">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
                      <div style="display: flex; align-items: center; gap: 8px">
                        <div
                          style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700"
                          :style="{ backgroundColor: statusColorMap[phase.status] }"
                        >
                          <ElIcon>
                            <component :is="getStatusIcon(phase.status)" />
                          </ElIcon>
                        </div>
                        <div>
                          <div style="font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 8px">
                            第{{ phase.phaseOrder + 1 }}阶段 · {{ phase.name }}
                            <ElTag
                              v-if="phase.id === data?.currentPhaseId"
                              type="primary"
                              effect="dark"
                              size="small"
                            >
                              进行中
                            </ElTag>
                            <ElTag
                              v-else-if="phase.status === '已完成'"
                              type="success"
                              effect="plain"
                              size="small"
                            >
                              已完成
                            </ElTag>
                            <ElTag
                              v-else-if="phase.status === '已锁定'"
                              type="info"
                              effect="plain"
                              size="small"
                            >
                              未解锁
                            </ElTag>
                          </div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 2px">
                            <ElTag :color="difficultyColorMap[phase.difficulty]" effect="dark" size="small" style="margin-right: 8px">
                              {{ phase.difficulty }}
                            </ElTag>
                            <ElIcon style="vertical-align: middle; margin-right: 4px"><Clock /></ElIcon>
                            {{ formatHours(phase.estimatedHours) }}
                            <span style="margin: 0 8px">·</span>
                            <ElIcon style="vertical-align: middle; margin-right: 4px"><Star /></ElIcon>
                            里程碑：{{ phase.milestone }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style="margin-top: 14px; padding: 12px 16px; background: #f0f9ff; border-radius: 10px; border-left: 4px solid #3b82f6">
                      <div style="font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px">
                        <ElIcon style="vertical-align: middle; margin-right: 4px"><Aim /></ElIcon>
                        学习目标
                      </div>
                      <div style="font-size: 14px; color: #1e3a5f; line-height: 1.6">
                        {{ phase.goal }}
                      </div>
                      <div v-if="phase.description" style="font-size: 13px; color: #475569; margin-top: 8px; line-height: 1.6">
                        {{ phase.description }}
                      </div>
                    </div>

                    <div style="margin-top: 14px; display: flex; align-items: center; gap: 16px">
                      <div style="flex: 1">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
                          <span style="font-size: 13px; font-weight: 600">阶段进度</span>
                          <span style="font-size: 13px; color: #2563eb; font-weight: 600">
                            {{ phase.completedResources }}/{{ phase.totalResources }} 资源
                          </span>
                        </div>
                        <ElProgress
                          :percentage="Math.round(phase.progress * 100)"
                          :stroke-width="8"
                          :color="statusColorMap[phase.status]"
                          text-inside
                        />
                      </div>
                    </div>

                    <div style="margin-top: 14px">
                      <div style="font-weight: 600; font-size: 14px; margin-bottom: 10px">
                        推荐学习资源
                        <span style="font-weight: 400; color: #64748b; font-size: 12px; margin-left: 8px">
                          勾选标记完成，进度实时更新
                        </span>
                      </div>

                      <div
                        v-for="resource in phase.resources"
                        :key="resource.id"
                        style="display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; margin-bottom: 8px; border-radius: 10px; transition: all 0.2s"
                        :class="{
                          'bg-green-50 border border-green-200': resource.completed,
                          'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm': !resource.completed,
                          'opacity-50 cursor-not-allowed': phase.status === '已锁定'
                        }"
                      >
                        <ElCheckbox
                          :model-value="resource.completed"
                          :disabled="phase.status === '已锁定' || updatingResource === resource.id"
                          @change="toggleResource(resource.id, resource.completed)"
                          style="margin-top: 4px"
                        />

                        <div style="flex: 1; min-width: 0">
                          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
                            <div
                              style="width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white"
                              :style="{ backgroundColor: typeColorMap[resource.type] }"
                            >
                              <ElIcon :size="16">
                                <component :is="typeIconMap[resource.type] || Reading" />
                              </ElIcon>
                            </div>
                            <span
                              style="font-weight: 500; font-size: 14px"
                              :class="{ 'line-through text-gray-400': resource.completed }"
                            >
                              {{ resource.name }}
                            </span>
                            <ElTag
                              v-if="resource.isRequired"
                              type="danger"
                              effect="plain"
                              size="small"
                            >
                              必修
                            </ElTag>
                            <ElTag
                              v-else
                              type="info"
                              effect="plain"
                              size="small"
                            >
                              选修
                            </ElTag>
                          </div>

                          <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px; font-size: 12px; color: #64748b">
                            <ElTag size="small" effect="plain">{{ resource.subject }}</ElTag>
                            <ElTag size="small" effect="plain" :type="resource.difficulty === '基础' ? 'success' : resource.difficulty === '提高' ? 'warning' : 'danger'">
                              {{ resource.difficulty }}
                            </ElTag>
                            <span><ElIcon style="vertical-align: middle"><Clock /></ElIcon> {{ formatMinutes(resource.estimatedMinutes) }}</span>
                            <span v-if="resource.note" style="color: #94a3b8">· {{ resource.note }}</span>
                          </div>

                          <div v-if="resource.completedAt" style="margin-top: 6px; font-size: 11px; color: #10b981">
                            <ElIcon style="vertical-align: middle"><Check /></ElIcon>
                            完成于 {{ new Date(resource.completedAt).toLocaleDateString('zh-CN') }}
                          </div>
                        </div>

                        <ElTooltip
                          v-if="phase.status === '已锁定'"
                          content="完成前一阶段后解锁"
                          placement="top"
                        >
                          <ElIcon style="color: #cbd5e1; margin-top: 4px"><Lock /></ElIcon>
                        </ElTooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </ElCard>
            </div>
          </template>

          <ElEmpty v-else description="暂无学习路径数据" />
        </ElSkeleton>
      </ElCol>
    </ElRow>
  </div>
</template>

<style scoped>
.opacity-60 {
  opacity: 0.6;
}
.line-through {
  text-decoration: line-through;
}
</style>
