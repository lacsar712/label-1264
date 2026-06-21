<script setup>
import { ref, reactive, computed } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElNotification,
  ElRow,
  ElSkeleton,
  ElTable,
  ElTableColumn,
  ElTag,
  ElRadioGroup,
  ElRadioButton,
  ElMessageBox,
  ElPagination,
} from 'element-plus'
import { Bell, Plus, Promotion, Edit, Search } from '@element-plus/icons-vue'

import { api } from '../../lib/api'
import { usePageData } from '../../lib/usePageData'

const NOTIFICATION_TYPES = [
  { value: 'system', label: '系统公告', color: 'danger', icon: Bell },
  { value: 'recommendation', label: '推荐变动', color: 'success', icon: Promotion },
  { value: 'homework', label: '作业提醒', color: 'warning', icon: Edit },
]

const { data, loading, refresh } = usePageData('/pages/admin/users')

const sendDialogOpen = ref(false)
const sendForm = reactive({
  type: 'system',
  title: '',
  content: '',
  linkUrl: '',
  linkText: '',
  targetMode: 'selected',
  selectedUserIds: [],
})

const userSearch = ref('')
const notificationPage = ref(1)
const notificationPageSize = 10
const notificationList = ref([])
const notificationTotal = ref(0)
const notificationsLoading = ref(false)

const filteredUsers = computed(() => {
  const list = (data.value?.userList || []).filter((u) => u.active && u.role !== 'admin')
  if (!userSearch.value) return list
  const keyword = userSearch.value.toLowerCase()
  return list.filter(
    (u) =>
      String(u.userId).includes(keyword) ||
      (u.name && u.name.toLowerCase().includes(keyword)) ||
      (u.stage && u.stage.toLowerCase().includes(keyword))
  )
})

function getTypeInfo(type) {
  return NOTIFICATION_TYPES.find((t) => t.value === type) || NOTIFICATION_TYPES[0]
}

function openSendDialog() {
  sendForm.type = 'system'
  sendForm.title = ''
  sendForm.content = ''
  sendForm.linkUrl = ''
  sendForm.linkText = ''
  sendForm.targetMode = 'selected'
  sendForm.selectedUserIds = []
  sendDialogOpen.value = true
}

function toggleSelectAll() {
  if (sendForm.selectedUserIds.length === filteredUsers.value.length) {
    sendForm.selectedUserIds = []
  } else {
    sendForm.selectedUserIds = filteredUsers.value.map((u) => u.userId)
  }
}

async function loadNotifications() {
  notificationsLoading.value = true
  try {
    const res = await api.get('/actions/admin/notifications', {
      params: {
        page: notificationPage.value,
        pageSize: notificationPageSize.value,
      },
    })
    notificationList.value = res.data.data.list
    notificationTotal.value = res.data.data.total
  } finally {
    notificationsLoading.value = false
  }
}

async function handleSend() {
  if (!sendForm.title.trim()) {
    ElNotification({ title: '提示', message: '请输入通知标题', type: 'warning', duration: 2000 })
    return
  }
  if (!sendForm.content.trim()) {
    ElNotification({ title: '提示', message: '请输入通知内容', type: 'warning', duration: 2000 })
    return
  }

  let targetUserIds = []
  if (sendForm.targetMode === 'all') {
    targetUserIds = (data.value?.userList || [])
      .filter((u) => u.active && u.role !== 'admin')
      .map((u) => u.userId)
  } else {
    targetUserIds = sendForm.selectedUserIds
  }

  if (targetUserIds.length === 0) {
    ElNotification({ title: '提示', message: '请选择至少一个目标用户', type: 'warning', duration: 2000 })
    return
  }

  try {
    await api.post('/actions/admin/notifications/send', {
      userIds: targetUserIds,
      type: sendForm.type,
      title: sendForm.title.trim(),
      content: sendForm.content.trim(),
      linkUrl: sendForm.linkUrl.trim() || undefined,
      linkText: sendForm.linkText.trim() || undefined,
    })

    ElNotification({
      title: '发送成功',
      message: `已向 ${targetUserIds.length} 位用户发送通知`,
      type: 'success',
      duration: 2000,
    })

    sendDialogOpen.value = false
    await loadNotifications()
  } catch (e) {
    // error handled by interceptor
  }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}`
}

loadNotifications()
</script>

<template>
  <div class="admin-notifications-page">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard class="panel-card header-card">
          <div class="header-main">
            <div>
              <div class="page-title">通知管理（管理员端）</div>
              <div class="page-subtitle">定向推送系统通知、推荐变动与作业提醒</div>
            </div>
            <ElButton type="primary" @click="openSendDialog">
              <el-icon><Plus /></el-icon>
              <span>发送通知</span>
            </ElButton>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :span="24">
        <ElCard class="panel-card">
          <div class="card-title-row">
            <div class="card-title">已发送通知记录</div>
            <ElButton size="small" :loading="notificationsLoading" @click="loadNotifications">
              <el-icon><Search /></el-icon>
              <span>刷新</span>
            </ElButton>
          </div>
          <ElSkeleton :loading="notificationsLoading" animated>
            <el-scrollbar height="400px">
              <ElTable :data="notificationList" size="small" class="data-table" empty-text="暂无通知记录">
                <ElTableColumn prop="id" label="ID" width="70" />
                <ElTableColumn prop="type" label="类型" width="110">
                  <template #default="{ row }">
                    <ElTag :type="getTypeInfo(row.type).color" effect="light">
                      {{ getTypeInfo(row.type).label }}
                    </ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="title" label="标题" min-width="160" show-overflow-tooltip />
                <ElTableColumn prop="content" label="内容" min-width="220" show-overflow-tooltip />
                <ElTableColumn label="接收用户" width="120">
                  <template #default="{ row }">
                    {{ row.user?.name || '-' }}
                  </template>
                </ElTableColumn>
                <ElTableColumn label="发送人" width="100">
                  <template #default="{ row }">
                    {{ row.sender?.name || '-' }}
                  </template>
                </ElTableColumn>
                <ElTableColumn label="已读状态" width="90">
                  <template #default="{ row }">
                    <ElTag :type="row.isRead ? 'success' : 'info'" effect="plain">
                      {{ row.isRead ? '已读' : '未读' }}
                    </ElTag>
                  </template>
                </ElTableColumn>
                <ElTableColumn prop="createdAt" label="发送时间" width="160">
                  <template #default="{ row }">
                    {{ formatTime(row.createdAt) }}
                  </template>
                </ElTableColumn>
              </ElTable>
            </el-scrollbar>
            <div class="pagination-wrap">
              <ElPagination
                v-model:current-page="notificationPage"
                v-model:page-size="notificationPageSize"
                :total="notificationTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @current-change="loadNotifications"
                @size-change="loadNotifications"
              />
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElDialog v-model="sendDialogOpen" title="发送通知" width="640px" :close-on-click-modal="false">
      <ElForm label-width="90px" class="send-form">
        <ElFormItem label="通知类型">
          <ElRadioGroup v-model="sendForm.type">
            <ElRadioButton v-for="t in NOTIFICATION_TYPES" :key="t.value" :value="t.value">
              <el-icon style="margin-right: 4px"><component :is="t.icon" /></el-icon>
              {{ t.label }}
            </ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>

        <ElFormItem label="通知标题">
          <ElInput v-model="sendForm.title" maxlength="128" show-word-limit placeholder="请输入通知标题" />
        </ElFormItem>

        <ElFormItem label="通知内容">
          <ElInput
            v-model="sendForm.content"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="请输入通知内容"
          />
        </ElFormItem>

        <ElFormItem label="跳转链接">
          <ElInput v-model="sendForm.linkUrl" placeholder="可选：点击通知跳转的链接" />
        </ElFormItem>

        <ElFormItem label="链接文字">
          <ElInput v-model="sendForm.linkText" placeholder="可选：链接按钮显示的文字，如'查看详情'" />
        </ElFormItem>

        <ElFormItem label="目标用户">
          <ElRadioGroup v-model="sendForm.targetMode">
            <ElRadioButton value="selected">选择用户</ElRadioButton>
            <ElRadioButton value="all">全体学生</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>

        <ElFormItem v-if="sendForm.targetMode === 'selected'" label="选择用户">
          <div class="user-select-area">
            <div class="user-select-header">
              <ElInput v-model="userSearch" size="small" placeholder="搜索用户ID/姓名/学段" clearable>
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </ElInput>
              <ElButton size="small" @click="toggleSelectAll">
                {{ sendForm.selectedUserIds.length === filteredUsers.length ? '取消全选' : '全选' }}
              </ElButton>
              <span class="selected-count">已选 {{ sendForm.selectedUserIds.length }} 人</span>
            </div>
            <div class="user-list">
              <el-scrollbar height="180px">
                <ElSelect
                  v-model="sendForm.selectedUserIds"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  placeholder="请选择目标学生"
                  style="width: 100%"
                  size="small"
                >
                  <ElOption
                    v-for="user in filteredUsers"
                    :key="user.userId"
                    :label="`${user.userId} · ${user.name} · ${user.stage}`"
                    :value="user.userId"
                  />
                </ElSelect>
              </el-scrollbar>
            </div>
          </div>
        </ElFormItem>

        <ElFormItem v-if="sendForm.targetMode === 'all'" label="发送范围">
          <ElTag type="info" effect="light">
            将发送给所有活跃的学生用户（共 {{ (data?.userList || []).filter(u => u.active && u.role !== 'admin').length }} 人）
          </ElTag>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="sendDialogOpen = false">取消</ElButton>
        <ElButton type="primary" @click="handleSend">发送通知</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.admin-notifications-page {
  padding: 16px 16px 22px;
}

.section-row {
  margin-top: 16px;
}

.panel-card {
  border-radius: 14px;
  border: 1px solid #e7edf5;
}

.header-card :deep(.el-card__body) {
  padding: 16px 18px;
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.data-table :deep(.el-table__cell) {
  padding-top: 8px;
  padding-bottom: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.send-form {
  margin-top: 8px;
}

.user-select-area {
  width: 100%;
}

.user-select-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.selected-count {
  margin-left: auto;
  font-size: 12px;
  color: #64748b;
}

.user-list {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

@media (max-width: 992px) {
  .admin-notifications-page {
    padding: 12px 12px 20px;
  }
}
</style>
