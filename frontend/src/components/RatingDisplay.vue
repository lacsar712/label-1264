<script setup>
import { computed } from 'vue'

const props = defineProps({
  rating: { type: Number, default: 0 },
  showText: { type: Boolean, default: true },
  size: { type: String, default: 'default' },
})

const starSize = computed(() => {
  if (props.size === 'small') return '14px'
  if (props.size === 'large') return '24px'
  return '18px'
})

const stars = computed(() => {
  const full = Math.floor(props.rating)
  const half = props.rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  return { full, half, empty }
})

const ratingColor = computed(() => {
  if (props.rating >= 4.5) return '#16a34a'
  if (props.rating >= 4.0) return '#22c55e'
  if (props.rating >= 3.5) return '#eab308'
  if (props.rating >= 3.0) return '#f97316'
  if (props.rating > 0) return '#ef4444'
  return '#cbd5e1'
})
</script>

<template>
  <div style="display: flex; align-items: center; gap: 6px">
    <div style="display: flex; align-items: center">
      <span
        v-for="i in stars.full"
        :key="'f' + i"
        style="color: #fbbf24"
        :style="{ fontSize: starSize }"
      >★</span>
      <span
        v-for="i in stars.half"
        :key="'h' + i"
        style="color: #fbbf24"
        :style="{ fontSize: starSize }"
      >☆</span>
      <span
        v-for="i in stars.empty"
        :key="'e' + i"
        style="color: #e2e8f0"
        :style="{ fontSize: starSize }"
      >☆</span>
    </div>
    <span
      v-if="showText && rating > 0"
      :style="{ color: ratingColor, fontWeight: 600, fontSize: size === 'small' ? '12px' : '14px' }"
    >{{ rating.toFixed(1) }}</span>
    <span v-if="showText && rating === 0" style="color: #94a3b8; font-size: 12px">暂无评分</span>
  </div>
</template>
