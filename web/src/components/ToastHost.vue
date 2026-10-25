<script setup lang="ts">
import { toastState } from '@/feedback'
</script>

<template>
  <div class="toast-host">
    <p
      v-if="toastState"
      :key="toastState.id"
      class="toast"
      :class="toastState.kind"
      :role="toastState.kind === 'error' ? 'alert' : 'status'"
    >
      {{ toastState.message }}
    </p>
  </div>
</template>
