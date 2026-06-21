<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElRow,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElProgress,
  ElIcon,
} from 'element-plus'
import {
  Target,
  ArrowRight,
  Clock,
  CheckCircle,
  ListChecks,
} from '@element-plus/icons-vue'

import EChart from '../components/EChart.vue'
import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const router = useRouter()
const { data, loading, refresh } = usePageData('/pages/home')
const learningPathSummary = ref(null)
const loadingPath = ref(false)

async function loadLearningPathSummary() {
  loadingPath.value = true
  try {
    const res = await api.get('/pages/learning-path/summary')
    if (res.ok) {
      learningPathSummary.value = res.data
    }
  } finally {
    loadingPath.value = false
  }
}

onMounted(() => {
  loadLearningPathSummary()
})

function goToLearningPath() {
  router.push('/learning-path')
}

const overallProgressPercent = computed(() => {
  return Math.round((learningPathSummary.value?.overallProgress || 0) * 100)
})

const currentPhaseProgressPercent = computed(() => {
  return Math.round((learningPathSummary.value?.currentPhase?.progress || 0) * 100)
})

const profileDonutOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 8, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}  {d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.profileDonut || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, left: 'center' },
  grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.recommendTrend7d || []).map((x) => x.date) },
  yAxis: [
    { type: 'value', name: '点击', min: 0 },
    { type: 'value', name: '完成率', min: 0, max: 1 },
  ],
  series: [
    {
      name: '点击量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: (data.value?.recommendTrend7d || []).map((x) => x.clickCount),
    },
    {
      name: '完成率',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbol: 'diamond',
      symbolSize: 7,
      data: (data.value?.recommendTrend7d || []).map((x) => Number(x.completionRate || 0)),
    },
  ],
}))

const miniBarOption = computed(() => ({
  grid: { top: 18, left: 10, right: 10, bottom: 10, containLabel: true },
  xAxis: {
    type: 'category',
    axisLabel: { show: false },
    axisTick: { show: false },
    axisLine: { show: false },
    data: (data.value?.weeklySummaryTable || []).map((x) => x.date.slice(5)),
  },
  yAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false } },
  series: [
    {
      type: 'bar',
      barWidth: 10,
      itemStyle: { borderRadius: 6, color: '#2563eb' },
      data: (data.value?.weeklySummaryTable || []).map((x) => x.studyMinutes),
    },
  ],
}))

async function doLearn(row) {
  await api.post(`/actions/recommendations/${row.recommendationId}/learn`)
  await refresh()
}

async function doFavorite(row) {
  await api.post(`/actions/recommendations/${row.recommendationId}/favorite`)
  await refresh()
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">首页 · 概览</div>
              <div style="font-size: 12px; color: #64748b">
                核心入口：学习路径 + 概览图表 + 轻量化表格
              </div>
            </div>
            <ElButton :loading="loading" @click="() => { refresh(); loadLearningPathSummary(); }">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :span="24">
        <ElCard
          style="border-radius: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: pointer; transition: transform 0.2s"
          :body-style="{ padding: '0' }"
          @click="goToLearningPath"
        >
          <div style="padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px">
            <div style="flex: 1; min-width: 0">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px">
                <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center">
                  <ElIcon :size="24"><Target /></ElIcon>
                </div>
                <div>
                  <div style="font-weight: 800; font-size: 18px">我的学习路径</div>
                  <div style="font-size: 13px; opacity: 0.9">{{ learningPathSummary?.name || '个性化学习路线' }}</div>
                </div>
              </div>

              <ElSkeleton :loading="loadingPath" animated>
                <template v-if="learningPathSummary?.currentPhase">
                  <div style="display: flex; align-items: flex-start; gap: 16px; margin-top: 16px; flex-wrap: wrap">
                    <div style="flex: 1; min-width: 200px">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
                        <span style="font-size: 13px; opacity: 0.9">
                          <ElIcon style="vertical-align: middle; margin-right: 4px"><CheckCircle /></ElIcon>
                          整体进度
                        </span>
                        <span style="font-weight: 700; font-size: 16px">{{ overallProgressPercent }}%</span>
                      </div>
                      <ElProgress
                        :percentage="overallProgressPercent"
                        :stroke-width="10"
                        color="rgba(255,255,255,0.9)"
                        :show-text="false"
                      />
                    </div>
                    <div style="flex: 1; min-width: 200px">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
                        <span style="font-size: 13px; opacity: 0.9">
                          <ElIcon style="vertical-align: middle; margin-right: 4px"><ListChecks /></ElIcon>
                          {{ learningPathSummary.currentPhase.name }}
                        </span>
                        <span style="font-weight: 700; font-size: 16px">{{ currentPhaseProgressPercent }}%</span>
                      </div>
                      <ElProgress
                        :percentage="currentPhaseProgressPercent"
                        :stroke-width="10"
                        color="rgba(255,255,255,0.7)"
                        :show-text="false"
                      />
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 20px; margin-top: 16px; flex-wrap: wrap">
                    <div style="display: flex; align-items: center; gap: 6px">
                      <ElIcon style="opacity: 0.8"><Clock /></ElIcon>
                      <span style="font-size: 13px; opacity: 0.9">
                        预计总学时: {{ learningPathSummary.totalEstimatedHours }}小时
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <ElIcon style="opacity: 0.8"><ListChecks /></ElIcon>
                      <span style="font-size: 13px; opacity: 0.9">
                        阶段: {{ learningPathSummary.completedPhases }}/{{ learningPathSummary.totalPhases }} 已完成
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px">
                      <ElIcon style="opacity: 0.8"><CheckCircle /></ElIcon>
                      <span style="font-size: 13px; opacity: 0.9">
                        资源: {{ learningPathSummary.currentPhase.completedResources }}/{{ learningPathSummary.currentPhase.totalResources }}
                      </span>
                    </div>
                  </div>
                </template>
              </ElSkeleton>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px">
              <div
                style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; transition: all 0.2s"
                class="arrow-hover"
              >
                <ElIcon :size="28"><ArrowRight /></ElIcon>
              </div>
              <span style="font-size: 12px; opacity: 0.9">继续学习</span>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between">
            <div style="font-weight: 700">用户画像可视化</div>
            <div style="font-size: 12px; color: #64748b">{{ data?.user?.name }} · {{ data?.user?.stage }}</div>
          </div>

          <ElSkeleton :loading="loading" animated>
            <EChart :option="profileDonutOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">核心画像数据（紧凑表格）</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.profileTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="name" label="标签名称" min-width="140" />
                <ElTableColumn prop="weight" label="权重值" width="90">
                  <template #default="{ row }">
                    <ElTag type="primary" effect="plain">{{ Number(row.weight).toFixed(3) }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="updatedAt" label="更新时间" min-width="150" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">个性化推荐趋势（近7天）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="trendOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">学习数据速览</div>
            <div style="font-size: 12px; color: #64748b">总览 + 迷你柱状图</div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <ElRow :gutter="12">
              <ElCol :span="8">
                <ElCard shadow="never" style="border-radius: 12px">
                  <div style="font-size: 12px; color: #64748b">总学时(7天)</div>
                  <div style="font-size: 18px; font-weight: 800">
                    {{ Math.round((data?.quickStats?.totalStudyMinutes7d || 0) / 60) }}h
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :span="8">
                <ElCard shadow="never" style="border-radius: 12px">
                  <div style="font-size: 12px; color: #64748b">完成资源(7天)</div>
                  <div style="font-size: 18px; font-weight: 800">{{ data?.quickStats?.completedResources7d || 0 }}</div>
                </ElCard>
              </ElCol>
              <ElCol :span="8">
                <ElCard shadow="never" style="border-radius: 12px">
                  <div style="font-size: 12px; color: #64748b">推荐匹配(7天)</div>
                  <div style="font-size: 18px; font-weight: 800">
                    {{ Math.round((data?.quickStats?.avgRecommendMatch7d || 0) * 100) }}%
                  </div>
                </ElCard>
              </ElCol>
            </ElRow>
            <div style="margin-top: 12px">
              <EChart :option="miniBarOption" :height="120" />
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">推荐资源列表（卡片式表格）</div>
            <div style="font-size: 12px; color: #64748b">学习 / 收藏</div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="360px">
              <ElTable :data="data?.recommendTable || []" size="small" class="card-table" style="width: 100%">
                <ElTableColumn prop="resourceId" label="资源ID" width="110" />
                <ElTableColumn prop="name" label="名称" min-width="180" />
                <ElTableColumn label="适配标签" min-width="160">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 6px; flex-wrap: wrap">
                      <ElTag v-for="t in row.adaptedTags" :key="t" type="info" effect="plain">{{ t }}</ElTag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="matchScore" label="匹配度" width="90">
                  <template #default="{ row }">
                    <ElTag type="success" effect="plain">{{ Number(row.matchScore).toFixed(3) }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="操作" width="150" fixed="right">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 8px">
                      <ElButton size="small" type="primary" @click="doLearn(row)">学习</ElButton>
                      <ElButton size="small" @click="doFavorite(row)">收藏</ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">周学习数据汇总</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="360px">
              <ElTable :data="data?.weeklySummaryTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="date" label="日期" width="110" />
                <ElTableColumn prop="studyMinutes" label="学习时长(min)" width="120" />
                <ElTableColumn prop="completedCount" label="完成资源数" width="110" />
                <ElTableColumn prop="avgMatchScore" label="推荐匹配度均值" min-width="140">
                  <template #default="{ row }">
                    <ElTag type="info" effect="plain">{{ (Number(row.avgMatchScore) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style scoped>
.arrow-hover:hover {
  background: rgba(255,255,255,0.3) !important;
  transform: translateX(4px);
}
</style>
