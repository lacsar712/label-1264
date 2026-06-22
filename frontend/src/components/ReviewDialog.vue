<script setup>
import { ref, computed, watch } from 'vue'
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElRate,
  ElSwitch,
  ElMessage,
  ElDivider,
} from 'element-plus'

import { api } from '../lib/api'
import RatingDisplay from './RatingDisplay.vue'

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
const reviewStats = ref(null)
const loadingStats = ref(false)

function open() {
  rating.value = 5
  comment.value = ''
  isRecommended.value = false
  existingReview.value = null
  reviewStats.value = null
  loadMyReview()
  loadReviewStats()
}

function close() {
  emit('update:modelValue', false)
}

async function loadReviewStats() {
  if (!props.resource?.resourceDbId) return
  loadingStats.value = true
  try {
    const resp = await api.get(`/actions/resources/${props.resource.resourceDbId}/reviews/stats`)
    if (resp.data?.ok) {
      reviewStats.value = resp.data.data
    }
  } catch (err) {
    console.error('加载评价统计失败', err)
  } finally {
    loadingStats.value = false
  }
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
      await loadReviewStats()
      close()
    }
  } catch (err) {
    console.error('提交评价失败', err)
  } finally {
    loading.value = false
  }
}

const distributionList = computed(() => {
  if (!reviewStats.value?.distribution) return []
  const total = reviewStats.value.totalCount || 1
  const list = []
  for (let star = 5; star >= 1; star -= 1) {
    const count = reviewStats.value.distribution[star] || 0
    list.push({
      star,
      count,
      percent: Math.round((count / total) * 100),
    })
  }
  return list
})

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
    width="520px"
    @update:model-value="close"
  >
    <div v-if="reviewStats" style="margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0">
      <div style="display: flex; align-items: flex-start; gap: 24px">
        <div style="text-align: center; min-width: 100px">
          <div style="font-size: 32px; font-weight: 700; color: #1e293b; line-height: 1">
            {{ reviewStats.averageRating ? reviewStats.averageRating.toFixed(1) : '--' }}
          </div>
          <RatingDisplay :rating="Number(reviewStats.averageRating)" :show-text="false" size="default" style="margin: 8px 0" />
          <div style="font-size: 12px; color: #64748b">共 {{ reviewStats.totalCount }} 条评价</div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px">
          <div
            v-for="item in distributionList"
            :key="item.star"
            style="display: flex; align-items: center; gap: 10px; font-size: 12px"
          >
            <span style="color: #475569; width: 40px">{{ item.star }} 星</span>
            <div style="flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden">
              <div
                :style="{
                  width: item.percent + '%',
                  height: '100%',
                  background: item.star >= 4 ? '#10b981' : item.star === 3 ? '#f59e0b' : '#ef4444',
                  borderRadius: '4px',
                  transition: 'width 0.3s',
                }"
              />
            </div>
            <span style="color: #64748b; width: 56px; text-align: right">{{ item.count }} 条 ({{ item.percent }}%)</span>
          </div>
        </div>
      </div>
    </div>
    <ElSkeleton v-else-if="loadingStats" :rows="3" animated />

    <ElDivider style="margin: 8px 0 16px" />

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
