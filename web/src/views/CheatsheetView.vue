<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import SizeSliders from '@/components/SizeSliders.vue'
import { contentState, loadContent } from '@/content/catalog'
import { useStageSelection } from '@/composables/useStageSelection'
import { documentNames, moveStageIndex, stageCardText, type StageMove } from '@/domain/cheatsheet'
import { isTypingTarget, matchShortcut } from '@/domain/shortcuts'
import type { Stage } from '@/domain/types'
import { helpOpen, showError, showToast, writeClipboard } from '@/feedback'

const router = useRouter()
const { selectedStageId, selectStage } = useStageSelection()

void loadContent().catch(() => {
  // The page alert and the toast already name the failure.
})

const stages = computed(() => [...contentState.stages].sort((left, right) => left.order - right.order))
const copiedId = ref<string | null>(null)
const cardRefs = ref<HTMLElement[]>([])
let tickTimer = 0

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

function openStage(stage: Stage): void {
  selectStage(stage.id)
  void router.push({ name: 'prompt', params: { stageId: stage.id } })
}

async function onCopy(stage: Stage): Promise<void> {
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
  const action = matchShortcut(event.key, 'cheatsheet', event.shiftKey)
  if (!action || action === 'help' || action === 'close') return
  const count = stages.value.length
  if (count === 0) return

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

  if (action === 'card-select') {
    if (!stageFromTarget(event.target) && !isPageBackground(event.target)) return
    event.preventDefault()
    const index = currentIndex()
    focusCard(index >= 0 ? index : 0)
    return
  }

  if (action === 'card-open') {
    const fromTarget = stageFromTarget(event.target)
    if (!fromTarget && !isPageBackground(event.target)) return
    const stage = fromTarget ?? stages.value[currentIndex()]
    if (!stage) return
    event.preventDefault()
    openStage(stage)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(tickTimer)
})
</script>

<template>
  <main class="cheatsheet">
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
              @click="focusCard(index)"
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
              @click="selectStage(stage.id)"
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
                  @click="selectStage(stage.id)"
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
</template>
