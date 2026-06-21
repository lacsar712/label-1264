<script setup>
import { ref, watch } from 'vue'
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElRate,
  ElSwitch,
  ElMessage,
} from 'element-plus'

import { api } from '../lib/api'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  resource: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'success'])

const formRef = ref(null)
const loading = ref(false)
const rating = ref(5)
const comment = ref('')
const isRecommended = ref(false)
const existingReview = ref(null)

function open() {
  rating.value = 5
  comment.value = ''
  isRecommended.value = false
  existingReview.value = null
  loadMyReview()
}

function close() {
  emit('update:modelValue', false)
}

async function loadMyReview() {
  if (!props.resource?.resourceDbId) return
  try {
    const resp = await api.get(`/actions/resources/${props.resource.resourceDbId}/reviews/my`)
    if (resp.data?.data) {
      existingReview.value = resp.data.data
      rating.value = resp.data.data.rating
      comment.value = resp.data.data.comment || ''
      isRecommended.value = resp.data.data.isRecommended
    }
  } catch (err) {
    console.error('加载我的评价失败', err)
  }
}

async function onSubmit() {
  if (!props.resource?.resourceDbId) return
  loading.value = true
  try {
    const resp = await api.post(`/actions/resources/${props.resource.resourceDbId}/reviews`, {
      rating: rating.value,
      comment: comment.value.trim() || null,
      isRecommended: isRecommended.value,
    })
    if (resp.data?.ok) {
      ElMessage.success(existingReview.value ? '评价更新成功' : '评价提交成功')
      emit('success', resp.data.data)
      close()
    }
  } catch (err) {
    console.error('提交评价失败', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) open()
  }
)
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    :title="existingReview ? '修改评价' : '评价资源'"
    width="480px"
    @update:model-value="close"
  >
    <ElForm :model="{ rating, comment, isRecommended }" label-width="80px">
      <ElFormItem label="资源名称">
        <div style="font-weight: 600; color: #1e293b">{{ resource?.name }}</div>
      </ElFormItem>
      <ElFormItem label="评分">
        <ElRate v-model="rating" :max="5" :colors="['#fbbf24', '#fbbf24', '#fbbf24']" />
        <span style="margin-left: 12px; color: #64748b">{{ rating }} 星</span>
      </ElFormItem>
      <ElFormItem label="评价">
        <ElInput
          v-model="comment"
          type="textarea"
          :rows="4"
          placeholder="分享你的学习体验和建议（选填，最多1000字）"
          maxlength="1000"
          show-word-limit
        />
      </ElFormItem>
      <ElFormItem label="推荐">
        <ElSwitch v-model="isRecommended" />
        <span style="margin-left: 12px; color: #64748b; font-size: 13px"
          >是否推荐给其他同学</span
        >
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton type="primary" :loading="loading" @click="onSubmit">
        {{ existingReview ? '更新评价' : '提交评价' }}
      </ElButton>
    </template>
  </ElDialog>
</template>
