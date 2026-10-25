<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { showError, showToast, writeClipboard } from '@/feedback'

const props = defineProps<{
  copyKey: string
  text: string
}>()

const copied = ref(false)
let timer = 0

async function onCopy(): Promise<void> {
  try {
    await writeClipboard(props.text)
    copied.value = true
    showToast('ok', 'Copied')
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    copied.value = false
    showError(error)
  }
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <div class="copy-item" :data-copy="copyKey" @dblclick.stop="onCopy">
    <slot />
    <span v-if="copied" class="tick" role="status">
      <Icon name="check" />
      Copied
    </span>
  </div>
</template>
