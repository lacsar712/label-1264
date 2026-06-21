<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  ElButton,
  ElCard,
  ElCol,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElRow,
  ElSelect,
  ElSkeleton,
  ElNotification,
} from 'element-plus'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import { usePageData } from '../lib/usePageData'

const { state, updateUser } = useAuth()
const { data, loading, refresh } = usePageData('/pages/settings')

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物']

const AVATAR_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0d9488',
  '#0891b2', '#4f46e5', '#9333ea', '#c026d3',
]

const profileForm = reactive({
  name: '',
  avatarColor: '#2563eb',
  subjectPreference: [],
  chartTheme: 'light',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const adminForm = reactive({
  pageSize: 20,
  tableDensity: 'default',
})

const profileSaving = ref(false)
const passwordSaving = ref(false)
const adminSaving = ref(false)

const profileLoaded = ref(false)
const adminLoaded = ref(false)

const pageData = computed(() => data.value || {})

watch(pageData, (val) => {
  const profile = val.profile
  if (profile && !profileLoaded.value) {
    profileForm.name = profile.name || ''
    profileForm.avatarColor = profile.avatarColor || '#2563eb'
    profileForm.subjectPreference = Array.isArray(profile.subjectPreference) ? profile.subjectPreference.slice() : []
    profileForm.chartTheme = profile.chartTheme || 'light'
    profileLoaded.value = true
  }

  const admin = val.adminPreferences
  if (admin && !adminLoaded.value) {
    adminForm.pageSize = admin.pageSize || 20
    adminForm.tableDensity = admin.tableDensity || 'default'
    adminLoaded.value = true
  }
}, { immediate: true })

const passwordStrength = computed(() => {
  const p = passwordForm.newPassword
  if (!p) return { level: 0, text: '', color: '' }
  let score = 0
  if (p.length >= 8) score += 1
  if (p.length >= 12) score += 1
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1
  if (/\d/.test(p)) score += 1
  if (/[^a-zA-Z0-9]/.test(p)) score += 1

  if (score <= 1) return { level: 1, text: '弱', color: '#dc2626' }
  if (score <= 2) return { level: 2, text: '一般', color: '#ea580c' }
  if (score <= 3) return { level: 3, text: '中等', color: '#ca8a04' }
  if (score <= 4) return { level: 4, text: '强', color: '#16a34a' }
  return { level: 5, text: '非常强', color: '#059669' }
})

const passwordMismatch = computed(() => {
  return passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
})

async function saveProfile() {
  profileSaving.value = true
  try {
    const resp = await api.put('/actions/settings/profile', {
      name: profileForm.name,
      avatarColor: profileForm.avatarColor,
      subjectPreference: profileForm.subjectPreference,
      chartTheme: profileForm.chartTheme,
    })

    const updated = resp.data.data
    updateUser({
      name: updated.name,
      avatarColor: updated.avatarColor,
      chartTheme: updated.chartTheme,
      subjectPreference: updated.subjectPreference,
    })

    ElNotification({ title: '保存成功', message: '个人设置已更新', type: 'success', duration: 2000 })
  } catch {
    // handled by interceptor
  } finally {
    profileSaving.value = false
  }
}

async function savePassword() {
  if (passwordForm.newPassword.length < 8) {
    ElNotification({ title: '密码强度不足', message: '新密码长度不能少于8位', type: 'warning', duration: 2500 })
    return
  }

  const hasLetter = /[a-zA-Z]/.test(passwordForm.newPassword)
  const hasDigit = /\d/.test(passwordForm.newPassword)
  if (!hasLetter || !hasDigit) {
    ElNotification({ title: '密码强度不足', message: '新密码必须同时包含字母和数字', type: 'warning', duration: 2500 })
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElNotification({ title: '密码不一致', message: '两次输入的新密码不相同', type: 'warning', duration: 2500 })
    return
  }

  passwordSaving.value = true
  try {
    await api.put('/actions/settings/password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })

    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''

    ElNotification({ title: '修改成功', message: '密码已更新', type: 'success', duration: 2000 })
  } catch {
    // handled by interceptor
  } finally {
    passwordSaving.value = false
  }
}

async function saveAdminPreferences() {
  adminSaving.value = true
  try {
    const resp = await api.put('/actions/settings/admin-preferences', {
      pageSize: adminForm.pageSize,
      tableDensity: adminForm.tableDensity,
    })

    const updated = resp.data.data
    updateUser({ adminPreferences: updated })

    ElNotification({ title: '保存成功', message: '管理偏好已更新', type: 'success', duration: 2000 })
  } catch {
    // handled by interceptor
  } finally {
    adminSaving.value = false
  }
}

function onColorPick(color) {
  profileForm.avatarColor = color
}
</script>

<template>
  <div class="settings-page">
    <ElRow :gutter="16">
      <ElCol :span="24">
        <ElCard class="panel-card header-card">
          <div class="header-main">
            <div>
              <div class="page-title">个人设置</div>
              <div class="page-subtitle">管理您的显示信息与偏好配置</div>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :xs="24" :lg="16">
        <ElCard class="panel-card">
          <div class="card-title">基本信息</div>
          <ElSkeleton :loading="loading" animated>
            <div v-if="pageData.profile" class="form-area">
              <ElForm label-width="100px" label-position="right">
                <ElFormItem label="显示昵称">
                  <ElInput v-model="profileForm.name" placeholder="请输入显示昵称" maxlength="64" show-word-limit style="max-width: 360px" />
                </ElFormItem>

                <ElFormItem label="头像色">
                  <div class="color-palette">
                    <div
                      v-for="color in AVATAR_COLORS"
                      :key="color"
                      class="color-swatch"
                      :class="{ active: profileForm.avatarColor === color }"
                      :style="{ backgroundColor: color }"
                      @click="onColorPick(color)"
                    >
                      <svg v-if="profileForm.avatarColor === color" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  </div>
                </ElFormItem>

                <ElFormItem label="默认学科筛选">
                  <ElSelect v-model="profileForm.subjectPreference" multiple filterable placeholder="选择默认学科" style="max-width: 360px">
                    <ElOption v-for="s in SUBJECTS" :key="s" :label="s" :value="s" />
                  </ElSelect>
                </ElFormItem>

                <ElFormItem label="图表配色主题">
                  <ElRadioGroup v-model="profileForm.chartTheme">
                    <ElRadio value="light">浅色</ElRadio>
                    <ElRadio value="dark">深色</ElRadio>
                  </ElRadioGroup>
                  <div class="theme-hint">仅作用于数据可视化组件</div>
                </ElFormItem>
              </ElForm>

              <div class="form-actions">
                <ElButton type="primary" :loading="profileSaving" @click="saveProfile">保存设置</ElButton>
              </div>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :lg="8">
        <ElCard class="panel-card">
          <div class="card-title">当前头像预览</div>
          <ElSkeleton :loading="loading" animated>
            <div v-if="pageData.profile" class="avatar-preview-area">
              <div class="avatar-circle" :style="{ backgroundColor: profileForm.avatarColor }">
                {{ (profileForm.name || '?').charAt(0) }}
              </div>
              <div class="avatar-name">{{ profileForm.name || '未设置' }}</div>
              <div class="avatar-role">{{ pageData.profile.role === 'admin' ? '管理员' : '学习者' }}</div>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow :gutter="16" class="section-row">
      <ElCol :span="24">
        <ElCard class="panel-card">
          <div class="card-title">修改密码</div>
          <div class="password-form-area">
            <ElForm label-width="100px" label-position="right" style="max-width: 520px">
              <ElFormItem label="旧密码">
                <ElInput v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
              </ElFormItem>

              <ElFormItem label="新密码">
                <ElInput v-model="passwordForm.newPassword" type="password" show-password placeholder="至少8位，需包含字母和数字" />
                <div v-if="passwordForm.newPassword" class="strength-bar">
                  <div class="strength-track">
                    <div class="strength-fill" :style="{ width: (passwordStrength.level / 5) * 100 + '%', backgroundColor: passwordStrength.color }" />
                  </div>
                  <span class="strength-text" :style="{ color: passwordStrength.color }">{{ passwordStrength.text }}</span>
                </div>
              </ElFormItem>

              <ElFormItem label="确认新密码">
                <ElInput v-model="passwordForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
                <div v-if="passwordMismatch" class="mismatch-hint">两次输入的密码不一致</div>
              </ElFormItem>
            </ElForm>

            <div class="form-actions">
              <ElButton type="primary" :loading="passwordSaving" @click="savePassword">修改密码</ElButton>
            </div>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <ElRow v-if="pageData.profile?.role === 'admin'" :gutter="16" class="section-row">
      <ElCol :span="24">
        <ElCard class="panel-card">
          <div class="card-title">管理偏好</div>
          <div class="admin-hint">以下配置将影响后台管理列表的默认展示，减少重复调整</div>
          <ElSkeleton :loading="loading" animated>
            <div v-if="pageData.adminPreferences" class="form-area">
              <ElForm label-width="120px" label-position="right" style="max-width: 520px">
                <ElFormItem label="默认分页大小">
                  <ElSelect v-model="adminForm.pageSize" style="width: 200px">
                    <ElOption :value="10" label="10 条/页" />
                    <ElOption :value="20" label="20 条/页" />
                    <ElOption :value="50" label="50 条/页" />
                    <ElOption :value="100" label="100 条/页" />
                  </ElSelect>
                </ElFormItem>

                <ElFormItem label="表格密度">
                  <ElSelect v-model="adminForm.tableDensity" style="width: 200px">
                    <ElOption value="compact" label="紧凑" />
                    <ElOption value="default" label="默认" />
                    <ElOption value="loose" label="宽松" />
                  </ElSelect>
                </ElFormItem>
              </ElForm>

              <div class="form-actions">
                <ElButton type="primary" :loading="adminSaving" @click="saveAdminPreferences">保存偏好</ElButton>
              </div>
            </div>
          </ElSkeleton>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style scoped>
.settings-page {
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

.card-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.form-area {
  padding-top: 4px;
}

.form-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border: 3px solid transparent;
}

.color-swatch:hover {
  transform: scale(1.12);
}

.color-swatch.active {
  border-color: #0f172a;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.15);
}

.theme-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.avatar-preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.avatar-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.avatar-name {
  margin-top: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.avatar-role {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.password-form-area {
  padding-top: 4px;
}

.strength-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  width: 100%;
  max-width: 360px;
}

.strength-track {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.25s ease, background-color 0.25s ease;
}

.strength-text {
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
}

.mismatch-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #dc2626;
}

.admin-hint {
  margin-bottom: 12px;
  font-size: 12px;
  color: #94a3b8;
}

@media (max-width: 992px) {
  .settings-page {
    padding: 12px 12px 20px;
  }
}
</style>
