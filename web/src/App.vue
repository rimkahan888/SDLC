<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import ShortcutDialog from '@/components/ShortcutDialog.vue'
import ToastHost from '@/components/ToastHost.vue'
import { stageByOrder } from '@/content/catalog'
import { isTypingTarget, matchShortcut, viewForPath } from '@/domain/shortcuts'
import { helpOpen, toggleHelp } from '@/feedback'
import { runPromptAction } from '@/promptActions'

const route = useRoute()
const router = useRouter()

function onKeydown(event: KeyboardEvent): void {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  const view = viewForPath(route.path)

  if (helpOpen.value) {
    if (matchShortcut(event.key, view, event.shiftKey) === 'help') {
      event.preventDefault()
      toggleHelp()
    }
    return
  }

  if (event.key !== 'Escape' && isTypingTarget(event.target)) return

  const action = matchShortcut(event.key, view, event.shiftKey)
  if (!action || action === 'close') return
  if (action === 'option-prev' || action === 'option-next' || action === 'option-first' || action === 'option-last' || action === 'option-toggle') {
    return
  }

  if (action === 'help') {
    event.preventDefault()
    toggleHelp()
    return
  }

  if (view !== 'prompt') return

  if (action.startsWith('stage-')) {
    event.preventDefault()
    const order = Number(action.slice('stage-'.length))
    const stage = stageByOrder(order)
    if (!stage) return
    void router.push({ name: 'prompt', params: { stageId: stage.id }, query: route.query })
    return
  }

  event.preventDefault()
  runPromptAction(action)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="page">
    <AppHeader />
    <RouterView />
    <ToastHost />
    <ShortcutDialog />
  </div>
</template>
