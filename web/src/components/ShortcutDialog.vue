<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { shortcutsFor, viewForPath } from '@/domain/shortcuts'
import { closeHelp, helpOpen } from '@/feedback'

const route = useRoute()
const dialog = ref<HTMLDialogElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

watch(helpOpen, async (open) => {
  if (!open) return
  await nextTick()
  const element = dialog.value
  if (!element || element.open) return
  element.showModal()
  closeButton.value?.focus()
})

function onCancel(event: Event): void {
  event.preventDefault()
  closeHelp()
}
</script>

<template>
  <dialog
    v-if="helpOpen"
    ref="dialog"
    class="shortcut-dialog"
    aria-modal="true"
    aria-labelledby="shortcut-title"
    @cancel="onCancel"
  >
    <div class="dialog-bar">
      <h2 id="shortcut-title">Keyboard shortcuts</h2>
      <button ref="closeButton" type="button" class="text-button" @click="closeHelp">Close</button>
    </div>
    <ul class="shortcut-list">
      <li v-for="entry in shortcutsFor(viewForPath(route.path))" :key="entry.keys">
        <kbd>{{ entry.keys }}</kbd>
        <span>{{ entry.action }}</span>
      </li>
    </ul>
  </dialog>
</template>
