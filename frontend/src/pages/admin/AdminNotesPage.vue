<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElInput,
  ElOption,
  ElPagination,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElEmpty,
  ElNotification,
} from 'element-plus'
import { View, Search } from '@element-plus/icons-vue'

import EChart from '../../components/EChart.vue'
import { api } from '../../lib/api'

const router = useRouter()

const data = ref(null)
const loading = ref(false)

const subjectStatsOption = computed(() => {
  const stats = data.value?.subjectStats || []
  return {
    tooltip: { trigger: 'item' },
    legend: { top: 8, left: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '55%'],
        label: { formatter: '{b}: {c}篇 ({d}%)' },
        labelLine: { length: 14, length2: 12 },
        data: stats.map((s) => ({ name: s.subject, value: s.count })),
      },
    ],
  }
})

const studentStatsOption = computed(() => {
  const stats = data.value?.studentStats || []
  const sorted = stats.slice().sort((a, b) => b.count - a.count).slice(0, 10)
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 24, left: 80, right: 18, bottom: 28, containLabel: true },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: sorted.map((s) => s.name) },
    series: [
      {
        type: 'bar',
        data: sorted.map((s) => s.count),
        itemStyle: { color: '#2563eb' },
        label: { show: true, position: 'right' },
      },
    ],
  }
})

const totalNotes = computed(() => {
  const stats = data.value?.studentStats || []
  return stats.reduce((sum, s) => sum + (s.count || 0), 0)
})

const keyword = ref('')
const subject = ref('')
const student = ref('')
const sortField = ref('updatedAt')
const sortOrder = ref('desc')
const page = ref(1)
const pageSize = ref(8)

let searchTimer = null

async function refresh() {
  loading.value = true
  try {
    const resp = await api.get('/pages/admin/notes', {
      params: {
        keyword: keyword.value.trim(),
        subject: subject.value,
        userId: student.value || '',
      },
    })
    data.value = resp.data.data
    page.value = 1
  } catch (err) {
    ElNotification({
      title: '加载失败',
      message: '页面数据获取失败，请稍后重试',
      type: 'error',
      duration: 2500,
    })
  } finally {
    loading.value = false
  }
}

function debouncedSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    refresh()
  }, 300)
}

watch([keyword, subject, student], () => {
  debouncedSearch()
})

watch([sortField, sortOrder, pageSize], () => {
  page.value = 1
})

const sortedNotes = computed(() => {
  const rows = (data.value?.noteList || []).slice()
  const order = sortOrder.value === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    if (sortField.value === 'title') {
      return String(a.title || '').localeCompare(String(b.title || '')) * order
    }
    if (sortField.value === 'subject') {
      return String(a.subject || '').localeCompare(String(b.subject || '')) * order
    }
    if (sortField.value === 'userName') {
      return String(a.userName || '').localeCompare(String(b.userName || '')) * order
    }
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order
  })
  return rows
})

const pagedNotes = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedNotes.value.slice(start, start + pageSize.value)
})

function viewNote(row) {
  router.push(`/notes/${row.id}`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(refresh)
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">笔记管理</div>
              <div style="font-size: 12px; color: #64748b">全局只读视角 · 浏览所有学生笔记</div>
            </div>
            <ElButton :loading="loading" @click="refresh">刷新</ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="6">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">学科分布</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="subjectStatsOption" :height="220" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="8">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">学生笔记排行（Top 10）</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="studentStatsOption" :height="220" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="10">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">统计概览</div>
          <ElSkeleton :loading="loading" animated>
            <div style="display: flex; gap: 12px; flex-wrap: wrap">
              <div style="flex: 1; min-width: 100px; padding: 16px; background: #eff6ff; border-radius: 12px">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">笔记总数</div>
                <div style="font-size: 28px; font-weight: 700; color: #2563eb">
                  {{ totalNotes }}
                </div>
              </div>
              <div style="flex: 1; min-width: 100px; padding: 16px; background: #f0fdf4; border-radius: 12px">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">涉及学生</div>
                <div style="font-size: 28px; font-weight: 700; color: #16a34a">
                  {{ data?.students?.length || 0 }}
                </div>
              </div>
              <div style="flex: 1; min-width: 100px; padding: 16px; background: #fef3c7; border-radius: 12px">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px">学科数量</div>
                <div style="font-size: 28px; font-weight: 700; color: #d97706">
                  {{ data?.subjects?.length || 0 }}
                </div>
              </div>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">笔记列表</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end">
              <ElInput
                v-model="keyword"
                placeholder="搜索标题/内容/学生"
                style="width: 200px"
                :prefix-icon="Search"
                clearable
              />
              <ElSelect v-model="student" placeholder="学生筛选" clearable style="width: 140px">
                <ElOption
                  v-for="s in data?.students || []"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </ElSelect>
              <ElSelect v-model="subject" placeholder="学科筛选" clearable style="width: 120px">
                <ElOption
                  v-for="s in data?.subjects || []"
                  :key="s"
                  :label="s"
                  :value="s"
                />
              </ElSelect>
              <ElSelect v-model="sortField" placeholder="排序字段" style="width: 120px">
                <ElOption label="更新时间" value="updatedAt" />
                <ElOption label="标题" value="title" />
                <ElOption label="学科" value="subject" />
                <ElOption label="学生" value="userName" />
              </ElSelect>
              <ElSelect v-model="sortOrder" placeholder="排序方向" style="width: 110px">
                <ElOption label="降序" value="desc" />
                <ElOption label="升序" value="asc" />
              </ElSelect>
            </div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="400px">
              <ElTable
                v-if="sortedNotes.length > 0"
                :data="pagedNotes"
                size="small"
                style="width: 100%"
                @row-dblclick="viewNote"
              >
                <ElTableColumn prop="userName" label="学生" width="100">
                  <template #default="{ row }">
                    <div style="display: flex; align-items: center; gap: 6px">
                      <ElTag type="info" effect="plain" size="small">{{ row.userName }}</ElTag>
                    </div>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="title" label="标题" min-width="180" />
                <ElTableColumn prop="subject" label="学科" width="80">
                  <template #default="{ row }">
                    <ElTag type="primary" effect="plain">{{ row.subject }}</ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="resourceName" label="关联资源" min-width="140" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span v-if="row.resourceName">{{ row.resourceName }}</span>
                    <span v-else style="color: #94a3b8">未挂载</span>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="summary" label="摘要" min-width="200" show-overflow-tooltip />
                <ElTableColumn prop="updatedAt" label="更新时间" width="160">
                  <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
                </ElTableColumn>
                <ElTableColumn label="操作" width="80" fixed="right">
                  <template #default="{ row }">
                    <ElButton size="small" type="primary" plain :icon="View" @click="viewNote(row)">查看</ElButton>
                  </template>
                </ElTableColumn>
              </ElTable>
              <ElEmpty v-else description="暂无匹配的笔记" />
            </el-scrollbar>
            <div v-if="sortedNotes.length > 0" style="display: flex; justify-content: flex-end; padding-top: 8px">
              <ElPagination
                v-model:current-page="page"
                v-model:page-size="pageSize"
                :total="sortedNotes.length"
                :page-sizes="[8, 12, 20]"
                layout="total, sizes, prev, pager, next"
              />
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>
