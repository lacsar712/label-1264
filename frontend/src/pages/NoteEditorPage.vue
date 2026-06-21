<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElInput,
  ElMessage,
  ElOption,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElEmpty,
} from 'element-plus'
import { ArrowLeft, Check, Close, Link, Search } from '@element-plus/icons-vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const { isAdmin } = useAuth()

marked.setOptions({
  highlight: function (code, lang) {
    try {
      return hljs.highlight(code, { language: lang || 'text' }).value
    } catch (e) {
      return hljs.highlightAuto(code).value
    }
  },
  breaks: true,
  gfm: true,
})

const noteId = computed(() => route.params.noteId)
const isNew = computed(() => noteId.value === 'new')
const readonly = computed(() => isAdmin.value && !isNew.value)

const loading = ref(true)
const saving = ref(false)
const title = ref('')
const content = ref('')
const subject = ref('')
const resourceId = ref(null)
const resourceName = ref('')
const resourceCode = ref('')

const resourceDialogVisible = ref(false)
const resourceKeyword = ref('')
const resourcesLoading = ref(false)
const availableResources = ref([])

const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']

const previewHtml = computed(() => {
  return marked(content.value || '')
})

function goBack() {
  if (isAdmin.value) {
    router.push('/admin/notes')
  } else {
    router.push('/notes')
  }
}

async function loadNote() {
  if (isNew.value) {
    loading.value = false
    return
  }

  try {
    loading.value = true
    const endpoint = isAdmin.value
      ? `/pages/admin/notes/${noteId.value}`
      : `/pages/notes/${noteId.value}`
    const resp = await api.get(endpoint)
    if (resp.data.ok) {
      const note = resp.data.data
      title.value = note.title
      content.value = note.content
      subject.value = note.subject
      resourceId.value = note.resourceId
      resourceName.value = note.resourceName
      resourceCode.value = note.resourceCode
    }
  } finally {
    loading.value = false
  }
}

async function saveNote() {
  if (!title.value.trim()) {
    ElMessage.warning('请输入笔记标题')
    return
  }
  if (!subject.value) {
    ElMessage.warning('请选择学科')
    return
  }

  try {
    saving.value = true
    const data = {
      title: title.value.trim(),
      content: content.value,
      subject: subject.value,
      resourceId: resourceId.value,
    }

    if (isNew.value) {
      const resp = await api.post('/actions/notes', data)
      if (resp.data.ok) {
        ElMessage.success('笔记创建成功')
        router.push(`/notes/${resp.data.data.id}`)
      }
    } else {
      await api.put(`/actions/notes/${noteId.value}`, data)
      ElMessage.success('笔记保存成功')
      await loadNote()
    }
  } finally {
    saving.value = false
  }
}

function clearResource() {
  resourceId.value = null
  resourceName.value = ''
  resourceCode.value = ''
}

async function searchResources() {
  try {
    resourcesLoading.value = true
    const resp = await api.get('/pages/notes/resources/available', {
      params: { keyword: resourceKeyword.value.trim() },
    })
    if (resp.data.ok) {
      availableResources.value = resp.data.data
    }
  } finally {
    resourcesLoading.value = false
  }
}

function selectResource(res) {
  resourceId.value = res.id
  resourceName.value = res.name
  resourceCode.value = res.code
  resourceDialogVisible.value = false
  if (!subject.value) {
    subject.value = res.subject
  }
}

function openResourceDialog() {
  resourceKeyword.value = ''
  availableResources.value = []
  resourceDialogVisible.value = true
  searchResources()
}

watch(resourceKeyword, () => {
  if (resourceDialogVisible.value) {
    searchResources()
  }
})

onMounted(() => {
  loadNote()
})
</script>

<template>
  <div style="padding: 16px 16px 22px">
    <ElCard style="border-radius: 14px; margin-bottom: 16px">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
        <div style="display: flex; align-items: center; gap: 12px">
          <ElButton :icon="ArrowLeft" text @click="goBack">返回</ElButton>
          <div style="font-weight: 800">
            {{ isNew ? '新建笔记' : readonly ? '查看笔记' : '编辑笔记' }}
          </div>
          <ElTag v-if="readonly" type="info" effect="plain">只读模式</ElTag>
        </div>
        <div v-if="!readonly" style="display: flex; gap: 8px">
          <ElButton @click="goBack">取消</ElButton>
          <ElButton type="primary" :loading="saving" @click="saveNote">保存</ElButton>
        </div>
      </div>
    </ElCard>

    <ElSkeleton :loading="loading" animated>
      <ElCard v-if="!loading" style="border-radius: 14px; margin-bottom: 16px">
        <ElRow :gutter="16">
          <ElCol :xs="24" :md="12">
            <div style="margin-bottom: 12px">
              <div style="font-weight: 600; margin-bottom: 6px">标题</div>
              <ElInput
                v-model="title"
                placeholder="输入笔记标题..."
                :disabled="readonly"
                maxlength="128"
                show-word-limit
              />
            </div>
          </ElCol>
          <ElCol :xs="24" :md="6">
            <div style="margin-bottom: 12px">
              <div style="font-weight: 600; margin-bottom: 6px">学科</div>
              <ElSelect
                v-model="subject"
                placeholder="选择学科"
                style="width: 100%"
                :disabled="readonly"
              >
                <ElOption v-for="s in subjects" :key="s" :label="s" :value="s" />
              </ElSelect>
            </div>
          </ElCol>
          <ElCol :xs="24" :md="6">
            <div style="margin-bottom: 12px">
              <div style="font-weight: 600; margin-bottom: 6px">关联资源</div>
              <div v-if="resourceId" style="display: flex; align-items: center; gap: 8px">
                <ElTag type="success" effect="plain" style="flex: 1; overflow: hidden; text-overflow: ellipsis">
                  {{ resourceCode }} - {{ resourceName }}
                </ElTag>
                <ElButton
                  v-if="!readonly"
                  size="small"
                  type="danger"
                  plain
                  :icon="Close"
                  @click="clearResource"
                />
              </div>
              <ElButton
                v-else
                style="width: 100%"
                :icon="Link"
                :disabled="readonly"
                @click="openResourceDialog"
              >
                挂载教学资源
              </ElButton>
            </div>
          </ElCol>
        </ElRow>
      </ElCard>

      <ElRow v-if="!loading" :gutter="16">
        <ElCol :xs="24" :lg="12">
          <ElCard style="border-radius: 14px; height: 100%">
            <div style="font-weight: 700; margin-bottom: 10px">Markdown 编辑</div>
            <ElInput
              v-model="content"
              type="textarea"
              :rows="28"
              placeholder="支持 Markdown 语法...

# 一级标题
## 二级标题

**粗体** *斜体* ~~删除线~~

- 列表项 1
- 列表项 2

`代码`

```js
console.log('Hello World')
```

> 引用块

[链接文字](https://example.com)"
              :disabled="readonly"
              resize="none"
            />
          </ElCard>
        </ElCol>
        <ElCol :xs="24" :lg="12">
          <ElCard style="border-radius: 14px; height: 100%">
            <div style="font-weight: 700; margin-bottom: 10px">实时预览</div>
            <div
              class="markdown-preview"
              v-html="previewHtml"
              style="min-height: 600px; padding: 12px; background: #fafafa; border-radius: 8px; overflow: auto"
            />
          </ElCard>
        </ElCol>
      </ElRow>
    </ElSkeleton>

    <ElDialog
      v-model="resourceDialogVisible"
      title="选择教学资源"
      width="700px"
      :close-on-click-modal="false"
    >
      <div style="margin-bottom: 12px">
        <ElInput
          v-model="resourceKeyword"
          placeholder="搜索资源ID或名称..."
          :prefix-icon="Search"
          clearable
        />
      </div>
      <el-scrollbar height="400px">
        <ElSkeleton :loading="resourcesLoading" animated>
          <ElTable
            v-if="availableResources.length > 0"
            :data="availableResources"
            size="small"
            @row-dblclick="selectResource"
          >
            <ElTableColumn prop="code" label="资源ID" width="100" />
            <ElTableColumn prop="name" label="名称" min-width="180" show-overflow-tooltip />
            <ElTableColumn prop="subject" label="学科" width="70" />
            <ElTableColumn prop="type" label="类型" width="70" />
            <ElTableColumn prop="difficulty" label="难度" width="70" />
            <ElTableColumn label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <ElButton size="small" type="primary" :icon="Check" @click="selectResource(row)">选择</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
          <ElEmpty v-else description="未找到相关资源" />
        </ElSkeleton>
      </el-scrollbar>
    </ElDialog>
  </div>
</template>

<style>
.markdown-preview h1 {
  font-size: 1.8em;
  font-weight: 700;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #e5e7eb;
}

.markdown-preview h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.83em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #e5e7eb;
}

.markdown-preview h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0;
}

.markdown-preview h4 {
  font-size: 1em;
  font-weight: 600;
  margin: 1.33em 0;
}

.markdown-preview p {
  margin: 1em 0;
  line-height: 1.7;
}

.markdown-preview ul,
.markdown-preview ol {
  margin: 1em 0;
  padding-left: 2em;
  line-height: 1.7;
}

.markdown-preview li {
  margin: 0.25em 0;
}

.markdown-preview blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #2563eb;
  background: #eff6ff;
  color: #1e40af;
  border-radius: 0 4px 4px 0;
}

.markdown-preview code {
  background: #f1f5f9;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}

.markdown-preview pre {
  margin: 1em 0;
  padding: 1em;
  background: #1e293b;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-preview pre code {
  background: transparent;
  padding: 0;
  color: #e2e8f0;
}

.markdown-preview a {
  color: #2563eb;
  text-decoration: underline;
}

.markdown-preview a:hover {
  color: #1d4ed8;
}

.markdown-preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.markdown-preview th,
.markdown-preview td {
  border: 1px solid #e5e7eb;
  padding: 0.5em 0.75em;
  text-align: left;
}

.markdown-preview th {
  background: #f8fafc;
  font-weight: 600;
}

.markdown-preview hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1.5em 0;
}

.markdown-preview img {
  max-width: 100%;
  border-radius: 4px;
}
</style>
