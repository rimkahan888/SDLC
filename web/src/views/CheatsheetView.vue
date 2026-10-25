<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import SizeSliders from '@/components/SizeSliders.vue'
import StageDetail from '@/components/StageDetail.vue'
import { contentState, loadContent } from '@/content/catalog'
import { useStageSelection } from '@/composables/useStageSelection'
import { documentNames, moveStageIndex, stageCardText, type StageMove } from '@/domain/cheatsheet'
import { activeDetailTab, detailTabs, type DetailTab } from '@/domain/detail'
import { isTypingTarget, matchShortcut } from '@/domain/shortcuts'
import type { Stage } from '@/domain/types'
import { helpOpen, showError, showToast, writeClipboard } from '@/feedback'

const route = useRoute()
const router = useRouter()
const { selectedStageId, selectStage } = useStageSelection()

void loadContent().catch(() => {
  // The page alert and the toast already name the failure.
})

const stages = computed(() => [...contentState.stages].sort((left, right) => left.order - right.order))
const copiedId = ref<string | null>(null)
const cardRefs = ref<HTMLElement[]>([])
const activeTab = ref<DetailTab>('steps')
let tickTimer = 0
let openTimer = 0

// Wait out the double-click window so a copy does not open the panel and shift the card.
const clickOpenDelayMs = 250

const detailOpen = computed(() => route.name === 'stage' || route.name === 'template')

const panelStage = computed(() => {
  if (!contentState.ready) return null
  if (route.name === 'stage' && typeof route.params.stageId === 'string') {
    return stages.value.find((stage) => stage.id === route.params.stageId) ?? null
  }
  if (route.name === 'template' && typeof route.params.templateId === 'string') {
    const template = contentState.templates.find((item) => item.id === route.params.templateId)
    if (!template) return null
    return stages.value.find((stage) => stage.id === template.stage) ?? null
  }
  return null
})

const panelProblem = computed(() => {
  if (!contentState.ready) return ''
  if (route.name === 'stage' && typeof route.params.stageId === 'string' && !panelStage.value) {
    return `No stage with id '${route.params.stageId}'.`
  }
  if (route.name === 'template' && typeof route.params.templateId === 'string') {
    const known = contentState.templates.some((item) => item.id === route.params.templateId)
    if (!known) return `No template with id '${route.params.templateId}'.`
    if (!panelStage.value) return `No stage for template '${route.params.templateId}'.`
  }
  return ''
})

const currentTemplateId = computed(() =>
  route.name === 'template' && typeof route.params.templateId === 'string' ? route.params.templateId : null,
)

const panelIndex = computed(() => stages.value.findIndex((stage) => stage.id === panelStage.value?.id))

watch(panelStage, (stage) => {
  if (stage) selectStage(stage.id)
})

watch(
  () => [panelStage.value?.id ?? '', String(route.name), String(route.params.templateId ?? '')] as const,
  () => {
    const stage = panelStage.value
    if (!stage) return
    const prefer = route.name === 'template' ? 'documents' : undefined
    activeTab.value = activeDetailTab(activeTab.value, detailTabs(stage), prefer)
  },
)

function namesFor(stage: Stage): string[] {
  return documentNames(stage.templates, contentState.templates)
}

function setCard(element: unknown, index: number): void {
  if (element instanceof HTMLElement) cardRefs.value[index] = element
}

function currentIndex(): number {
  return stages.value.findIndex((stage) => stage.id === selectedStageId.value)
}

function focusCard(index: number): void {
  const stage = stages.value[index]
  const element = cardRefs.value[index]
  if (!stage || !element) return
  selectStage(stage.id)
  element.focus()
  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'nearest' })
  }
  if (detailOpen.value && !(route.name === 'stage' && route.params.stageId === stage.id)) {
    void router.push({ name: 'stage', params: { stageId: stage.id } })
  }
}

function stageFromTarget(target: EventTarget | null): Stage | undefined {
  if (!(target instanceof HTMLElement)) return undefined
  const holder = target.closest<HTMLElement>('[data-stage-id], [data-loop-stage]')
  const id = holder?.dataset.stageId ?? holder?.dataset.loopStage
  if (!id) return undefined
  return stages.value.find((stage) => stage.id === id)
}

function isPageBackground(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true
  return target === document.body || target === document.documentElement
}

function isControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('a, button, input, textarea, select'))
}

function tabFromTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null
  return target.closest<HTMLElement>('[role="tab"]')
}

function openPanel(id: string): void {
  selectStage(id)
  if (route.name === 'stage' && route.params.stageId === id) return
  void router.push({ name: 'stage', params: { stageId: id } })
}

function closePanel(): void {
  if (route.name !== 'stage' && route.name !== 'template') return
  void router.push({ name: 'cheatsheet' })
}

function openFromLoop(index: number): void {
  const stage = stages.value[index]
  const element = cardRefs.value[index]
  if (!stage) return
  selectStage(stage.id)
  element?.focus()
  openPanel(stage.id)
}

function onCardClick(event: MouseEvent, id: string): void {
  const target = event.target
  if (target instanceof Element && target.closest('a, button')) return
  window.clearTimeout(openTimer)
  openTimer = window.setTimeout(() => openPanel(id), clickOpenDelayMs)
}

function shiftStage(direction: StageMove): void {
  const count = stages.value.length
  if (count === 0) return
  const index = moveStageIndex(currentIndex(), count, direction)
  const stage = stages.value[index]
  const element = cardRefs.value[index]
  if (!stage) return
  const inPanel =
    document.activeElement instanceof HTMLElement && Boolean(document.activeElement.closest('[data-region="detail"]'))
  selectStage(stage.id)
  if (!inPanel && element) {
    element.focus()
    if (typeof element.scrollIntoView === 'function') element.scrollIntoView({ block: 'nearest' })
  }
  if (detailOpen.value && !(route.name === 'stage' && route.params.stageId === stage.id)) {
    void router.push({ name: 'stage', params: { stageId: stage.id } })
  }
}

function moveDetailTab(direction: StageMove): void {
  const stage = panelStage.value
  if (!stage) return
  const tabs = detailTabs(stage)
  const next = tabs[moveStageIndex(tabs.indexOf(activeTab.value), tabs.length, direction)]
  if (!next) return
  activeTab.value = next
  document.getElementById(`detail-tab-${next}`)?.focus()
}

function openInBuilder(stage: Stage): void {
  void router.push({ name: 'prompt', params: { stageId: stage.id } })
}

async function onCopy(stage: Stage): Promise<void> {
  window.clearTimeout(openTimer)
  const text = stageCardText(stage, namesFor(stage))
  try {
    await writeClipboard(text)
    copiedId.value = stage.id
    showToast('ok', 'Copied')
    window.clearTimeout(tickTimer)
    tickTimer = window.setTimeout(() => {
      if (copiedId.value === stage.id) copiedId.value = null
    }, 2000)
  } catch (error) {
    copiedId.value = null
    showError(error)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
  if (helpOpen.value) return
  if (event.key !== 'Escape' && isTypingTarget(event.target)) return

  if (tabFromTarget(event.target) && panelStage.value) {
    const direction: StageMove | null =
      event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? 'prev'
        : event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? 'next'
          : null
    if (direction) {
      event.preventDefault()
      moveDetailTab(direction)
      return
    }
  }

  const action = matchShortcut(event.key, 'cheatsheet', event.shiftKey)
  if (!action || action === 'help') return
  if (action === 'close') {
    if (!detailOpen.value) return
    event.preventDefault()
    closePanel()
    return
  }

  const count = stages.value.length
  if (count === 0) return

  if (action === 'panel-prev' || action === 'panel-next') {
    if (!detailOpen.value) return
    event.preventDefault()
    shiftStage(action === 'panel-prev' ? 'prev' : 'next')
    return
  }

  if (action.startsWith('stage-')) {
    event.preventDefault()
    const order = Number(action.slice('stage-'.length))
    const index = stages.value.findIndex((stage) => stage.order === order)
    if (index >= 0) focusCard(index)
    return
  }

  if (action === 'card-prev' || action === 'card-next' || action === 'card-first' || action === 'card-last') {
    event.preventDefault()
    const direction: StageMove =
      action === 'card-prev' ? 'prev' : action === 'card-next' ? 'next' : action === 'card-first' ? 'first' : 'last'
    focusCard(moveStageIndex(currentIndex(), count, direction))
    return
  }

  if (action === 'panel-open') {
    if (isControl(event.target)) return
    const fromTarget = stageFromTarget(event.target)
    if (!fromTarget && !isPageBackground(event.target)) return
    const index = fromTarget ? stages.value.findIndex((stage) => stage.id === fromTarget.id) : currentIndex()
    const stage = stages.value[index >= 0 ? index : 0]
    if (!stage) return
    event.preventDefault()
    focusCard(stages.value.findIndex((item) => item.id === stage.id))
    openPanel(stage.id)
    return
  }

  if (action === 'card-open') {
    if (isControl(event.target)) return
    const fromTarget = stageFromTarget(event.target)
    if (!fromTarget && !isPageBackground(event.target)) return
    const stage = fromTarget ?? stages.value[currentIndex()]
    if (!stage) return
    event.preventDefault()
    openInBuilder(stage)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(tickTimer)
  window.clearTimeout(openTimer)
})
</script>

<template>
  <div class="workspace">
    <main class="work cheatsheet" data-region="work">
      <h1>Cheatsheet</h1>
      <p class="cheatsheet-intro">Plan through Maintain, then back to Plan.</p>
      <SizeSliders />
      <p v-if="!contentState.ready && !contentState.error" class="stage-line">Loading content.</p>
      <template v-else>
        <nav class="loop" aria-label="Lifecycle">
          <div class="loop-track">
            <div v-for="(stage, index) in stages" :key="stage.id" class="loop-item">
              <button
                type="button"
                class="loop-step"
                :data-loop-stage="stage.id"
                :aria-current="selectedStageId === stage.id ? 'true' : undefined"
                @click="openFromLoop(index)"
              >
                <span class="step-index">{{ stage.order }}</span>
                <span>{{ stage.name }}</span>
              </button>
              <span class="loop-join">
                <Icon :name="index === stages.length - 1 ? 'loop' : 'next'" />
                <span v-if="index === stages.length - 1" class="visually-hidden">Returns to Plan</span>
              </span>
            </div>
          </div>
        </nav>
        <div class="stage-board">
          <ol class="stage-grid">
            <li v-for="(stage, index) in stages" :key="stage.id">
              <article
                :ref="(element) => setCard(element, index)"
                class="stage-card"
                :data-stage-id="stage.id"
                :data-selected="selectedStageId === stage.id ? 'true' : 'false'"
                :aria-labelledby="`stage-${stage.id}-title`"
                :aria-current="selectedStageId === stage.id ? 'true' : undefined"
                tabindex="0"
                @focus="selectStage(stage.id)"
                @click="onCardClick($event, stage.id)"
                @dblclick="onCopy(stage)"
              >
                <div class="stage-card-head">
                  <p class="stage-order">{{ stage.order }}</p>
                  <h2 :id="`stage-${stage.id}-title`">{{ stage.name }}</h2>
                  <span v-if="copiedId === stage.id" class="tick" role="status">
                    <Icon name="check" />
                    Copied
                  </span>
                  <RouterLink
                    class="text-button prompt-link"
                    :to="{ name: 'prompt', params: { stageId: stage.id } }"
                    :aria-label="`Open ${stage.name} in the prompt builder`"
                    @click.stop="selectStage(stage.id)"
                  >
                    <Icon name="prompt" />
                    Prompt
                  </RouterLink>
                </div>
                <p class="stage-line">{{ stage.oneLiner }}</p>
                <div>
                  <p class="meta-label">Purpose</p>
                  <p class="meta-value">{{ stage.goal }}</p>
                </div>
                <div>
                  <p class="meta-label">Key artifact</p>
                  <p class="meta-value">{{ stage.keyArtifact }}</p>
                </div>
                <div>
                  <p class="meta-label">Documents</p>
                  <ul v-if="namesFor(stage).length > 0" class="doc-list">
                    <li v-for="name in namesFor(stage)" :key="name">{{ name }}</li>
                  </ul>
                  <p v-else class="meta-value">None</p>
                </div>
                <div>
                  <p class="meta-label">Option groups</p>
                  <ul class="chip-list">
                    <li v-for="group in stage.optionGroups" :key="group.id" class="chip">
                      <span>{{ group.label }}</span>
                      <span class="chip-meta">{{ group.required ? 'Required' : 'Skippable' }}</span>
                      <span v-if="group.presentation === 'visual'" class="chip-meta">Visual</span>
                    </li>
                  </ul>
                </div>
              </article>
            </li>
          </ol>
        </div>
      </template>
    </main>
    <section
      v-if="detailOpen"
      class="detail"
      data-region="detail"
      :data-detail-stage="panelStage?.id ?? ''"
      :aria-labelledby="panelStage ? 'stage-detail-label' : undefined"
      :aria-label="panelStage ? undefined : 'Stage detail'"
    >
      <StageDetail
        v-if="panelStage"
        :stage="panelStage"
        :templates="contentState.templates"
        :tab="activeTab"
        :current-template-id="currentTemplateId"
        :can-previous="panelIndex > 0"
        :can-next="panelIndex >= 0 && panelIndex < stages.length - 1"
        @update:tab="activeTab = $event"
        @close="closePanel"
        @previous="shiftStage('prev')"
        @next="shiftStage('next')"
      />
      <template v-else>
        <div class="detail-bar">
          <p class="detail-kicker">Stage</p>
          <button type="button" class="icon-button" aria-label="Close stage detail" @click="closePanel">
            <Icon name="close" />
          </button>
        </div>
        <p v-if="!contentState.ready && !contentState.error" class="detail-note detail-pad">Loading content.</p>
        <p v-else class="error-text detail-pad" role="alert">Error: {{ panelProblem || contentState.error }}</p>
      </template>
    </section>
  </div>
</template>
