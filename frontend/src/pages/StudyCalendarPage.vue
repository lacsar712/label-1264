<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElCard, ElButton, ElRow, ElCol, ElTag, ElDrawer, ElTable, ElTableColumn, ElEmpty, ElSkeleton, ElStatistic, ElIcon } from 'element-plus'
import {
  DArrowLeft,
  DArrowRight,
  Calendar,
  Back,
  Clock,
  Check,
  Document,
  EditPen,
} from '@element-plus/icons-vue'
import { api } from '../lib/api'

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const calendarData = ref(null)
const loading = ref(false)
const drawerVisible = ref(false)
const selectedDate = ref(null)
const dayDetail = ref(null)
const dayDetailLoading = ref(false)

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const intensityColors = {
  0: 'background-color: #f1f5f9;',
  1: 'background-color: #dbeafe;',
  2: 'background-color: #93c5fd;',
  3: 'background-color: #60a5fa;',
  4: 'background-color: #3b82f6;',
  5: 'background-color: #1d4ed8;',
}

const intensityTextColors = {
  0: 'color: #94a3b8;',
  1: 'color: #1e40af;',
  2: 'color: #1e3a8a;',
  3: 'color: #ffffff;',
  4: 'color: #ffffff;',
  5: 'color: #ffffff;',
}

const displayMonth = computed(() => `${currentYear.value}年 ${monthNames[currentMonth.value - 1]}`)

const calendarGrid = computed(() => {
  if (!calendarData.value?.calendarDays) return []
  
  const days = calendarData.value.calendarDays
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1).getDay()
  
  const grid = []
  for (let i = 0; i < firstDay; i += 1) {
    grid.push({ empty: true })
  }
  for (const day of days) {
    grid.push({ empty: false, ...day })
  }
  while (grid.length % 7 !== 0) {
    grid.push({ empty: true })
  }
  
  return grid
})

async function loadCalendarData() {
  loading.value = true
  try {
    const res = await api.get('/pages/calendar/month', {
      params: { year: currentYear.value, month: currentMonth.value },
    })
    if (res.data.ok) {
      calendarData.value = res.data.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadDayDetail(date) {
  dayDetailLoading.value = true
  try {
    const res = await api.get('/pages/calendar/day', { params: { date } })
    if (res.data.ok) {
      dayDetail.value = res.data.data
    }
  } catch (e) {
    console.error(e)
  } finally {
    dayDetailLoading.value = false
  }
}

function handleDateClick(day) {
  if (!day.hasData && !day.isToday) return
  selectedDate.value = day.date
  drawerVisible.value = true
  loadDayDetail(day.date)
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
  loadCalendarData()
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
  loadCalendarData()
}

function goToToday() {
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth() + 1
  loadCalendarData()
}

function diffColor(d) {
  if (d === '基础') return '#22c55e'
  if (d === '提高') return '#f59e0b'
  if (d === '挑战') return '#ef4444'
  return '#6366f1'
}

onMounted(loadCalendarData)
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
            <div style="display: flex; align-items: center; gap: 12px">
              <el-icon :size="24" style="color: #2563eb"><Calendar /></el-icon>
              <div>
                <div style="font-weight: 800; font-size: 18px">学习日历</div>
                <div style="font-size: 12px; color: #64748b">热力图 · 学习强度可视化</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px">
              <ElButton :icon="DArrowLeft" circle @click="prevMonth" />
              <div style="font-weight: 700; font-size: 16px; min-width: 140px; text-align: center">{{ displayMonth }}</div>
              <ElButton :icon="DArrowRight" circle @click="nextMonth" />
              <ElButton type="primary" :icon="Back" @click="goToToday">本月</ElButton>
            </div>
          </div>

          <ElRow :gutter="16" style="margin-top: 20px">
            <ElCol :xs="24" :lg="17">
              <ElCard shadow="never" style="border-radius: 12px; border: 1px solid #e2e8f0">
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px">
                  <div
                    v-for="w in weekDays"
                    :key="w"
                    style="text-align: center; font-weight: 600; font-size: 13px; color: #64748b; padding: 8px 0"
                  >
                    {{ w }}
                  </div>
                </div>
                <ElSkeleton :loading="loading" animated>
                  <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px">
                    <div
                      v-for="(cell, idx) in calendarGrid"
                      :key="idx"
                      class="calendar-cell-wrapper"
                    >
                      <div
                        v-if="!cell.empty"
                        class="calendar-cell"
                        :style="[
                          intensityColors[cell.intensityLevel],
                          cell.hasData || cell.isToday ? 'cursor: pointer;' : '',
                          cell.isToday ? 'border: 2px solid #f59e0b;' : '',
                        ]"
                        @click="handleDateClick(cell)"
                      >
                        <div class="cell-day" :style="intensityTextColors[cell.intensityLevel]">
                          {{ cell.day }}
                        </div>
                        <div v-if="cell.consecutiveDays >= 3" class="consecutive-badge">
                          {{ cell.consecutiveDays }}天
                        </div>
                        <div v-if="cell.hasData" class="cell-minutes" :style="intensityTextColors[cell.intensityLevel]">
                          {{ cell.totalMinutes }}分钟
                        </div>
                      </div>
                      <div v-else class="calendar-cell-empty"></div>
                    </div>
                  </div>
                </ElSkeleton>

                <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e2e8f0">
                  <div style="font-size: 12px; color: #64748b; font-weight: 600">学习强度:</div>
                  <div v-for="level in 6" :key="level" style="display: flex; align-items: center; gap: 4px">
                    <div
                      class="legend-box"
                      :style="intensityColors[level - 1]"
                    ></div>
                    <span style="font-size: 11px; color: #64748b">
                      {{ level === 1 ? '<30' : level === 2 ? '30-60' : level === 3 ? '60-90' : level === 4 ? '90-120' : level === 5 ? '≥120' : '无' }}
                    </span>
                  </div>
                </div>
              </ElCard>
            </ElCol>

            <ElCol :xs="24" :lg="7">
              <ElCard shadow="never" style="border-radius: 12px; border: 1px solid #e2e8f0; height: 100%">
                <div style="font-weight: 700; margin-bottom: 12px">本月统计</div>
                <ElSkeleton :loading="loading" animated>
                  <div v-if="calendarData?.monthSummary" style="display: flex; flex-direction: column; gap: 12px">
                    <div class="stat-item">
                      <ElStatistic title="学习天数" :value="calendarData.monthSummary.studyDays" :suffix="`/ ${calendarData.monthSummary.totalDays} 天`" />
                    </div>
                    <div class="stat-item">
                      <ElStatistic title="总学习时长" :value="calendarData.monthSummary.totalMinutes" suffix="分钟" />
                    </div>
                    <div class="stat-item">
                      <ElStatistic title="日均学习" :value="calendarData.monthSummary.avgMinutesPerDay" suffix="分钟" />
                    </div>
                    <div class="stat-item">
                      <ElStatistic title="最长连续" :value="calendarData.monthSummary.maxConsecutiveDays" suffix="天" />
                    </div>
                  </div>
                </ElSkeleton>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px dashed #e2e8f0">
                  <div style="font-weight: 700; margin-bottom: 12px">学科分布</div>
                  <ElSkeleton :loading="loading" animated>
                    <div v-if="calendarData?.calendarDays" style="display: flex; flex-wrap: wrap; gap: 6px">
                      <ElTag
                        v-for="subject in ['语文', '数学', '英语', '物理', '化学', '生物']"
                        :key="subject"
                        size="small"
                        type="primary"
                        effect="plain"
                      >
                        {{ subject }}
                      </ElTag>
                    </div>
                  </ElSkeleton>
                </div>
              </ElCard>
            </ElCol>
          </ElRow>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDrawer
      v-model="drawerVisible"
      :title="`${selectedDate} 学习详情`"
      direction="rtl"
      size="520px"
    >
      <ElSkeleton :loading="dayDetailLoading" animated>
        <div v-if="dayDetail">
          <ElRow :gutter="12" style="margin-bottom: 16px">
            <ElCol :span="8">
              <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)">
                <el-icon :size="20" style="color: #2563eb"><Clock /></el-icon>
                <div style="font-size: 11px; color: #3b82f6; margin-top: 4px">学习时长</div>
                <div style="font-weight: 800; font-size: 20px; color: #1d4ed8; margin-top: 2px">{{ dayDetail.summary.totalMinutes }}分钟</div>
              </ElCard>
            </ElCol>
            <ElCol :span="8">
              <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)">
                <el-icon :size="20" style="color: #16a34a"><Check /></el-icon>
                <div style="font-size: 11px; color: #22c55e; margin-top: 4px">完成资源</div>
                <div style="font-weight: 800; font-size: 20px; color: #15803d; margin-top: 2px">{{ dayDetail.summary.totalCompleted }}个</div>
              </ElCard>
            </ElCol>
            <ElCol :span="8">
              <ElCard shadow="never" style="border-radius: 10px; text-align: center; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)">
                <el-icon :size="20" style="color: #d97706"><EditPen /></el-icon>
                <div style="font-size: 11px; color: #f59e0b; margin-top: 4px">平均正确率</div>
                <div style="font-weight: 800; font-size: 20px; color: #b45309; margin-top: 2px">{{ (dayDetail.summary.avgAccuracy * 100).toFixed(1) }}%</div>
              </ElCard>
            </ElCol>
          </ElRow>

          <ElCard v-if="dayDetail.subjectBreakdown?.length" shadow="never" style="border-radius: 12px; margin-bottom: 16px">
            <div style="font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px">
              <el-icon :size="16" style="color: #2563eb"><Document /></el-icon>
              学科学习明细
            </div>
            <ElTable :data="dayDetail.subjectBreakdown" size="small">
              <ElTableColumn prop="subject" label="学科" width="70" />
              <ElTableColumn prop="studyMinutes" label="时长(分钟)" width="100" />
              <ElTableColumn prop="completedCount" label="完成数" width="80" />
              <ElTableColumn prop="targetAchieveRate" label="目标达成" width="100">
                <template #default="{ row }">
                  <ElTag type="info" effect="plain">{{ (Number(row.targetAchieveRate) * 100).toFixed(1) }}%</ElTag>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="note" label="备注" min-width="120" />
            </ElTable>
          </ElCard>

          <ElCard v-if="dayDetail.resources?.length" shadow="never" style="border-radius: 12px; margin-bottom: 16px">
            <div style="font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px">
              <el-icon :size="16" style="color: #8b5cf6"><Document /></el-icon>
              学习资源 ({{ dayDetail.resources.length }})
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px">
              <div
                v-for="r in dayDetail.resources"
                :key="r.resourceId"
                style="padding: 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px">
                  <div style="flex: 1; min-width: 0">
                    <div style="font-weight: 600; color: #1e293b">{{ r.resourceName }}</div>
                    <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap">
                      <ElTag size="small" type="primary" effect="plain">{{ r.subject }}</ElTag>
                      <ElTag size="small" effect="plain" :style="{ borderColor: diffColor(r.difficulty), color: diffColor(r.difficulty) }">{{ r.difficulty }}</ElTag>
                      <ElTag size="small" type="info" effect="plain">{{ r.resourceType }}</ElTag>
                    </div>
                  </div>
                  <div style="text-align: right; flex-shrink: 0">
                    <div style="font-weight: 700; color: #2563eb">{{ r.studyMinutes }}分钟</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px">{{ r.completedAt?.slice(5, 16) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </ElCard>

          <ElCard v-if="dayDetail.quizzes?.length" shadow="never" style="border-radius: 12px">
            <div style="font-weight: 700; margin-bottom: 10px; display: flex; align-items: center; gap: 6px">
              <el-icon :size="16" style="color: #ec4899"><EditPen /></el-icon>
              自测记录 ({{ dayDetail.quizzes.length }})
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px">
              <div
                v-for="q in dayDetail.quizzes"
                :key="q.quizId"
                style="padding: 12px; border-radius: 10px; background: #fdf2f8; border: 1px solid #fbcfe8"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px">
                  <div style="flex: 1; min-width: 0">
                    <div style="font-weight: 600; color: #831843">{{ q.subject }} · {{ q.difficulty }}</div>
                    <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap">
                      <ElTag size="small" type="success" effect="plain">
                        {{ q.correctCount }}/{{ q.totalQuestions }} 正确
                      </ElTag>
                      <ElTag size="small" type="warning" effect="plain">
                        用时 {{ Math.round(q.timeSpentSeconds / 60) }}分钟
                      </ElTag>
                    </div>
                  </div>
                  <div style="text-align: right; flex-shrink: 0">
                    <div style="font-weight: 800; font-size: 18px; color: #be185d">{{ q.score }}/{{ q.totalScore }}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px">正确率 {{ (q.accuracy * 100).toFixed(1) }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </ElCard>

          <ElEmpty
            v-if="!dayDetail.subjectBreakdown?.length && !dayDetail.resources?.length && !dayDetail.quizzes?.length"
            description="当日暂无学习记录"
            image-size="80"
          />
        </div>
      </ElSkeleton>
    </ElDrawer>
  </div>
</template>

<style scoped>
.calendar-cell-wrapper {
  aspect-ratio: 1;
  min-height: 72px;
}

.calendar-cell {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.calendar-cell:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.calendar-cell-empty {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px dashed #e2e8f0;
}

.cell-day {
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
}

.cell-minutes {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.consecutive-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.legend-box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}

.stat-item {
  padding: 8px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.stat-item :deep(.el-statistic__head) {
  font-size: 11px;
  color: #64748b;
}

.stat-item :deep(.el-statistic__content) {
  font-size: 18px;
  color: #1e293b;
}
</style>
