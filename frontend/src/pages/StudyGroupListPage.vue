<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElRow,
  ElSkeleton,
  ElNotification,
  ElTag,
} from 'element-plus'
import {
  Plus,
  Link,
  User,
  UserFilled,
  Connection,
  ArrowRight,
} from '@element-plus/icons-vue'

import { api } from '../lib/api'

const router = useRouter()
const loading = ref(false)
const groups = ref([])
const showCreateDialog = ref(false)
const showJoinDialog = ref(false)
const createSubmitting = ref(false)
const joinSubmitting = ref(false)

const createForm = reactive({
  name: '',
  maxMembers: 10,
})

const joinForm = reactive({
  inviteCode: '',
})

async function fetchGroups() {
  loading.value = true
  try {
    const res = await api.get('/pages/study-groups')
    if (res.data.ok) {
      groups.value = res.data.data
    }
  } catch {
  } finally {
    loading.value = false
  }
}

onMounted(fetchGroups)

async function handleCreate() {
  if (!createForm.name.trim()) {
    ElNotification({ title: '提示', message: '请输入小组名称', type: 'warning', duration: 2000 })
    return
  }
  createSubmitting.value = true
  try {
    const res = await api.post('/actions/study-groups/create', {
      name: createForm.name.trim(),
      maxMembers: createForm.maxMembers,
    })
    if (res.data.ok) {
      ElNotification({ title: '创建成功', message: `学习小组「${res.data.data.name}」已创建`, type: 'success', duration: 2000 })
      showCreateDialog.value = false
      createForm.name = ''
      createForm.maxMembers = 10
      fetchGroups()
    }
  } catch {
  } finally {
    createSubmitting.value = false
  }
}

async function handleJoin() {
  if (!joinForm.inviteCode.trim()) {
    ElNotification({ title: '提示', message: '请输入邀请码', type: 'warning', duration: 2000 })
    return
  }
  joinSubmitting.value = true
  try {
    const res = await api.post('/actions/study-groups/join', {
      inviteCode: joinForm.inviteCode.trim().toUpperCase(),
    })
    if (res.data.ok) {
      ElNotification({ title: '加入成功', message: `已加入学习小组「${res.data.data.name}」`, type: 'success', duration: 2000 })
      showJoinDialog.value = false
      joinForm.inviteCode = ''
      fetchGroups()
    }
  } catch {
  } finally {
    joinSubmitting.value = false
  }
}

function goDetail(groupId) {
  router.push(`/study-group/${groupId}`)
}
</script>

<template>
  <div class="study-group-list-page">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard class="panel-card header-card">
          <div class="header-main">
            <div>
              <div class="page-title">学习小组</div>
              <div class="page-subtitle">创建或加入小组，与同伴一起监督学习、分享经验</div>
            </div>
            <div class="header-actions">
              <ElButton type="primary" @click="showCreateDialog = true">
                <el-icon style="margin-right: 4px"><Plus /></el-icon>
                创建小组
              </ElButton>
              <ElButton @click="showJoinDialog = true">
                <el-icon style="margin-right: 4px"><Link /></el-icon>
                加入小组
              </ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :span="24">
        <ElSkeleton :loading="loading" animated :count="3">
          <template v-if="!loading">
            <div v-if="groups.length === 0" class="empty-area">
              <ElEmpty description="暂未加入任何学习小组，快去创建或加入一个吧">
                <ElButton type="primary" @click="showCreateDialog = true">创建小组</ElButton>
              </ElEmpty>
            </div>

            <div v-else class="group-grid">
              <ElCard
                v-for="group in groups"
                :key="group.id"
                class="group-card"
                shadow="hover"
                @click="goDetail(group.id)"
              >
                <div class="group-card-inner">
                  <div class="group-icon-area">
                    <div class="group-icon">
                      <el-icon :size="24"><Connection /></el-icon>
                    </div>
                  </div>
                  <div class="group-info">
                    <div class="group-name">{{ group.name }}</div>
                    <div class="group-meta">
                      <span class="meta-item">
                        <el-icon><UserFilled /></el-icon>
                        {{ group.memberCount }}/{{ group.maxMembers }} 人
                      </span>
                      <ElTag :type="group.role === 'leader' ? 'warning' : 'info'" size="small">
                        {{ group.role === 'leader' ? '组长' : '成员' }}
                      </ElTag>
                    </div>
                    <div class="group-invite">
                      邀请码: <span class="invite-code">{{ group.inviteCode }}</span>
                    </div>
                  </div>
                  <el-icon class="arrow-icon"><ArrowRight /></el-icon>
                </div>
              </ElCard>
            </div>
          </template>
        </ElSkeleton>
      </ElCol>
    </ElRow>

    <ElDialog v-model="showCreateDialog" title="创建学习小组" width="460px" :close-on-click-modal="false">
      <ElForm label-width="90px" label-position="right">
        <ElFormItem label="小组名称">
          <ElInput v-model="createForm.name" placeholder="请输入小组名称" maxlength="64" show-word-limit />
        </ElFormItem>
        <ElFormItem label="人数上限">
          <ElInputNumber v-model="createForm.maxMembers" :min="2" :max="50" :step="1" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showCreateDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="createSubmitting" @click="handleCreate">创建</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="showJoinDialog" title="加入学习小组" width="460px" :close-on-click-modal="false">
      <ElForm label-width="90px" label-position="right">
        <ElFormItem label="邀请码">
          <ElInput v-model="joinForm.inviteCode" placeholder="请输入6位邀请码" maxlength="8" @input="joinForm.inviteCode = joinForm.inviteCode.toUpperCase()" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showJoinDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="joinSubmitting" @click="handleJoin">加入</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.study-group-list-page {
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
  align-items: flex-start;
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

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.empty-area {
  padding: 60px 0;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.group-card {
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.group-card-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}

.group-icon-area {
  flex-shrink: 0;
}

.group-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-invite {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.invite-code {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: #3b82f6;
  letter-spacing: 1px;
}

.arrow-icon {
  color: #94a3b8;
  font-size: 18px;
  flex-shrink: 0;
}

@media (max-width: 992px) {
  .study-group-list-page {
    padding: 12px 12px 20px;
  }
  .group-grid {
    grid-template-columns: 1fr;
  }
}
</style>
