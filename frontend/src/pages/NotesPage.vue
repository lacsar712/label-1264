<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElInput,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElEmpty,
} from 'element-plus'
import { Edit, Delete, Plus, Search } from '@element-plus/icons-vue'

import EChart from '../components/EChart.vue'
import { api } from '../lib/api'
import { usePageData } from '../lib/usePageData'

const router = useRouter()
const { data, loading, refresh } = usePageData('/pages/notes')

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

const keyword = ref('')
const subject = ref('')
const sortField = ref('updatedAt')
const sortOrder = ref('desc')
const page = ref(1)
const pageSize = ref(8)

const filteredNotes = computed(() => {
  const rows = data.value?.noteList || []
  const kw = keyword.value.trim().toLowerCase()
  return rows.filter((r) => {
    if (subject.value && r.subject !== subject.value) return false
    if (!kw) return true
    return (
      String(r.title || '').toLowerCase().includes(kw) ||
      String(r.summary || '').toLowerCase().includes(kw)
    )
  })
})

const sortedNotes = computed(() => {
  const rows = filteredNotes.value.slice()
  const order = sortOrder.value === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    if (sortField.value === 'title') {
      return String(a.title || '').localeCompare(String(b.title || '')) * order
    }
    if (sortField.value === 'subject') {
      return String(a.subject || '').localeCompare(String(b.subject || '')) * order
    }
    return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order
  })
  return rows
})

watch([keyword, subject, sortField, sortOrder, pageSize], () => {
  page.value = 1
})

const pagedNotes = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sortedNotes.value.slice(start, start + pageSize.value)
})

function createNote() {
  router.push('/notes/new')
}

function editNote(row) {
  router.push(`/notes/${row.id}`)
}

async function deleteNote(row) {
  await ElMessageBox.confirm(`确认删除笔记「${row.title}」？`, '删除确认', { type: 'warning' })
  await api.delete(`/actions/notes/${row.id}`)
  await refresh()
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
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard style="border-radius: 14px">
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px">
            <div>
              <div style="font-weight: 800">学习笔记</div>
              <div style="font-size: 12px; color: #64748b">Markdown 撰写 · 学科归档 · 资源挂载</div>
            </div>
            <div style="display: flex; gap: 8px">
              <ElButton :loading="loading" @click="refresh">刷新</ElButton>
              <ElButton type="primary" :icon="Plus" @click="createNote">新建笔记</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" style="margin-top: 16px">
      <ElCol :xs="24" :lg="8">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="font-weight: 700; margin-bottom: 10px">学科分布</div>
          <ElSkeleton :loading="loading" animated>
            <EChart :option="subjectStatsOption" :height="260" />
          </ElSkeleton>
        </ElCard>
      </ElCol>
      <ElCol :xs="24" :lg="16">
        <ElCard style="border-radius: 14px; height: 100%">
          <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px">
            <div style="font-weight: 700">笔记列表</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end">
              <ElInput
                v-model="keyword"
                placeholder="搜索标题/内容"
                style="width: 180px"
                :prefix-icon="Search"
                clearable
              />
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
              </ElSelect>
              <ElSelect v-model="sortOrder" placeholder="排序方向" style="width: 110px">
                <ElOption label="降序" value="desc" />
                <ElOption label="升序" value="asc" />
              </ElSelect>
            </div>
          </div>
          <ElSkeleton :loading="loading" animated>
            <el-scrollbar height="380px">
              <ElTable
                v-if="sortedNotes.length > 0"
                :data="pagedNotes"
                size="small"
                style="width: 100%"
                @row-dblclick="editNote"
              >
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
                <ElTableColumn label="操作" width="120" fixed="right">
                  <template #default="{ row }">
                    <div style="display: flex; gap: 4px">
                      <ElButton size="small" type="primary" plain :icon="Edit" @click="editNote(row)">编辑</ElButton>
                      <ElButton size="small" type="danger" plain :icon="Delete" @click="deleteNote(row)">删除</ElButton>
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>
              <ElEmpty v-else description="暂无笔记，点击「新建笔记」开始记录" />
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
