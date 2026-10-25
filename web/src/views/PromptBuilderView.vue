<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OptionGroup from '@/components/OptionGroup.vue'
import PromptActions from '@/components/PromptActions.vue'
import StyleMock from '@/components/StyleMock.vue'
import Icon from '@/components/Icon.vue'
import { stageById, stages } from '@/content/catalog'
import { PROMPT_DOWNLOAD_NAME, templateDownloadName } from '@/domain/copyText'
import {
  choicesJson,
  choicesLeftLabel,
  effectiveSelection,
  openRequiredCount,
  stageIsSkipped,
  withSelection,
  withStageSkipped,
  withoutGroup,
  withoutStageSkipped,
} from '@/domain/choices'
import { downloadMarkdown } from '@/domain/download'
import { cardScaleRange, panelRatioRange } from '@/domain/preferences'
import type { OptionGroup as OptionGroupModel, PromptOption, Stage, TemplateFile } from '@/domain/types'
import { showError, showToast, writeClipboard } from '@/feedback'
import { useLayout } from '@/composables/useLayout'
import { usePromptChoices } from '@/composables/usePromptChoices'
import { registerPromptActions } from '@/promptActions'

const route = useRoute()
const router = useRouter()
const { panelRatio, cardScale } = useLayout()
const { choices, assembled, replaceChoices, resetStoredChoices } = usePromptChoices()

const panelOpen = ref(true)
const tick = ref<string | null>(null)
const flashedStage = ref<string | null>(null)
const hoveredStyleId = ref<string | null>(null)
const focusedStyleId = ref<string | null>(null)
let tickTimer = 0
let flashTimer = 0

const stageId = computed(() => {
  const raw = route.params.stageId
  return typeof raw === 'string' && raw.length > 0 ? raw : 'plan'
})

const current = computed(() => stageById(stageId.value))
const remaining = computed(() => choicesLeftLabel(openRequiredCount(stages, choices.value)))
const skipped = computed(() => (current.value ? stageIsSkipped(choices.value, current.value.id) : false))

const previous = computed(() => neighbor(-1))
const nextStage = computed(() => neighbor(1))

function neighbor(offset: number): Stage | undefined {
  const index = stages.findIndex((stage) => stage.id === stageId.value)
  if (index < 0) return undefined
  return stages[index + offset]
}

function selectedIds(stage: Stage, group: OptionGroupModel): string[] {
  return effectiveSelection(stage, group, choices.value)
}

function markTick(action: string): void {
  tick.value = action
  window.clearTimeout(tickTimer)
  tickTimer = window.setTimeout(() => {
    if (tick.value === action) tick.value = null
  }, 2000)
}

function flashStage(id: string): void {
  flashedStage.value = id
  window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => {
    if (flashedStage.value === id) flashedStage.value = null
  }, 400)
}

async function go(stage: Stage | undefined): Promise<void> {
  if (!stage) return
  await router.push({ name: 'prompt', params: { stageId: stage.id }, query: route.query })
}

const stylePreview = computed((): PromptOption | null => {
  const stage = current.value
  if (!stage) return null
  const group = stage.optionGroups.find((item) => item.presentation === 'visual')
  if (!group) return null
  const selected = selectedIds(stage, group)
  const id = hoveredStyleId.value ?? focusedStyleId.value ?? selected[0] ?? null
  if (!id) return null
  return group.options.find((option) => option.id === id && option.preview) ?? null
})

watch(stageId, (id) => {
  hoveredStyleId.value = null
  focusedStyleId.value = null
  if (stageById(id)) flashStage(id)
})

function onInspect(optionId: string | null, source: 'hover' | 'focus'): void {
  if (source === 'hover') hoveredStyleId.value = optionId
  else focusedStyleId.value = optionId
}

function onToggle(group: OptionGroupModel, optionId: string, revert: boolean): void {
  const stage = current.value
  if (!stage) return
  replaceChoices(withSelection(choices.value, stage, group, optionId))
  if (revert) return
  const option = group.options.find((item) => item.id === optionId)
  const selected = effectiveSelection(stage, group, choices.value).includes(optionId)
  showToast('ok', selected ? `Selected ${option?.label ?? optionId}` : `Cleared ${option?.label ?? optionId}`)
}

function onSkip(group: OptionGroupModel): void {
  const stage = current.value
  if (!stage) return
  replaceChoices(withoutGroup(choices.value, stage.id, group.id))
  showToast('ok', `Skipped ${group.label}`)
}

function onSkipStage(): void {
  const stage = current.value
  if (!stage) return
  if (stageIsSkipped(choices.value, stage.id)) {
    replaceChoices(withoutStageSkipped(choices.value, stage.id))
    showToast('ok', `Included ${stage.name}`)
    return
  }
  replaceChoices(withStageSkipped(choices.value, stage.id))
  showToast('ok', `Skipped ${stage.name}`)
}

async function copyPrompt(): Promise<void> {
  try {
    await writeClipboard(assembled.value.text)
    markTick('copy')
    showToast('ok', 'Copied')
  } catch (error) {
    tick.value = null
    showError(error)
  }
}

function downloadPrompt(): void {
  try {
    downloadMarkdown(PROMPT_DOWNLOAD_NAME, assembled.value.text)
    markTick('download')
    showToast('ok', 'Downloaded')
  } catch (error) {
    tick.value = null
    showError(error)
  }
}

function downloadStarter(file: TemplateFile): void {
  try {
    downloadMarkdown(templateDownloadName(file.id), file.markdown)
    showToast('ok', 'Downloaded')
  } catch (error) {
    showError(error)
  }
}

async function share(): Promise<void> {
  try {
    const stage = current.value?.id ?? 'plan'
    await router.replace({
      name: 'prompt',
      params: { stageId: stage },
      query: { ...route.query, c: choicesJson(choices.value) },
    })
    await writeClipboard(window.location.href)
    markTick('share')
    showToast('ok', 'Copied')
  } catch (error) {
    tick.value = null
    showError(error)
  }
}

async function reset(): Promise<void> {
  try {
    await resetStoredChoices()
    markTick('reset')
    showToast('ok', 'Reset')
  } catch (error) {
    tick.value = null
    showError(error)
  }
}

function togglePanel(): void {
  panelOpen.value = !panelOpen.value
}

function onAction(action: string): void {
  if (action === 'copy') void copyPrompt()
  else if (action === 'download') downloadPrompt()
  else if (action === 'share') void share()
  else if (action === 'reset') void reset()
  else if (action === 'toggle-panel') togglePanel()
}

let unregister: (() => void) | undefined

onMounted(() => {
  unregister = registerPromptActions(onAction)
  if (typeof route.params.stageId !== 'string') {
    void router.replace({ name: 'prompt', params: { stageId: 'plan' }, query: route.query })
  }
})

onBeforeUnmount(() => {
  unregister?.()
  window.clearTimeout(tickTimer)
  window.clearTimeout(flashTimer)
})
</script>

<template>
  <div class="workspace" :class="{ 'panel-closed': !panelOpen }">
    <div class="work" data-region="work">
      <div class="work-top">
        <h1>Prompt</h1>
        <p class="remaining">{{ remaining }}</p>
        <nav class="stepper" aria-label="Stages">
          <button
            v-for="stage in stages"
            :key="stage.id"
            type="button"
            class="step"
            :class="{ skipped: stageIsSkipped(choices, stage.id), flash: flashedStage === stage.id }"
            :aria-current="stage.id === stageId ? 'step' : undefined"
            @click="go(stage)"
          >
            <span class="step-index">{{ stage.order }}</span>
            <span class="step-name">{{ stage.name }}</span>
          </button>
        </nav>
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
      </div>

      <p v-if="!current" class="error-text" role="alert">Error: No stage with id '{{ stageId }}'.</p>

      <template v-else>
        <div class="stage-intro">
          <p class="stage-kicker">{{ current.order }}. {{ current.name }}</p>
          <p class="stage-line">{{ current.oneLiner }}</p>
          <button type="button" class="text-button" @click="onSkipStage">
            {{ skipped ? `Include ${current.name}` : `Skip ${current.name}` }}
          </button>
        </div>
        <p v-if="skipped" class="skipped-note">This stage is skipped. It is left out of the prompt.</p>
        <OptionGroup
          v-for="group in current.optionGroups"
          :key="group.id"
          :group="group"
          :selected-ids="selectedIds(current, group)"
          @toggle="(optionId, revert) => onToggle(group, optionId, revert)"
          @skip="onSkip(group)"
          @inspect="onInspect"
        />
        <div class="pager">
          <button type="button" class="text-button pager-button" :disabled="!previous" @click="go(previous)">
            <Icon name="back" />
            Back
          </button>
          <button type="button" class="text-button pager-button" :disabled="!nextStage" @click="go(nextStage)">
            Next
            <Icon name="next" />
          </button>
        </div>
      </template>

      <button v-if="!panelOpen" type="button" class="text-button show-panel" @click="togglePanel">
        <Icon name="panel" />
        Show prompt
      </button>
    </div>

    <section v-show="panelOpen" class="detail" data-region="detail">
      <div class="detail-bar">
        <h2>Assembled prompt</h2>
        <PromptActions
          :tick="tick"
          @copy="copyPrompt"
          @download="downloadPrompt"
          @share="share"
          @reset="reset"
          @toggle-panel="togglePanel"
        />
      </div>
      <section v-if="stylePreview?.preview" class="style-open" aria-label="Style preview">
        <StyleMock large :name="stylePreview.label" :tokens="stylePreview.preview.tokens" />
        <div class="style-open-copy">
          <p class="style-open-kicker">Preview</p>
          <p class="style-open-fragment">{{ stylePreview.promptFragment }}</p>
        </div>
      </section>
      <pre class="prompt-text" aria-label="Assembled prompt">{{ assembled.text }}</pre>
      <div v-if="assembled.starterFiles.length > 0" class="starters">
        <h3>Starter files</h3>
        <div class="starter-row">
          <button
            v-for="file in assembled.starterFiles"
            :key="file.id"
            type="button"
            class="text-button"
            @click="downloadStarter(file)"
          >
            <Icon name="download" />
            {{ file.name }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
