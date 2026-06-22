<script setup>
import { computed, watch, ref } from 'vue'
import 'echarts'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

import { useAuth } from '../stores/auth'

use([CanvasRenderer])

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: [Number, String], default: 320 },
})

const { state } = useAuth()

const chartRef = ref(null)

const chartTheme = computed(() => {
  const t = state.user?.chartTheme
  return t === 'dark' ? 'dark' : 'light'
})

const LIGHT_PALETTE = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0d9488',
  '#0891b2', '#4f46e5', '#9333ea', '#c026d3',
]

const DARK_PALETTE = [
  '#60a5fa', '#a78bfa', '#f472b6', '#f87171',
  '#fb923c', '#facc15', '#4ade80', '#2dd4bf',
  '#22d3ee', '#818cf8', '#c084fc', '#e879f9',
]

const darkThemeBase = {
  backgroundColor: 'transparent',
  color: DARK_PALETTE,
  title: { textStyle: { color: '#e2e8f0' } },
  legend: { textStyle: { color: '#cbd5e1' } },
  tooltip: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    textStyle: { color: '#f1f5f9' },
  },
  grid: { backgroundColor: 'transparent' },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#475569' } },
    axisLabel: { color: '#cbd5e1' },
    splitLine: { lineStyle: { color: '#334155' } },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#475569' } },
    axisLabel: { color: '#cbd5e1' },
    splitLine: { lineStyle: { color: '#1e293b' } },
    nameTextStyle: { color: '#cbd5e1' },
  },
  timeline: {
    lineStyle: { color: '#475569' },
    label: { color: '#cbd5e1' },
    itemStyle: { color: '#3b82f6' },
  },
  radar: {
    axisName: { color: '#cbd5e1' },
    splitLine: { lineStyle: { color: '#334155' } },
    splitArea: {
      areaStyle: { color: ['#0f172a', '#1e293b'] },
    },
    axisLine: { lineStyle: { color: '#475569' } },
  },
  funnel: { label: { color: '#f1f5f9' } },
  pie: { label: { color: '#e2e8f0' } },
  sankey: {
    label: { color: '#e2e8f0' },
    nodeLabel: { color: '#e2e8f0' },
  },
  wordCloud: {
    textStyle: {
      color: () => {
        const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf']
        return colors[Math.floor(Math.random() * colors.length)]
      },
    },
  },
  graph: {
    label: { color: '#e2e8f0' },
    edgeLabel: { color: '#cbd5e1' },
  },
}

const lightThemeBase = {
  backgroundColor: 'transparent',
  color: LIGHT_PALETTE,
}

function mergeDeep(target, source) {
  const output = { ...target }
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] })
        } else {
          output[key] = mergeDeep(target[key], source[key])
        }
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

function applyAxisTheme(option, axisType, themeAxis) {
  const apply = (axisCfg) => {
    if (!axisCfg) return
    if (themeAxis.axisLine) {
      axisCfg.axisLine = mergeDeep(
        { lineStyle: themeAxis.axisLine.lineStyle },
        axisCfg.axisLine || {},
      )
    }
    if (themeAxis.axisLabel) {
      axisCfg.axisLabel = mergeDeep(
        { color: themeAxis.axisLabel.color },
        axisCfg.axisLabel || {},
      )
    }
    if (themeAxis.splitLine) {
      axisCfg.splitLine = mergeDeep(
        { lineStyle: themeAxis.splitLine.lineStyle },
        axisCfg.splitLine || {},
      )
    }
    if (themeAxis.nameTextStyle) {
      axisCfg.nameTextStyle = mergeDeep(themeAxis.nameTextStyle, axisCfg.nameTextStyle || {})
    }
  }

  const axes = option[axisType]
  if (Array.isArray(axes)) {
    axes.forEach(apply)
  } else if (axes) {
    apply(axes)
  }
}

function applyThemeToSeries(baseOption, base) {
  const series = baseOption.series
  if (!series) return baseOption
  const patched = Array.isArray(series) ? series.slice() : [series]
  patched.forEach((s) => {
    if (!s) return
    const type = s.type
    const themeCfg = base[type]
    if (!themeCfg) return
    Object.keys(themeCfg).forEach((k) => {
      if (s[k] === undefined) {
        s[k] = themeCfg[k]
      }
    })
  })
  return { ...baseOption, series: Array.isArray(series) ? patched : patched[0] }
}

const themedOption = computed(() => {
  const isDark = chartTheme.value === 'dark'
  const base = isDark ? darkThemeBase : lightThemeBase

  let merged = mergeDeep(base, props.option || {})

  if (!props.option || !Array.isArray(props.option.color)) {
    merged.color = isDark ? DARK_PALETTE : LIGHT_PALETTE
  }

  if (isDark) {
    applyAxisTheme(merged, 'xAxis', base.categoryAxis || base.valueAxis)
    applyAxisTheme(merged, 'yAxis', base.categoryAxis || base.valueAxis)
    if (merged.legend) {
      merged.legend = mergeDeep(
        { textStyle: base.legend.textStyle },
        merged.legend,
      )
    }
    if (merged.tooltip) {
      merged.tooltip = mergeDeep(base.tooltip, merged.tooltip)
    }
    if (merged.radar) {
      merged.radar = mergeDeep(base.radar, merged.radar)
    }
    merged = applyThemeToSeries(merged, base)
  }

  return merged
})

const style = computed(() => ({
  width: '100%',
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))

// Force re-render option when theme changes
const renderKey = ref(0)
watch(chartTheme, () => {
  renderKey.value += 1
  if (chartRef.value && chartRef.value.chart) {
    setTimeout(() => {
      chartRef.value.chart.resize()
    }, 10)
  }
})
</script>

<template>
  <VChart
    ref="chartRef"
    :key="renderKey"
    :option="themedOption"
    autoresize
    :style="style"
  />
</template>
