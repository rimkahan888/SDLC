<script setup lang="ts">
import { ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { optionCardText } from '@/domain/copyText'
import type { OptionGroup, PromptOption } from '@/domain/types'
import { showError, showToast, writeClipboard } from '@/feedback'

const props = defineProps<{
  group: OptionGroup
  selectedIds: string[]
}>()

const emit = defineEmits<{
  toggle: [optionId: string, revert: boolean]
  skip: []
}>()

const headingId = `group-${props.group.id}`
const focusIndex = ref(0)
const tickId = ref<string | null>(null)
const buttonRefs = ref<HTMLButtonElement[]>([])
let tickTimer = 0

function setButton(element: unknown, index: number): void {
  if (element instanceof HTMLButtonElement) buttonRefs.value[index] = element
}

function isSelected(id: string): boolean {
  return props.selectedIds.includes(id)
}

function tabIndex(index: number): number {
  return index === focusIndex.value ? 0 : -1
}

function moveFocus(next: number): void {
  const last = props.group.options.length - 1
  if (last < 0) return
  const clamped = Math.min(last, Math.max(0, next))
  focusIndex.value = clamped
  buttonRefs.value[clamped]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    moveFocus(index + 1)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveFocus(index - 1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    moveFocus(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    moveFocus(props.group.options.length - 1)
  }
}

function onClick(option: PromptOption, index: number, event: MouseEvent): void {
  focusIndex.value = index
  if (event.detail > 1) return
  emit('toggle', option.id, false)
}

async function onDoubleClick(option: PromptOption): Promise<void> {
  emit('toggle', option.id, true)
  try {
    await writeClipboard(optionCardText(option.label, option.detail))
    tickId.value = option.id
    showToast('ok', 'Copied')
    window.clearTimeout(tickTimer)
    tickTimer = window.setTimeout(() => {
      if (tickId.value === option.id) tickId.value = null
    }, 2000)
  } catch (error) {
    tickId.value = null
    showError(error)
  }
}

function role(): 'radio' | 'checkbox' {
  return props.group.selection === 'single' ? 'radio' : 'checkbox'
}
</script>

<template>
  <section class="group" :aria-labelledby="headingId">
    <div class="group-head">
      <h2 :id="headingId">{{ group.label }}</h2>
      <p class="group-flag">{{ group.required ? 'Required' : 'Skippable' }}</p>
      <button
        v-if="!group.required"
        type="button"
        class="text-button"
        :aria-label="`Skip ${group.label}`"
        @click="emit('skip')"
      >
        Skip
      </button>
    </div>
    <p class="group-help">{{ group.help }}</p>
    <div
      v-if="group.presentation === 'visual'"
      class="style-placeholder"
      role="note"
      aria-label="Visual style placeholder"
    >
      <p class="placeholder-kicker">Placeholder</p>
      <p class="placeholder-title">Visual style cards</p>
      <p>
        The style mock cards are not on this page yet. Leave this group empty, or skip it. No visual
        style is added to the prompt.
      </p>
    </div>
    <div
      v-else
      class="choices"
      :role="group.selection === 'single' ? 'radiogroup' : 'group'"
      :aria-labelledby="headingId"
    >
      <button
        v-for="(option, index) in group.options"
        :key="option.id"
        :ref="(element) => setButton(element, index)"
        type="button"
        class="choice"
        :role="role()"
        :aria-checked="isSelected(option.id)"
        :tabindex="tabIndex(index)"
        @click="onClick(option, index, $event)"
        @dblclick.prevent="onDoubleClick(option)"
        @keydown="onKeydown($event, index)"
      >
        <span class="choice-mark" aria-hidden="true" />
        <span class="choice-copy">
          <span class="choice-label">{{ option.label }}</span>
          <span class="choice-detail">{{ option.detail }}</span>
        </span>
        <span v-if="tickId === option.id" class="tick" role="status">
          <Icon name="check" />
          Copied
        </span>
      </button>
    </div>
  </section>
</template>
