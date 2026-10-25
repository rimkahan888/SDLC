import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { contentState } from '@/content/catalog'
import { assemblePrompt } from '@/domain/assemble'
import {
  PROMPT_STORAGE_KEY,
  choicesJson,
  emptyChoices,
  isEmptyChoices,
  parseChoicesJson,
} from '@/domain/choices'
import type { AssembledPrompt, PromptChoices } from '@/domain/types'
import { reportStorageError, showError } from '@/feedback'

function readStoredChoices(): PromptChoices {
  try {
    const raw = localStorage.getItem(PROMPT_STORAGE_KEY)
    if (!raw) return emptyChoices()
    const parsed = parseChoicesJson(raw)
    if (!parsed.ok) {
      showError(new Error(parsed.message))
      return emptyChoices()
    }
    return parsed.value
  } catch (error) {
    reportStorageError(error)
    return emptyChoices()
  }
}

function writeStoredChoices(choices: PromptChoices): void {
  try {
    if (isEmptyChoices(choices)) localStorage.removeItem(PROMPT_STORAGE_KEY)
    else localStorage.setItem(PROMPT_STORAGE_KEY, choicesJson(choices))
  } catch (error) {
    reportStorageError(error)
  }
}

export function usePromptChoices() {
  const route = useRoute()
  const router = useRouter()
  const choices = ref<PromptChoices>(emptyChoices())
  const ready = ref(false)
  const pauseUrl = ref(false)
  let applyingUrl = false

  function applyShared(raw: string): void {
    const parsed = parseChoicesJson(raw)
    if (!parsed.ok) {
      showError(new Error(`The shared link could not be read. ${parsed.message}`))
      return
    }
    applyingUrl = true
    choices.value = parsed.value
    writeStoredChoices(parsed.value)
    applyingUrl = false
  }

  const initial = readStoredChoices()
  const shared = route.query.c
  if (typeof shared === 'string' && shared.length > 0) {
    const parsed = parseChoicesJson(shared)
    if (parsed.ok) {
      choices.value = parsed.value
      writeStoredChoices(parsed.value)
    } else {
      choices.value = initial
      showError(new Error(`The shared link could not be read. ${parsed.message}`))
    }
  } else if (Array.isArray(shared)) {
    choices.value = initial
    showError(new Error('The shared link could not be read. The c parameter is repeated.'))
  } else {
    choices.value = initial
  }
  ready.value = true

  watch(
    choices,
    (value) => {
      if (!ready.value || applyingUrl || pauseUrl.value) return
      writeStoredChoices(value)
      const current = route.query.c
      if (typeof current !== 'string') return
      const next = choicesJson(value)
      if (current === next) return
      void router.replace({
        name: 'prompt',
        params: route.params,
        query: { ...route.query, c: next },
      })
    },
    { deep: true },
  )

  watch(
    () => route.query.c,
    (value) => {
      if (!ready.value || applyingUrl) return
      if (typeof value !== 'string' || value.length === 0) return
      if (value === choicesJson(choices.value)) return
      applyShared(value)
    },
  )

  const assembled = computed<AssembledPrompt>(() => {
    if (!contentState.ready) return { text: '', starterFiles: [] }
    return assemblePrompt(
      contentState.stages,
      contentState.promptShell,
      choices.value,
      contentState.templates,
    )
  })

  function replaceChoices(next: PromptChoices): void {
    choices.value = next
  }

  async function clearSharedQuery(): Promise<void> {
    if (route.query.c === undefined) return
    const query = { ...route.query }
    delete query.c
    await router.replace({ name: 'prompt', params: route.params, query })
  }

  async function resetStoredChoices(): Promise<void> {
    pauseUrl.value = true
    choices.value = emptyChoices()
    writeStoredChoices(choices.value)
    await clearSharedQuery()
    pauseUrl.value = false
  }

  return {
    choices,
    assembled,
    replaceChoices,
    resetStoredChoices,
  }
}
