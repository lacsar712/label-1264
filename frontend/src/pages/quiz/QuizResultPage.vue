<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElRow,
  ElTag,
  ElTable,
  ElTableColumn,
  ElProgress,
  ElDivider,
  ElIcon,
  ElMessage,
  ElMessageBox,
  ElEmpty,
  ElBadge,
} from 'element-plus'
import {
  Trophy,
  Clock,
  Check,
  Close,
  Refresh,
  ArrowLeft,
  Document,
  MagicStick,
  Warning,
} from '@element-plus/icons-vue'
import EChart from '../../components/EChart.vue'
import { api } from '../../lib/api'

const route = useRoute()
const router = useRouter()
const quizId = computed(() => parseInt(route.params.quizId))

const loading = ref(true)
const quiz = ref(null)

async function loadQuiz() {
  loading.value = true
  try {
    const res = await api.get(`/pages/quiz/${quizId.value}`)
    if (res.data.ok) {
      quiz.value = res.data.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadQuiz)

const wrongQuestions = computed(() => {
  return (quiz.value?.questions || []).filter((q) => !q.isCorrect)
})

const scoreRate = computed(() => {
  if (!quiz.value?.totalScore) return 0
  return Math.round((Number(quiz.value.score || 0) / Number(quiz.value.totalScore)) * 100)
})

const accuracyRate = computed(() => {
  if (!quiz.value?.questionCount) return 0
  return Math.round((Number(quiz.value.correctCount || 0) / Number(quiz.value.questionCount)) * 100)
})

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}分${s}秒`
}

const scoreGrade = computed(() => {
  const r = scoreRate.value
  if (r >= 90) return { text: '优秀', color: '#16a34a', bg: '#dcfce7' }
  if (r >= 80) return { text: '良好', color: '#0284c7', bg: '#e0f2fe' }
  if (r >= 60) return { text: '及格', color: '#ca8a04', bg: '#fef9c3' }
  return { text: '待提高', color: '#dc2626', bg: '#fee2e2' }
})

const pieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, left: 'center' },
  series: [
    {
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      label: { show: false },
      labelLine: { show: false },
      data: [
        {
          name: '正确',
          value: quiz.value?.correctCount || 0,
          itemStyle: { color: '#22c55e' },
        },
        {
          name: '错误',
          value: (quiz.value?.questionCount || 0) - (quiz.value?.correctCount || 0),
          itemStyle: { color: '#ef4444' },
        },
      ],
    },
  ],
}))

async function retryFromWrongs() {
  if (wrongQuestions.value.length === 0) {
    ElMessage.info('暂无错题，无需再练')
    return
  }
  try {
    await ElMessageBox.confirm(
      `将基于本次 ${wrongQuestions.value.length} 道错题发起针对性再练，确认开始？`,
      '错题再练',
      { type: 'info', confirmButtonText: '开始再练', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  try {
    const res = await api.post('/actions/quiz/create', {
      subject: quiz.value.subject,
      difficulty: '混合',
      questionCount: wrongQuestions.value.length,
      sourceType: '错题再练',
    })
    if (res.data.ok) {
      ElMessage.success('已为你生成错题再练试卷！')
      router.push(`/quiz/take/${res.data.data.quizId}`)
    }
  } catch (e) {
    console.error(e)
  }
}

function goCreate() {
  router.push('/quiz/create')
}

function goHistory() {
  router.push('/quiz/history')
}

function goProgress() {
  router.push('/progress')
}

function goPrev() {
  router.push(`/quiz/take/${quizId.value}`)
}
</script>

<template>
  <div style="padding: 16px 16px 22px; max-width: 1200px; margin: 0 auto">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard
          style="border-radius: 14px; overflow: hidden"
          :body-style="{ padding: 0 }"
          v-loading="loading"
        >
          <div
            :style="{
              padding: '28px 24px',
              background: `linear-gradient(135deg, ${scoreRate >= 80 ? '#22c55e' : scoreRate >= 60 ? '#f59e0b' : '#ef4444'} 0%, ${scoreRate >= 80 ? '#16a34a' : scoreRate >= 60 ? '#d97706' : '#dc2626'} 100%)`,
              color: 'white',
            }"
          >
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px">
              <div style="display: flex; align-items: center; gap: 18px">
                <div style="width: 64px; height: 64px; border-radius: 18px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center">
                  <el-icon :size="34"><Trophy /></el-icon>
                </div>
                <div>
                  <div style="font-weight: 800; font-size: 22px">交卷完成</div>
                  <div style="font-size: 14px; opacity: 0.92; margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap">
                    <span>{{ quiz?.subject }}</span>
                    <span>{{ quiz?.difficulty }}</span>
                    <span>{{ quiz?.questionCount }} 题</span>
                    <ElTag v-if="quiz?.sourceType === '错题再练'" effect="dark" style="background: rgba(255,255,255,0.25); border: none; color: white">错题再练</ElTag>
                  </div>
                </div>
              </div>
              <div style="text-align: right">
                <div style="font-size: 13px; opacity: 0.85; margin-bottom: 6px">本次得分</div>
                <div style="font-weight: 800; font-size: 40px; line-height: 1">
                  {{ quiz?.score || 0 }}
                  <span style="font-size: 18px; font-weight: 400; opacity: 0.8; margin-left: 2px">/ {{ quiz?.totalScore }}</span>
                </div>
                <ElTag effect="dark" :style="{ marginTop: '8px', background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', fontWeight: 600 }">
                  {{ scoreGrade.text }} · {{ scoreRate }}%
                </ElTag>
              </div>
            </div>
          </div>
          <div style="padding: 16px 24px 20px">
            <ElRow :gutter="12">
              <ElCol :xs="12" :sm="6">
                <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: #f8fafc">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 6px">正确题数</div>
                  <div style="font-weight: 800; font-size: 22px; color: #16a34a; display: flex; align-items: center; justify-content: center; gap: 4px">
                    <el-icon><Check /></el-icon>
                    {{ quiz?.correctCount || 0 }}
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :xs="12" :sm="6">
                <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: #f8fafc">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 6px">错误题数</div>
                  <div style="font-weight: 800; font-size: 22px; color: #dc2626; display: flex; align-items: center; justify-content: center; gap: 4px">
                    <el-icon><Close /></el-icon>
                    {{ (quiz?.questionCount || 0) - (quiz?.correctCount || 0) }}
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :xs="12" :sm="6">
                <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: #f8fafc">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 6px">正确率</div>
                  <div style="font-weight: 800; font-size: 22px; color: #0369a1; display: flex; align-items: center; justify-content: center; gap: 4px">
                    {{ accuracyRate }}%
                  </div>
                </ElCard>
              </ElCol>
              <ElCol :xs="12" :sm="6">
                <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: #f8fafc">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 3px">
                    <el-icon><Clock /></el-icon>
                    用时
                  </div>
                  <div style="font-weight: 800; font-size: 22px; color: #7c3aed">
                    {{ formatTime(quiz?.timeSpentSeconds || 0) }}
                  </div>
                </ElCard>
              </ElCol>
            </ElRow>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="15">
        <ElCard style="border-radius: 14px" v-loading="loading">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700">
              <el-icon style="color: #dc2626"><Warning /></el-icon>
              错题清单
              <ElBadge v-if="wrongQuestions.length" :value="wrongQuestions.length" type="danger" style="margin-left: 6px" />
            </div>
            <ElButton
              v-if="wrongQuestions.length"
              type="danger"
              size="small"
              @click="retryFromWrongs"
            >
              <el-icon style="margin-right: 4px"><Refresh /></el-icon>
              针对错题再练
            </ElButton>
          </div>

          <template v-if="wrongQuestions.length > 0">
            <el-scrollbar max-height="440px">
              <div
                v-for="(q, idx) in wrongQuestions"
                :key="q.id"
                style="padding: 14px 16px; border: 1px solid #fee2e2; border-radius: 10px; background: #fef2f2; margin-bottom: 12px"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px">
                  <div style="display: flex; gap: 6px; flex-wrap: wrap">
                    <ElTag type="danger" effect="light">错题 {{ idx + 1 }}</ElTag>
                    <ElTag v-if="q.knowledgePoint" type="info" effect="plain">{{ q.knowledgePoint }}</ElTag>
                    <ElTag type="warning" effect="plain">{{ q.difficulty }}</ElTag>
                  </div>
                  <ElTag type="primary" effect="plain">{{ q.score }} 分</ElTag>
                </div>
                <div style="font-size: 15px; line-height: 1.8; color: #0f172a; font-weight: 500; margin-bottom: 10px; white-space: pre-wrap">
                  {{ q.content }}
                </div>
                <div style="font-size: 14px; line-height: 1.8; color: #475569; margin-bottom: 8px">
                  <div v-for="(text, key) in (q.options || {})" :key="key" :style="{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    marginTop: '4px',
                    background: key === q.correctAnswer ? '#dcfce7' : (key === q.userAnswer ? '#fee2e2' : '#fff'),
                    borderLeft: `3px solid ${key === q.correctAnswer ? '#16a34a' : (key === q.userAnswer ? '#dc2626' : '#e2e8f0')}`,
                  }">
                    <span style="font-weight: 600">{{ key }}.</span> {{ text }}
                    <span v-if="key === q.correctAnswer" style="color: #166534; margin-left: 8px; font-weight: 600">✓ 正确答案</span>
                    <span v-else-if="key === q.userAnswer" style="color: #991b1b; margin-left: 8px; font-weight: 600">✗ 你的选择</span>
                  </div>
                </div>
                <div v-if="q.analysis" style="padding: 10px 14px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.8; color: #334155; font-size: 13px">
                  <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px">📖 解析</div>
                  <div style="white-space: pre-wrap">{{ q.analysis }}</div>
                </div>
              </div>
            </el-scrollbar>
          </template>
          <template v-else>
            <ElEmpty description="太棒了！本次答题全部正确 🎉" />
          </template>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="9">
        <ElCard style="border-radius: 14px; margin-bottom: 16px">
          <div style="font-weight: 700; margin-bottom: 10px">答题分布</div>
          <EChart :option="pieOption" :height="220" />
        </ElCard>

        <ElCard style="border-radius: 14px">
          <div style="font-weight: 700; margin-bottom: 10px">快捷操作</div>
          <div style="display: flex; flex-direction: column; gap: 8px">
            <ElButton type="primary" size="large" @click="retryFromWrongs" :disabled="wrongQuestions.length === 0">
              <el-icon style="margin-right: 4px"><Refresh /></el-icon>
              从错题一键再练
            </ElButton>
            <ElButton size="large" @click="goCreate">
              <el-icon style="margin-right: 4px"><MagicStick /></el-icon>
              发起新自测
            </ElButton>
            <ElButton size="large" @click="goHistory">
              <el-icon style="margin-right: 4px"><Document /></el-icon>
              查看历史记录
            </ElButton>
            <ElButton size="large" @click="goProgress">
              <el-icon style="margin-right: 4px"><Trophy /></el-icon>
              学习进度总览
            </ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
