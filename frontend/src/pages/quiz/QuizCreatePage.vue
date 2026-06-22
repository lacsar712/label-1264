<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElRow,
  ElSelect,
  ElOption,
  ElForm,
  ElFormItem,
  ElRadioGroup,
  ElRadioButton,
  ElInputNumber,
  ElMessage,
  ElLoading,
  ElTag,
} from 'element-plus'
import { DocumentAdd, MagicStick, Histogram } from '@element-plus/icons-vue'
import { api } from '../../lib/api'
import { useAuth } from '../../stores/auth'

const router = useRouter()
const { state } = useAuth()
const loading = ref(false)
const config = ref({ subjects: [], difficulties: [] })

const form = ref({
  subject: '数学',
  difficulty: '混合',
  questionCount: 10,
  sourceType: '随机',
})

async function loadConfig() {
  try {
    const res = await api.get('/pages/quiz/config')
    if (res.data.ok) {
      config.value = res.data.data
      const pref = state.user?.subjectPreference
      if (Array.isArray(pref) && pref.length > 0 && config.value.subjects.includes(pref[0])) {
        form.value.subject = pref[0]
      } else if (!form.value.subject && config.value.subjects.length) {
        form.value.subject = config.value.subjects[0]
      }
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadConfig)

const summary = computed(() => {
  return `${form.value.subject} · ${form.value.difficulty} · ${form.value.questionCount}题`
})

async function createQuiz() {
  if (!form.value.subject) {
    ElMessage.warning('请选择学科')
    return
  }
  loading.value = true
  const loadingIns = ElLoading.service({ text: '正在组卷中...' })
  try {
    const res = await api.post('/actions/quiz/create', form.value)
    if (res.data.ok) {
      ElMessage.success('组卷成功，开始答题！')
      router.push(`/quiz/take/${res.data.data.quizId}`)
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
    loadingIns.close()
  }
}

function goToHistory() {
  router.push('/quiz/history')
}
</script>

<template>
  <div style="padding: 16px 16px 22px; max-width: 1100px; margin: 0 auto">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px">
            <div style="display: flex; align-items: center; gap: 14px">
              <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center">
                <el-icon :size="28"><DocumentAdd /></el-icon>
              </div>
              <div>
                <div style="font-weight: 800; font-size: 20px">自测练习 · 随机组卷</div>
                <div style="font-size: 13px; opacity: 0.9; margin-top: 4px">选择学科与难度，系统智能选题，即时反馈解析</div>
              </div>
            </div>
            <ElButton type="warning" @click="goToHistory">
              <el-icon style="margin-right: 4px"><Histogram /></el-icon>
              历史记录
            </ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="14">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 16px">组卷配置</div>
          <ElForm :model="form" label-width="100px" label-position="left">
            <ElFormItem label="学科" required>
              <ElSelect v-model="form.subject" style="width: 100%" placeholder="请选择学科">
                <ElOption v-for="s in config.subjects" :key="s" :label="s" :value="s" />
              </ElSelect>
            </ElFormItem>

            <ElFormItem label="难度">
              <ElRadioGroup v-model="form.difficulty" style="width: 100%">
                <ElRadioButton v-for="d in config.difficulties" :key="d" :label="d">{{ d }}</ElRadioButton>
              </ElRadioGroup>
            </ElFormItem>

            <ElFormItem label="题目数量">
              <ElInputNumber v-model="form.questionCount" :min="5" :max="50" :step="5" controls-position="right" />
              <span style="margin-left: 10px; color: #64748b; font-size: 13px">题</span>
            </ElFormItem>

            <ElFormItem label="来源类型">
              <ElRadioGroup v-model="form.sourceType">
                <ElRadioButton label="随机">
                  <el-icon style="vertical-align: -2px; margin-right: 2px"><MagicStick /></el-icon>
                  随机选题
                </ElRadioButton>
                <ElRadioButton label="错题再练">
                  <el-icon style="vertical-align: -2px; margin-right: 2px"><DocumentAdd /></el-icon>
                  错题优先
                </ElRadioButton>
              </ElRadioGroup>
            </ElFormItem>
          </ElForm>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap">
            <div>
              <div style="font-size: 12px; color: #94a3b8">本次组卷配置</div>
              <div style="font-weight: 700; font-size: 16px; margin-top: 4px">
                <ElTag type="primary" effect="light" style="margin-right: 6px">{{ summary }}</ElTag>
                <ElTag v-if="form.sourceType === '错题再练'" type="danger" effect="light">错题再练模式</ElTag>
              </div>
            </div>
            <ElButton type="primary" size="large" :loading="loading" @click="createQuiz">
              <el-icon style="margin-right: 4px"><MagicStick /></el-icon>
              开始组卷答题
            </ElButton>
          </div>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 14px">使用说明</div>
          <el-scrollbar height="360px">
            <div style="line-height: 1.9; color: #475569">
              <div style="font-weight: 700; color: #1e293b; margin-top: 4px">📋 组卷规则</div>
              <div style="font-size: 13px">1. 系统根据学科和难度从题库随机抽取题目</div>
              <div style="font-size: 13px">2. 「错题再练」模式会优先抽取你的历史错题</div>
              <div style="font-size: 13px">3. 题型以单选题为主，每题附有详细解析</div>

              <div style="font-weight: 700; color: #1e293b; margin-top: 18px">⚡ 即时反馈</div>
              <div style="font-size: 13px">1. 每道题作答后立即显示正误与解析</div>
              <div style="font-size: 13px">2. 答错的题目自动加入错题本</div>
              <div style="font-size: 13px">3. 错题次数越多，掌握度标记越低</div>

              <div style="font-weight: 700; color: #1e293b; margin-top: 18px">✅ 交卷锁定</div>
              <div style="font-size: 13px">1. 提交后答卷锁定，不可修改答案</div>
              <div style="font-size: 13px">2. 交卷页显示总分、用时和错题清单</div>
              <div style="font-size: 13px">3. 可从错题一键发起针对性再练</div>

              <div style="font-weight: 700; color: #1e293b; margin-top: 18px">📈 学习记录</div>
              <div style="font-size: 13px">1. 所有答卷历史持久化保存</div>
              <div style="font-size: 13px">2. 学习进度页显示最近自测摘要</div>
              <div style="font-size: 13px">3. 可查看历次成绩曲线与错题回顾</div>
            </div>
          </el-scrollbar>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
