<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElRow,
  ElSelect,
  ElOption,
  ElTable,
  ElTableColumn,
  ElTag,
  ElIcon,
  ElLoading,
  ElEmpty,
  ElPagination,
  ElDivider,
  ElDialog,
  ElMessage,
  ElMessageBox,
} from 'element-plus'
import {
  Histogram,
  ArrowLeft,
  Document,
  MagicStick,
  Refresh,
  View,
  Trophy,
  TrendCharts,
} from '@element-plus/icons-vue'
import EChart from '../../components/EChart.vue'
import { api } from '../../lib/api'
import { GREEN_600, RED_600 } from '../../lib/themeColors'
import { useAuth } from '../../stores/auth'

const router = useRouter()
const { state } = useAuth()
const loading = ref(false)
const summaryLoading = ref(false)
const history = ref({ total: 0, list: [] })
const summary = ref(null)
const subjectFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(10)

const config = ref({ subjects: [] })

async function loadConfig() {
  try {
    const res = await api.get('/pages/quiz/config')
    if (res.data.ok) config.value = res.data.data
  } catch (e) {}
}

async function loadSummary() {
  summaryLoading.value = true
  try {
    const res = await api.get('/pages/quiz/recent-summary')
    if (res.data.ok) summary.value = res.data.data
  } catch (e) {} finally {
    summaryLoading.value = false
  }
}

async function loadHistory() {
  loading.value = true
  try {
    const res = await api.get('/pages/quiz/history', {
      params: {
        subject: subjectFilter.value || undefined,
        status: statusFilter.value || undefined,
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
      },
    })
    if (res.data.ok) history.value = res.data.data
  } catch (e) {} finally {
    loading.value = false
  }
}

onMounted(async () => {
  const pref = state.user?.subjectPreference
  if (Array.isArray(pref) && pref.length > 0) {
    subjectFilter.value = pref[0]
  }
  await loadConfig()
  await loadSummary()
  await loadHistory()
})

function onPageChange(p) {
  page.value = p
  loadHistory()
}

function onSubjectChange() {
  page.value = 1
  loadHistory()
}

function onStatusChange() {
  page.value = 1
  loadHistory()
}

function goToResult(row) {
  router.push(`/quiz/result/${row.id}`)
}

function getScoreColor(row) {
  if (row.status === '草稿') return '#64748b'
  return row.totalScore && row.score / row.totalScore >= 0.6 ? GREEN_600 : RED_600
}

function goToTake(row) {
  router.push(`/quiz/take/${row.id}`)
}

function goContinueTake(row) {
  router.push(`/quiz/take/${row.id}`)
}

function goCreate() {
  router.push('/quiz/create')
}

async function retryWrongOfSubject(subject) {
  try {
    await ElMessageBox.confirm(
      `将为${subject}学科基于你的历史错题发起再练，确认开始？`,
      '错题再练',
      { type: 'info', confirmButtonText: '开始再练', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    const res = await api.post('/actions/quiz/create', {
      subject,
      difficulty: '混合',
      questionCount: 10,
      sourceType: '错题再练',
    })
    if (res.data.ok) {
      ElMessage.success('已生成错题再练试卷！')
      router.push(`/quiz/take/${res.data.data.quizId}`)
    }
  } catch (e) {}
}

const scoreCurveOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const p = params[0]
      return `${p.data.subject}<br/>得分率: ${p.data.scoreRate}%<br/>${p.data.date}`
    },
  },
  grid: { top: 20, left: 44, right: 18, bottom: 34, containLabel: true },
  xAxis: {
    type: 'category',
    data: (summary.value?.scoreCurve || []).map((x, i) => `第${i + 1}次`),
    axisLabel: { fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 100,
    axisLabel: { formatter: '{value}%' },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: '#6366f1' },
      itemStyle: { color: '#6366f1', borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(99, 102, 241, 0.3)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0)' },
          ],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#94a3b8' },
        data: [{ yAxis: 60, label: { formatter: '及格线 60%', fontSize: 10 } }],
      },
      data: (summary.value?.scoreCurve || []).map((x) => ({
        value: Number(x.scoreRate),
        subject: x.subject,
        date: x.date,
      })),
    },
  ],
}))

const subjectBarOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: 20, left: 44, right: 18, bottom: 28, containLabel: true },
  xAxis: {
    type: 'category',
    data: (summary.value?.subjectSummary || []).map((x) => x.subject),
    axisLabel: { fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    name: '次数',
  },
  series: [
    {
      type: 'bar',
      barWidth: '42%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#8b5cf6' },
            { offset: 1, color: '#6366f1' },
          ],
        },
      },
      label: { show: true, position: 'top', fontSize: 11, fontWeight: 600 },
      data: (summary.value?.subjectSummary || []).map((x) => x.count),
    },
  ],
}))

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}分${s}秒`
}

function accTag(v) {
  const n = Number(v)
  if (n >= 0.8) return { type: 'success' }
  if (n >= 0.6) return { type: 'warning' }
  return { type: 'danger' }
}
</script>

<template>
  <div style="padding: 16px 16px 22px; max-width: 1280px; margin: 0 auto">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px; background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px">
            <div style="display: flex; align-items: center; gap: 14px">
              <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center">
                <el-icon :size="28"><Histogram /></el-icon>
              </div>
              <div>
                <div style="font-weight: 800; font-size: 20px">自测历史记录</div>
                <div style="font-size: 13px; opacity: 0.9; margin-top: 4px">
                  历次成绩曲线 · 错题回顾 · 针对性再练
                </div>
              </div>
            </div>
            <ElButton type="warning" @click="goCreate">
              <el-icon style="margin-right: 4px"><MagicStick /></el-icon>
              发起新自测
            </ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :sm="12" :md="8">
        <ElCard style="border-radius: 14px" shadow="never">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
            <el-icon style="color: #6366f1"><Trophy /></el-icon>
            <div style="font-size: 13px; color: #64748b">累计自测</div>
          </div>
          <div style="font-weight: 800; font-size: 28px; color: #1e293b">
            {{ summary?.totalCount || 0 }}
            <span style="font-size: 14px; color: #94a3b8; font-weight: 400">次</span>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :md="8">
        <ElCard
          style="border-radius: 14px; border: 1px solid #fde68a; background: #fffbeb"
          shadow="never"
          v-if="summary?.inProgressCount"
          @click="() => { statusFilter = '草稿'; onStatusChange() }"
        >
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; cursor: pointer">
            <el-icon style="color: #f59e0b"><View /></el-icon>
            <div style="font-size: 13px; color: #92400e">进行中</div>
          </div>
          <div style="font-weight: 800; font-size: 28px; color: #b45309">
            {{ summary?.inProgressCount || 0 }}
            <span style="font-size: 14px; color: #b45309; font-weight: 400; opacity: 0.75">份</span>
          </div>
        </ElCard>
        <ElCard style="border-radius: 14px" shadow="never" v-else>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
            <el-icon style="color: #94a3b8"><View /></el-icon>
            <div style="font-size: 13px; color: #64748b">进行中</div>
          </div>
          <div style="font-weight: 800; font-size: 28px; color: #1e293b">
            0<span style="font-size: 14px; color: #94a3b8; font-weight: 400">份</span>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :md="8">
        <ElCard style="border-radius: 14px" shadow="never">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
            <el-icon style="color: #16a34a"><TrendCharts /></el-icon>
            <div style="font-size: 13px; color: #64748b">最近5次</div>
          </div>
          <div style="font-weight: 800; font-size: 28px; color: #1e293b">
            {{ summary?.recent?.length || 0 }}
            <span style="font-size: 14px; color: #94a3b8; font-weight: 400">份</span>
          </div>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :sm="12" :md="8">
        <ElCard style="border-radius: 14px" shadow="never">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
            <el-icon style="color: #0ea5e9"><Document /></el-icon>
            <div style="font-size: 13px; color: #64748b">覆盖学科</div>
          </div>
          <div style="font-weight: 800; font-size: 28px; color: #1e293b">
            {{ summary?.subjectSummary?.length || 0 }}
            <span style="font-size: 14px; color: #94a3b8; font-weight: 400">科</span>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px" v-loading="summaryLoading">
          <div style="font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px">
            <el-icon style="color: #6366f1"><TrendCharts /></el-icon>
            历次成绩曲线
          </div>
          <template v-if="summary?.scoreCurve?.length">
            <EChart :option="scoreCurveOption" :height="260" />
          </template>
          <template v-else>
            <ElEmpty description="暂无数据，快去发起一次自测吧" />
          </template>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; margin-bottom: 16px" v-loading="summaryLoading">
          <div style="font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px">
            <el-icon style="color: #8b5cf6"><Document /></el-icon>
            各学科自测次数
          </div>
          <template v-if="summary?.subjectSummary?.length">
            <EChart :option="subjectBarOption" :height="200" />
          </template>
          <template v-else>
            <ElEmpty description="暂无数据" />
          </template>
        </ElCard>

        <ElCard style="border-radius: 14px" v-loading="summaryLoading">
          <div style="font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between">
            <span style="display: flex; align-items: center; gap: 6px">
              <el-icon style="color: #dc2626"><Trophy /></el-icon>
              各学科掌握情况
            </span>
          </div>
          <template v-if="summary?.subjectSummary?.length">
            <div style="display: flex; flex-direction: column; gap: 10px">
              <div v-for="s in summary.subjectSummary" :key="s.subject" style="padding: 10px 12px; background: #f8fafc; border-radius: 10px">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px">
                  <div style="font-weight: 600; color: #1e293b">{{ s.subject }}</div>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap">
                    <ElTag size="small" effect="plain" type="primary">{{ s.count }}次</ElTag>
                    <ElTag size="small" effect="plain" type="success">均分率 {{ s.avgScore }}</ElTag>
                  </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px">
                  <div style="flex: 1">
                    <el-progress :percentage="Number(s.avgScore) || 0" :stroke-width="8" :show-text="false" />
                  </div>
                  <ElButton size="small" type="danger" plain @click="retryWrongOfSubject(s.subject)">
                    <el-icon style="margin-right: 2px"><Refresh /></el-icon>错题再练
                  </ElButton>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <ElEmpty description="暂无学科数据" />
          </template>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px" v-loading="loading">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px">
            <div style="font-weight: 700; display: flex; align-items: center; gap: 6px">
              <el-icon style="color: #6366f1"><Document /></el-icon>
              答卷列表
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
              <span style="font-size: 13px; color: #64748b">状态：</span>
              <ElSelect
                v-model="statusFilter"
                placeholder="全部状态"
                clearable
                style="width: 130px"
                @change="onStatusChange"
              >
                <ElOption label="进行中" value="草稿" />
                <ElOption label="已交卷" value="已提交" />
              </ElSelect>
              <span style="font-size: 13px; color: #64748b; margin-left: 4px">学科：</span>
              <ElSelect
                v-model="subjectFilter"
                placeholder="全部学科"
                clearable
                style="width: 140px"
                @change="onSubjectChange"
              >
                <ElOption v-for="s in config.subjects" :key="s" :label="s" :value="s" />
              </ElSelect>
              <ElButton @click="() => { loadSummary(); loadHistory(); }">刷新</ElButton>
            </div>
          </div>

          <template v-if="history.list.length > 0">
            <el-scrollbar max-height="460px">
              <ElTable :data="history.list" size="small" stripe style="width: 100%">
                <ElTableColumn label="序号" width="60" align="center">
                  <template #default="{ $index }">
                    {{ (page - 1) * pageSize + $index + 1 }}
                  </template>
                </ElTableColumn>
                <ElTableColumn label="状态" width="80" align="center">
                  <template #default="{ row }">
                    <ElTag v-if="row.status === '草稿'" type="warning" effect="dark">进行中</ElTag>
                    <ElTag v-else type="success" effect="plain">已交卷</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="subject" label="学科" width="70">
                  <template #default="{ row }">
                    <ElTag type="primary" effect="plain">{{ row.subject }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="difficulty" label="难度" width="70">
                  <template #default="{ row }">
                    <ElTag
                      :type="row.difficulty === '基础' ? 'success' : row.difficulty === '提高' ? 'warning' : row.difficulty === '挑战' ? 'danger' : 'info'"
                      effect="plain"
                    >
                      {{ row.difficulty }}
                    </ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="题目数" width="70" align="center" prop="questionCount" />
                <ElTableColumn label="进度/得分" width="140" align="center">
                  <template #default="{ row }">
                    <div v-if="row.status === '草稿'" style="font-weight: 600">
                      <span style="color: #b45309">已答 {{ row.answeredCount || 0 }}</span>
                      <span style="color: #94a3b8"> / {{ row.questionCount }} 题</span>
                    </div>
                    <div v-else style="font-weight: 700">
                      <span :style="{ color: getScoreColor(row) }">
                        {{ row.score || 0 }}
                      </span>
                      <span style="color: #94a3b8; font-weight: 400"> / {{ row.totalScore }}</span>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="正确率" width="100" align="center">
                  <template #default="{ row }">
                    <template v-if="row.accuracy !== null && row.accuracy !== undefined">
                      <ElTag :type="accTag(row.accuracy).type" effect="light">
                        {{ (row.accuracy * 100).toFixed(0) }}%
                      </ElTag>
                    </template>
                    <span v-else style="color: #94a3b8; font-size: 12px">-</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="用时" width="90" align="center">
                  <template #default="{ row }">
                    <template v-if="row.status === '草稿' && row.timeSpentSeconds">
                      {{ formatTime(row.timeSpentSeconds) }}
                    </template>
                    <template v-else-if="row.status === '已提交'">
                      {{ formatTime(row.timeSpentSeconds || 0) }}
                    </template>
                    <span v-else style="color: #94a3b8; font-size: 12px">-</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="类型" width="90" align="center">
                  <template #default="{ row }">
                    <ElTag v-if="row.sourceType === '错题再练'" type="danger" effect="light">错题再练</ElTag>
                    <ElTag v-else type="info" effect="plain">随机</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="时间" min-width="150">
                  <template #default="{ row }">
                    <div v-if="row.status === '草稿'" style="font-size: 12px; color: #64748b">
                      开始于 {{ row.startedAt }}
                    </div>
                    <div v-else style="font-size: 12px; color: #1e293b">
                      {{ row.submittedAt }}
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn label="操作" width="180" fixed="right" align="center">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 6px; justify-content: center">
                      <template v-if="row.status === '草稿'">
                        <ElButton size="small" type="warning" link @click="goContinueTake(row)">
                          继续作答
                        </ElButton>
                      </template>
                      <template v-else>
                        <ElButton size="small" type="primary" link @click="goToResult(row)">
                          查看成绩
                        </ElButton>
                        <ElButton size="small" link @click="goToTake(row)">
                          回看答题
                        </ElButton>
                      </template>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>

            <ElDivider style="margin: 12px 0" />
            <div style="display: flex; justify-content: flex-end">
              <ElPagination
                background
                layout="prev, pager, next, total"
                :current-page="page"
                :page-size="pageSize"
                :total="history.total"
                @current-change="onPageChange"
              />
            </div>
          </template>
          <template v-else>
            <ElEmpty description="暂无答卷记录，快去发起一次自测吧" />
          </template>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
