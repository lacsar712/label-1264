<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElCard, ElCol, ElRow, ElSkeleton, ElTable, ElTableColumn, ElTag, ElIcon, ElEmpty, ElProgress } from 'element-plus'
import {
  Histogram,
  EditPen,
  Trophy,
  ArrowRight,
  Calendar,
} from '@element-plus/icons-vue'

import EChart from '../components/EChart.vue'
import { usePageData } from '../lib/usePageData'
import { api } from '../lib/api'

const router = useRouter()
const { data, loading, refresh } = usePageData('/pages/progress')
const quizSummary = ref(null)
const quizSummaryLoading = ref(false)

async function loadQuizSummary() {
  quizSummaryLoading.value = true
  try {
    const res = await api.get('/pages/quiz/recent-summary')
    if (res.data.ok) quizSummary.value = res.data.data
  } catch (e) {
    console.error(e)
  } finally {
    quizSummaryLoading.value = false
  }
}

onMounted(loadQuizSummary)

const subjectPieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { top: 8, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '56%'],
      label: { formatter: '{b} {d}%' },
      labelLine: { length: 14, length2: 12 },
      data: (data.value?.subjectPie || []).map((x) => ({ name: x.name, value: x.value })),
    },
  ],
}))

const progressTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 8, left: 'center' },
  grid: { top: 56, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: { type: 'category', data: (data.value?.progressTrend30d || []).map((x) => x.date) },
  yAxis: { type: 'value', min: 0 },
  series: [
    {
      name: '实际进度(min)',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      areaStyle: { opacity: 0.12 },
      data: (data.value?.progressTrend30d || []).map((x) => x.actualMinutes),
    },
    {
      name: '目标进度(min)',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { type: 'dashed' },
      data: (data.value?.progressTrend30d || []).map((x) => x.targetMinutes),
    },
  ],
}))

const funnelOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'funnel',
      left: '10%',
      top: 24,
      bottom: 10,
      width: '80%',
      min: 0,
      max: Math.max(...(data.value?.wrongFunnel || []).map((x) => x.value), 1),
      sort: 'descending',
      gap: 2,
      label: { show: true, position: 'inside' },
      data: data.value?.wrongFunnel || [],
    },
  ],
}))

const quizScoreCurveOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const p = params[0]
      return `${p.data.subject}<br/>得分率: ${p.data.scoreRate}%<br/>${p.data.date}`
    },
  },
  grid: { top: 20, left: 36, right: 12, bottom: 24, containLabel: true },
  xAxis: {
    type: 'category',
    data: (quizSummary.value?.scoreCurve || []).map((_, i) => `第${i + 1}次`),
    axisLabel: { fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%', fontSize: 10 },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: '#8b5cf6' },
      itemStyle: { color: '#8b5cf6', borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(139, 92, 246, 0.25)' },
            { offset: 1, color: 'rgba(139, 92, 246, 0)' },
          ],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#94a3b8', width: 1 },
        data: [{ yAxis: 60, label: { formatter: '60%', fontSize: 9 } }],
      },
      data: (quizSummary.value?.scoreCurve || []).map((x) => ({
        value: Number(x.scoreRate),
        subject: x.subject,
        date: x.date,
      })),
    },
  ],
}))

function goQuizCreate() {
  router.push('/quiz/create')
}

function goQuizHistory() {
  router.push('/quiz/history')
}

function goQuizResult(row) {
  router.push(`/quiz/result/${row.id}`)
}

function goContinueQuiz(row) {
  router.push(`/quiz/take/${row.id}`)
}

function goCalendar() {
  router.push('/calendar')
}

function diffColor(d) {
  if (d === '基础') return '#22c55e'
  if (d === '提高') return '#f59e0b'
  if (d === '挑战') return '#ef4444'
  return '#6366f1'
}
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap">
            <div>
              <div style="font-weight: 800">学习进度模块</div>
              <div style="font-size: 12px; color: #64748b">追踪 + 复盘 + 目标</div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <ElButton @click="goCalendar">
                <el-icon style="margin-right: 4px"><Calendar /></el-icon>
                学习日历
              </ElButton>
              <ElButton @click="goQuizHistory">
                <el-icon style="margin-right: 4px"><Histogram /></el-icon>
                自测记录
              </ElButton>
              <ElButton type="primary" @click="goQuizCreate">
                <el-icon style="margin-right: 4px"><EditPen /></el-icon>
                发起自测
              </ElButton>
              <ElButton :loading="loading" @click="() => { refresh(); loadQuizSummary(); }">刷新</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :span="24">
        <ElCard
          style="border-radius: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; cursor: pointer; transition: transform 0.2s"
          :body-style="{ padding: '0' }"
          @click="goQuizHistory"
          class="quiz-summary-card"
        >
          <div style="padding: 20px 24px">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap">
              <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0">
                <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0">
                  <el-icon :size="26"><Trophy /></el-icon>
                </div>
                <div style="flex: 1; min-width: 0">
                  <div style="font-weight: 800; font-size: 18px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
                    最近自测
                    <ElTag effect="dark" style="background: rgba(255,255,255,0.25); border: none; color: white">
                      累计 {{ quizSummary?.totalCount || 0 }} 份答卷
                    </ElTag>
                    <ElTag
                      v-if="quizSummary?.inProgressCount"
                      effect="dark"
                      style="background: #f59e0b; border: none; color: white; cursor: pointer"
                      @click.stop="goQuizHistory"
                    >
                      进行中 {{ quizSummary.inProgressCount }} 份 ➜
                    </ElTag>
                  </div>
                  <div style="font-size: 13px; opacity: 0.92; margin-top: 4px">
                    一键回看历次成绩曲线与错题回顾
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; opacity: 0.9; font-weight: 600">
                查看详情
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>

            <ElSkeleton :loading="quizSummaryLoading" animated style="margin-top: 16px">
              <ElRow :gutter="12" style="margin-top: 8px">
                <ElCol :xs="24" :md="15">
                  <div v-if="quizSummary?.inProgress?.length" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px">
                    <div style="font-weight: 600; font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 4px">
                      <span style="display: inline-block; width: 6px; height: 6px; background: #f59e0b; border-radius: 50%; animation: pulse 1.4s infinite"></span>
                      进行中（点击继续作答）
                    </div>
                    <div
                      v-for="(r, idx) in quizSummary.inProgress.slice(0, 3)"
                      :key="'ip-' + idx"
                      style="padding: 10px 14px; background: rgba(245, 158, 11, 0.35); border: 1px solid rgba(255,255,255,0.35); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px"
                      @click.stop="goContinueQuiz(r)"
                    >
                      <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1">
                        <div
                          style="
                            width: 32;
                            height: 32px;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: rgba(255,255,255,0.4);
                            color: #78350f;
                            fontWeight: 700;
                            fontSize: 13px;
                            flexShrink: 0;
                          "
                        >
                          {{ r.subject.slice(0, 1) }}
                        </div>
                        <div style="min-width: 0; flex: 1">
                          <div style="font-weight: 600; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
                            <span>{{ r.subject }}</span>
                            <span style="font-size: 12px; opacity: 0.9; padding: 1px 8px; background: rgba(255,255,255,0.25); border-radius: 10px">
                              {{ r.difficulty }}
                            </span>
                            <ElTag v-if="r.sourceType === '错题再练'" effect="dark" style="background: #ef4444; border: none; padding: 0 6px; height: 20px; line-height: 20px">错题再练</ElTag>
                          </div>
                          <div style="font-size: 12px; opacity: 0.85; margin-top: 2px">
                            开始于 {{ r.startedAt }}
                          </div>
                        </div>
                      </div>
                      <div style="text-align: right; flex-shrink: 0">
                        <div style="font-weight: 800; font-size: 16px; color: #78350f">
                          {{ r.answeredCount }}/{{ r.questionCount }}
                        </div>
                        <div style="font-size: 12px; opacity: 0.85; margin-top: 1px; color: #78350f">继续作答 →</div>
                      </div>
                    </div>
                  </div>
                  <div v-if="quizSummary?.recent?.length" style="display: flex; flex-direction: column; gap: 8px">
                    <div
                      v-for="(r, idx) in quizSummary.recent.slice(0, 3)"
                      :key="idx"
                      style="padding: 10px 14px; background: rgba(255,255,255,0.18); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px"
                      @click.stop="goQuizResult(r)"
                    >
                      <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1">
                        <div
                          :style="{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.3)',
                            fontWeight: 700,
                            fontSize: 13,
                            flexShrink: 0,
                          }"
                        >
                          {{ r.subject.slice(0, 1) }}
                        </div>
                        <div style="min-width: 0; flex: 1">
                          <div style="font-weight: 600; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
                            <span>{{ r.subject }}</span>
                            <span style="font-size: 12px; opacity: 0.9; padding: 1px 8px; background: rgba(255,255,255,0.2); border-radius: 10px">
                              {{ r.difficulty }}
                            </span>
                          </div>
                          <div style="font-size: 12px; opacity: 0.8; margin-top: 2px">{{ r.submittedAt }}</div>
                        </div>
                      </div>
                      <div style="text-align: right; flex-shrink: 0">
                        <div style="font-weight: 800; font-size: 18px">{{ r.score }}/{{ r.totalScore }}</div>
                        <div style="font-size: 12px; opacity: 0.85; margin-top: 1px">正确率 {{ r.accuracy }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-else style="padding: 18px; text-align: center; opacity: 0.9">
                    还没有自测记录，快去发起一次自测吧～
                    <ElButton type="warning" size="small" style="margin-left: 8px" @click.stop="goQuizCreate">立即自测</ElButton>
                  </div>
                </ElCol>

                <ElCol :xs="24" :md="9">
                  <div style="background: rgba(255,255,255,0.18); border-radius: 10px; padding: 12px 14px; height: 100%; min-height: 140px">
                    <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between">
                      <span>历次成绩曲线</span>
                      <span style="font-size: 11px; opacity: 0.8">近{{ quizSummary?.scoreCurve?.length || 0 }}次</span>
                    </div>
                    <template v-if="quizSummary?.scoreCurve?.length">
                      <EChart :option="quizScoreCurveOption" :height="110" />
                    </template>
                    <template v-else>
                      <ElEmpty description="暂无成绩数据" image-size="60" style="padding: 14px 0; --el-empty-description-color: rgba(255,255,255,0.75)" />
                    </template>
                  </div>
                </ElCol>
              </ElRow>

              <ElRow v-if="quizSummary?.subjectSummary?.length" :gutter="8" style="margin-top: 12px">
                <ElCol v-for="s in quizSummary.subjectSummary.slice(0, 6)" :key="s.subject" :xs="12" :sm="8" :md="4">
                  <div style="padding: 8px 12px; background: rgba(255,255,255,0.18); border-radius: 8px">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px">
                      <span style="font-weight: 600; font-size: 13px">{{ s.subject }}</span>
                      <span style="font-size: 11px; opacity: 0.85">{{ s.count }}次</span>
                    </div>
                    <ElProgress
                      :percentage="Number(s.avgScore) || 0"
                      :stroke-width="6"
                      :show-text="false"
                      color="rgba(255,255,255,0.9)"
                    />
                    <div style="font-size: 11px; opacity: 0.85; margin-top: 2px; text-align: right">均分率 {{ s.avgScore }}</div>
                  </div>
                </ElCol>
              </ElRow>
            </ElSkeleton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">学习总览（各学科学习时长占比）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="subjectPieOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="12">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">总览汇总表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="320px">
              <ElTable :data="data?.overviewTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="subject" label="学科" width="70" />
                <ElTableColumn prop="totalStudyMinutes" label="总学时(min)" width="110" />
                <ElTableColumn prop="completedResources" label="完成资源数" width="110" />
                <ElTableColumn prop="wrongCount" label="错题数" width="80" />
                <ElTableColumn prop="masteryRate" label="掌握率" min-width="100">
                  <template #default="{ row }">
                    <ElTag type="success" effect="plain">{{ (Number(row.masteryRate) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">进度趋势与对比（近30天）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="progressTrendOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700">错题复盘（漏斗）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="funnelOption" :height="320" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 10px">每日进度表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="340px">
              <ElTable :data="data?.dailyTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="date" label="日期" width="110" />
                <ElTableColumn prop="subject" label="学科" width="70" />
                <ElTableColumn prop="studyMinutes" label="学习时长(min)" width="120" />
                <ElTableColumn prop="completedCount" label="完成资源" width="90" />
                <ElTableColumn prop="targetAchieveRate" label="目标达成率" width="110">
                  <template #default="{ row }">
                    <ElTag type="info" effect="plain">{{ (Number(row.targetAchieveRate) * 100).toFixed(1) }}%</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="note" label="备注" min-width="160" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; margin-bottom: 16px">
          <div style="font-weight: 700; margin-bottom: 10px">错题明细表</div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="160px">
              <ElTable :data="data?.wrongTable || []" size="small" style="width: 100%">
                <ElTableColumn prop="wrongId" label="错题ID" width="90" />
                <ElTableColumn prop="knowledgePoint" label="所属知识点" min-width="160" />
                <ElTableColumn prop="wrongCount" label="做错次数" width="80" />
                <ElTableColumn prop="corrected" label="订正状态" width="80" />
                <ElTableColumn prop="mastery" label="掌握程度" width="80" />
                <ElTableColumn prop="reviewedAt" label="复盘时间" min-width="150" />
              </ElTable>
            </el-scrollbar>
          </ElSkeleton>
        </ElCard>

        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">学习目标管理</div>
            <div style="font-size: 12px; color: #64748b">环形进度条</div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <ElRow :gutter="12">
              <ElCol v-for="g in data?.goalRings || []" :key="g.type" :span="8">
                <ElCard shadow="never" style="border-radius: 12px; text-align: center">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 8px">{{ g.type }}目标</div>
                  <el-progress type="circle" :percentage="Math.round(Number(g.percent || 0) * 100)" :width="80" />
                </ElCard>
              </ElCol>
            </ElRow>
            <div style="margin-top: 12px">
              <el-scrollbar height="160px">
                <ElTable :data="data?.goalTable || []" size="small" style="width: 100%">
                  <ElTableColumn prop="type" label="类型" width="60" />
                  <ElTableColumn prop="targetMinutes" label="时长" width="70" />
                  <ElTableColumn prop="targetResources" label="资源数" width="70" />
                  <ElTableColumn prop="startDate" label="起始" width="110" />
                  <ElTableColumn prop="endDate" label="结束" width="110" />
                  <ElTableColumn prop="currentMinutes" label="当前(min)" width="90" />
                  <ElTableColumn prop="currentResources" label="当前资源" width="90" />
                  <ElTableColumn prop="adjustmentRecord" label="调整记录" min-width="180">
                    <template #default="{ row }">
                      <span v-if="!Array.isArray(row.adjustmentRecord) || row.adjustmentRecord.length === 0">-</span>
                      <span v-else>{{ row.adjustmentRecord[row.adjustmentRecord.length - 1]?.note || '已调整' }}</span>
                    </template>
                  </ElTableColumn>
                </ElTable>
              </el-scrollbar>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style scoped>
.quiz-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(139, 92, 246, 0.3);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}
</style>
