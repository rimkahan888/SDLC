<script setup lang="ts">
import { useLayout } from '@/composables/useLayout'
import { cardScaleRange, panelRatioRange } from '@/domain/preferences'

const { panelRatio, cardScale } = useLayout()
</script>

<template>
  <div class="sliders">
    <label class="slider">
      Panel size
      <input
        v-model.number="panelRatio"
        type="range"
        :min="panelRatioRange.min"
        :max="panelRatioRange.max"
        step="0.01"
      />
    </label>
    <label class="slider">
      Card size
      <input
        v-model.number="cardScale"
        type="range"
        :min="cardScaleRange.min"
        :max="cardScaleRange.max"
        step="0.01"
      />
    </label>
  </div>
</template>
