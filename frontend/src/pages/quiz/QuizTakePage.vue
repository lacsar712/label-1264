<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElRow,
  ElTag,
  ElRadioGroup,
  ElRadio,
  ElMessage,
  ElMessageBox,
  ElDivider,
  ElBadge,
  ElIcon,
  ElProgress,
  ElDialog,
} from 'element-plus'
import {
  Clock,
  Check,
  Close,
  ArrowLeft,
  ArrowRight,
  Document,
  Warning,
} from '@element-plus/icons-vue'
import { api } from '../../lib/api'
import {
  BLUE_50,
  BORDER_SLATE,
  GREEN_100,
  GREEN_50,
  GREEN_600,
  GREEN_700,
  INDIGO_50,
  INDIGO_500,
  RED_100,
  RED_50,
  RED_600,
  RED_800,
  SLATE_50,
  SLATE_500,
  WHITE,
} from '../../lib/themeColors'

const route = useRoute()
const router = useRouter()
const quizId = computed(() => parseInt(route.params.quizId))

const loading = ref(true)
const quiz = ref(null)
const currentIndex = ref(0)
const timeSpent = ref(0)
let timer = null

const feedbackVisible = ref(false)
const feedbackResult = ref(null)

const answerLockedMap = ref({})

const currentQuestion = computed(() => {
  if (!quiz.value?.questions) return null
  return quiz.value.questions[currentIndex.value]
})

const answeredCount = computed(() => {
  if (!quiz.value?.questions) return 0
  return quiz.value.questions.filter((q) => q.userAnswer).length
})

const progressPercent = computed(() => {
  if (!quiz.value?.questions?.length) return 0
  return Math.round((answeredCount.value / quiz.value.questions.length) * 100)
})

const isSubmitted = computed(() => quiz.value?.status === '已提交')

function formatTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const timeDisplay = computed(() => formatTime(timeSpent.value))

async function loadQuiz() {
  loading.value = true
  try {
    const res = await api.get(`/pages/quiz/${quizId.value}`)
    if (res.data.ok) {
      quiz.value = res.data.data
      const restored = {}
      for (const q of (quiz.value.questions || [])) {
        if (q.userAnswer && q.isCorrect !== undefined) {
          restored[q.id] = true
        }
      }
      answerLockedMap.value = restored
      if (quiz.value.status === '已提交' && quiz.value.timeSpentSeconds) {
        timeSpent.value = quiz.value.timeSpentSeconds
      }
      if (quiz.value.startedAt && !isSubmitted.value) {
        const elapsed = Math.floor((Date.now() - new Date(quiz.value.startedAt).getTime()) / 1000)
        timeSpent.value = Math.max(0, Math.min(elapsed, 86400))
      }
      const cq = currentQuestion.value
      if (cq && answerLockedMap.value[cq.id]) {
        feedbackResult.value = {
          isCorrect: cq.isCorrect,
          correctAnswer: cq.correctAnswer,
          analysis: cq.analysis,
        }
        feedbackVisible.value = true
      }
    } else {
      ElMessage.error(res.data.error?.message || '加载失败')
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadQuiz()
  if (!isSubmitted.value) {
    timer = setInterval(() => {
      timeSpent.value += 1
    }, 1000)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(currentIndex, () => {
  feedbackVisible.value = false
  feedbackResult.value = null
})

function diffTag(diff) {
  if (diff === '基础') return { type: 'success' }
  if (diff === '提高') return { type: 'warning' }
  if (diff === '挑战') return { type: 'danger' }
  return { type: 'info' }
}

async function selectAnswer(option) {
  if (isSubmitted.value) return
  const q = currentQuestion.value
  if (!q || answerLockedMap.value[q.id]) return

  const optionKey = Object.keys(q.options || {}).find((k) => q.options[k] === option)
  try {
    const res = await api.post(`/actions/quiz/${quizId.value}/answer/${q.id}`, {
      userAnswer: optionKey,
    })
    if (res.data.ok) {
      q.userAnswer = optionKey
      const result = res.data.data
      feedbackResult.value = {
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        analysis: result.analysis,
      }
      answerLockedMap.value[q.id] = true
      feedbackVisible.value = true
    }
  } catch (e) {
    console.error(e)
  }
}

function restoreFeedback(q) {
  if (q && answerLockedMap.value[q.id]) {
    feedbackResult.value = {
      isCorrect: q.isCorrect,
      correctAnswer: q.correctAnswer,
      analysis: q.analysis,
    }
    feedbackVisible.value = true
  } else {
    feedbackVisible.value = false
    feedbackResult.value = null
  }
}

function goPrev() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
    restoreFeedback(currentQuestion.value)
  }
}

function goNext() {
  if (currentIndex.value < quiz.value.questions.length - 1) {
    currentIndex.value += 1
    restoreFeedback(currentQuestion.value)
  }
}

function goTo(idx) {
  currentIndex.value = idx
  restoreFeedback(currentQuestion.value)
}

async function submitQuiz() {
  const unanswered = (quiz.value?.questions?.length || 0) - answeredCount.value
  let msg = '确认要交卷吗？'
  if (unanswered > 0) {
    msg = `还有 ${unanswered} 道题未作答，确认交卷？`
  }
  try {
    await ElMessageBox.confirm(msg, '交卷确认', {
      type: unanswered > 0 ? 'warning' : 'info',
      confirmButtonText: '确认交卷',
      cancelButtonText: '继续作答',
    })
  } catch {
    return
  }

  try {
    const res = await api.post(`/actions/quiz/${quizId.value}/submit`, {
      timeSpentSeconds: timeSpent.value,
    })
    if (res.data.ok) {
      if (timer) clearInterval(timer)
      ElMessage.success('交卷成功！')
      router.push(`/quiz/result/${quizId.value}`)
    }
  } catch (e) {
    console.error(e)
  }
}

function backToHistory() {
  router.push('/quiz/history')
}

function questionStatus(idx) {
  const q = quiz.value?.questions?.[idx]
  if (!q) return 'default'
  if (!q.userAnswer) return 'default'
  if (q.isCorrect) return 'success'
  return 'danger'
}

function getOptionBackground(key, text) {
  const q = currentQuestion.value
  if (!q) return WHITE
  if (isSubmitted.value) {
    if (key === q.correctAnswer) return GREEN_100
    if (key === q.userAnswer && !q.isCorrect) return RED_100
  }
  if (answerLockedMap.value[q.id]) {
    if (key === feedbackResult.value?.correctAnswer) return GREEN_100
    if (key === q.userAnswer && !feedbackResult.value?.isCorrect) return RED_100
  }
  return q.userAnswer && q.options[q.userAnswer] === text ? BLUE_50 : WHITE
}

function getFeedbackCardStyle() {
  const isCorrect = feedbackResult.value?.isCorrect || currentQuestion.value?.isCorrect
  return {
    borderRadius: '12px',
    background: isCorrect ? GREEN_50 : RED_50,
    border: isCorrect ? '1px solid #bbf7d0' : '1px solid #fecaca',
  }
}

function getFeedbackIconStyle() {
  const isCorrect = feedbackResult.value?.isCorrect || currentQuestion.value?.isCorrect
  return {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isCorrect ? GREEN_600 : RED_600,
    color: 'white',
  }
}

function getAnswerCardBackground(q, idx) {
  if (isSubmitted.value) {
    return q.isCorrect ? GREEN_100 : (q.userAnswer ? RED_100 : SLATE_50)
  }
  if (!q.userAnswer) return currentIndex.value === idx ? INDIGO_50 : SLATE_50
  return q.isCorrect ? GREEN_100 : RED_100
}

function getAnswerCardColor(q, idx) {
  if (isSubmitted.value) {
    return q.isCorrect ? GREEN_700 : (q.userAnswer ? RED_800 : SLATE_500)
  }
  if (!q.userAnswer) return SLATE_500
  return q.isCorrect ? GREEN_700 : RED_800
}

function getAnswerCardBorder(idx) {
  return currentIndex.value === idx ? `2px solid ${INDIGO_500}` : `1px solid ${BORDER_SLATE}`
}

const submitPreviewVisible = ref(false)
</script>

<template>
  <div style="padding: 16px 16px 22px; max-width: 1200px; margin: 0 auto">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px" v-loading="loading">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px">
            <div style="display: flex; align-items: center; gap: 14px">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div>
                <div style="font-weight: 800; font-size: 18px">
                  {{ quiz?.subject || '自测练习' }}
                  <ElTag v-if="isSubmitted" type="success" effect="light" style="margin-left: 8px">已提交</ElTag>
                  <ElTag v-else type="warning" effect="light" style="margin-left: 8px">答题中</ElTag>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap">
                  <span>难度：{{ quiz?.difficulty }}</span>
                  <span>共 {{ quiz?.questionCount }} 题</span>
                  <span>总分：{{ quiz?.totalScore }}</span>
                  <span style="display: flex; align-items: center; gap: 4px">
                    <el-icon><Clock /></el-icon>用时：{{ timeDisplay }}
                  </span>
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <ElButton @click="backToHistory">历史记录</ElButton>
              <ElButton v-if="!isSubmitted" type="primary" @click="submitQuiz">
                <el-icon style="margin-right: 4px"><Check /></el-icon>
                交卷
              </ElButton>
            </div>
          </div>
          <ElDivider style="margin: 14px 0" />
          <div style="display: flex; align-items: center; gap: 12px">
            <div style="flex-shrink: 0; min-width: 120px; font-size: 13px; color: #64748b">
              答题进度 {{ answeredCount }}/{{ quiz?.questionCount }}
            </div>
            <div style="flex: 1; max-width: 500px">
              <ElProgress :percentage="progressPercent" :stroke-width="10" :show-text="false" />
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :md="17">
        <ElCard style="border-radius: 14px" v-loading="loading">
          <template v-if="currentQuestion">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px">
              <div style="flex: 1; min-width: 0">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px">
                  <ElTag type="primary" effect="plain">第 {{ currentIndex + 1 }} 题</ElTag>
                  <ElTag v-if="currentQuestion.knowledgePoint" type="info" effect="plain">{{ currentQuestion.knowledgePoint }}</ElTag>
                  <ElTag :type="diffTag(currentQuestion.difficulty).type" effect="plain">{{ currentQuestion.difficulty }}</ElTag>
                  <ElTag type="warning" effect="plain">{{ currentQuestion.score }} 分</ElTag>
                  <ElTag v-if="isSubmitted" :type="currentQuestion.isCorrect ? 'success' : 'danger'" effect="light">
                    {{ currentQuestion.isCorrect ? '正确' : '错误' }}
                  </ElTag>
                </div>
                <div style="font-size: 16px; line-height: 1.8; color: #0f172a; font-weight: 500; white-space: pre-wrap">
                  {{ currentQuestion.content }}
                </div>
              </div>
            </div>

            <div style="margin-top: 18px">
              <ElRadioGroup
                :model-value="currentQuestion.userAnswer ? currentQuestion.options[currentQuestion.userAnswer] : ''"
                :disabled="isSubmitted || answerLockedMap[currentQuestion.id]"
                style="width: 100%"
              >
                <div
                  v-for="(text, key) in (currentQuestion.options || {})"
                  :key="key"
                  :style="{
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    marginBottom: '10px',
                    cursor: (isSubmitted || answerLockedMap[currentQuestion.id]) ? 'default' : 'pointer',
                    background: getOptionBackground(key, text),
                    transition: 'all 0.2s',
                  }"
                  @click="() => selectAnswer(text)"
                >
                  <div style="display: flex; align-items: flex-start; gap: 10px">
                    <ElRadio
                      :label="text"
                      :disabled="isSubmitted || answerLockedMap[currentQuestion.id]"
                      :value="text"
                    >
                      <span style="font-weight: 600; margin-right: 4px">{{ key }}.</span>
                      <span style="color: #334155; line-height: 1.7">{{ text }}</span>
                    </ElRadio>
                  </div>
                </div>
              </ElRadioGroup>
            </div>

            <transition name="fade">
              <div v-if="(feedbackVisible && feedbackResult) || isSubmitted" style="margin-top: 18px">
                <ElDivider />
                <ElCard
                  shadow="never"
                  :style="getFeedbackCardStyle()"
                >
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
                    <div
                      :style="getFeedbackIconStyle()"
                    >
                      <el-icon><Check v-if="feedbackResult?.isCorrect || currentQuestion.isCorrect" /><Close v-else /></el-icon>
                    </div>
                    <div style="font-weight: 700; font-size: 15px">
                      {{ feedbackResult?.isCorrect || currentQuestion.isCorrect ? '回答正确！' : '回答错误' }}
                    </div>
                    <ElTag v-if="!(feedbackResult?.isCorrect || currentQuestion.isCorrect)" type="warning" effect="plain">
                      已自动加入错题本
                    </ElTag>
                  </div>
                  <div style="color: #475569; font-size: 14px; margin-bottom: 8px">
                    <span style="font-weight: 600">正确答案：</span>
                    <span style="color: #16a34a; font-weight: 700">
                      {{ isSubmitted ? currentQuestion.correctAnswer : feedbackResult?.correctAnswer }}
                    </span>
                    <span v-if="currentQuestion.userAnswer && currentQuestion.userAnswer !== (isSubmitted ? currentQuestion.correctAnswer : feedbackResult?.correctAnswer)" style="margin-left: 14px">
                      <span style="font-weight: 600">你的答案：</span>
                      <span style="color: #dc2626; font-weight: 700">{{ currentQuestion.userAnswer }}</span>
                    </span>
                  </div>
                  <div v-if="isSubmitted ? currentQuestion.analysis : feedbackResult?.analysis" style="color: #334155; line-height: 1.8; padding: 10px 14px; background: white; border-radius: 8px; margin-top: 8px">
                    <div style="font-weight: 600; margin-bottom: 4px; color: #1e293b">📖 解析</div>
                    <div style="white-space: pre-wrap">{{ isSubmitted ? currentQuestion.analysis : feedbackResult?.analysis }}</div>
                  </div>
                </ElCard>
              </div>
            </transition>

            <div style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px">
              <ElButton :disabled="currentIndex === 0" @click="goPrev">
                <el-icon style="margin-right: 4px"><ArrowLeft /></el-icon>
                上一题
              </ElButton>
              <div style="color: #94a3b8; font-size: 13px">
                {{ currentIndex + 1 }} / {{ quiz?.questionCount }}
              </div>
              <ElButton v-if="currentIndex < (quiz?.questionCount || 1) - 1" type="primary" @click="goNext">
                下一题
                <el-icon style="margin-left: 4px"><ArrowRight /></el-icon>
              </ElButton>
              <ElButton v-else-if="!isSubmitted" type="primary" @click="submitQuiz">
                <el-icon style="margin-right: 4px"><Check /></el-icon>
                交卷
              </ElButton>
            </div>
          </template>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :md="7">
        <ElCard style="border-radius: 14px; position: sticky; top: 16px">
          <div style="font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 6px">
            <el-icon style="color: #6366f1"><Document /></el-icon>
            答题卡
          </div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px">
            <div
              v-for="(q, idx) in (quiz?.questions || [])"
              :key="idx"
              @click="goTo(idx)"
              :style="{
                height: 36,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                userSelect: 'none',
                border: getAnswerCardBorder(idx),
                background: getAnswerCardBackground(q, idx),
                color: getAnswerCardColor(q, idx),
                transition: 'all 0.15s',
              }"
            >
              {{ idx + 1 }}
            </div>
          </div>

          <ElDivider style="margin: 14px 0" />
          <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #64748b">
            <div style="display: flex; align-items: center; gap: 4px">
              <div style="width: 14px; height: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px"></div>
              未答
            </div>
            <div style="display: flex; align-items: center; gap: 4px">
              <div style="width: 14px; height: 14px; background: #dcfce7; border-radius: 3px"></div>
              正确
            </div>
            <div style="display: flex; align-items: center; gap: 4px">
              <div style="width: 14px; height: 14px; background: #fee2e2; border-radius: 3px"></div>
              错误
            </div>
            <div style="display: flex; align-items: center; gap: 4px">
              <div style="width: 14px; height: 14px; background: #eef2ff; border: 2px solid #6366f1; border-radius: 3px"></div>
              当前
            </div>
          </div>

          <ElDivider style="margin: 14px 0" />
          <div style="background: #f8fafc; padding: 12px; border-radius: 10px">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 6px">已答题目</div>
            <div style="font-weight: 700; font-size: 22px; color: #1e293b">
              {{ answeredCount }}
              <span style="font-size: 14px; color: #94a3b8; font-weight: 400">/ {{ quiz?.questionCount }}</span>
            </div>
            <div style="margin-top: 10px">
              <ElProgress :percentage="progressPercent" :stroke-width="8" />
            </div>
          </div>

          <div v-if="!isSubmitted" style="margin-top: 14px">
            <ElButton type="primary" style="width: 100%" @click="submitQuiz">
              <el-icon style="margin-right: 4px"><Check /></el-icon>
              提交试卷
            </ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
