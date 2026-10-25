<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import { templateDownloadName } from '@/domain/copyText'
import { templateSections } from '@/domain/markdown'
import type { TemplateFile } from '@/domain/types'
import { showError, showToast, writeClipboard } from '@/feedback'

const props = defineProps<{
  template: TemplateFile
  raw: boolean
  actionTick: 'copy' | 'download' | null
  backLabel: string
}>()

defineEmits<{
  back: []
  close: []
  copy: []
  download: []
  toggle: []
}>()

const sections = computed(() => templateSections(props.template.markdown))
const downloadName = computed(() => templateDownloadName(props.template.id))
const copiedId = ref<string | null>(null)
let timer = 0

async function onCopy(text: string, key: string): Promise<void> {
  try {
    await writeClipboard(text)
    copiedId.value = key
    showToast('ok', 'Copied')
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      if (copiedId.value === key) copiedId.value = null
    }, 2000)
  } catch (error) {
    copiedId.value = null
    showError(error)
  }
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <div class="detail-fill" data-template-view :data-markdown-mode="raw ? 'raw' : 'rendered'">
    <div class="detail-bar">
      <div class="detail-identity">
        <button type="button" class="icon-button" :aria-label="backLabel" @click="$emit('back')">
          <Icon name="back" />
        </button>
        <p id="template-detail-label" class="detail-kicker">{{ template.name }}</p>
      </div>
      <div class="detail-actions">
        <div class="action">
          <button type="button" class="icon-button" aria-label="Copy template" @click="$emit('copy')">
            <Icon name="copy" />
          </button>
          <span v-if="actionTick === 'copy'" class="tick" role="status">
            <Icon name="check" />
            Copied
          </span>
        </div>
        <div class="action">
          <button
            type="button"
            class="icon-button"
            :aria-label="`Download ${downloadName}`"
            @click="$emit('download')"
          >
            <Icon name="download" />
          </button>
          <span v-if="actionTick === 'download'" class="tick" role="status">
            <Icon name="check" />
            Downloaded
          </span>
        </div>
        <button
          type="button"
          class="icon-button"
          :aria-pressed="raw"
          :aria-label="raw ? 'Show rendered markdown' : 'Show raw markdown'"
          @click="$emit('toggle')"
        >
          <Icon name="code" />
        </button>
        <button type="button" class="icon-button" aria-label="Close template" @click="$emit('close')">
          <Icon name="close" />
        </button>
      </div>
    </div>
    <p class="template-file detail-note">{{ template.file }}</p>
    <div class="detail-scroll">
      <div v-if="raw" class="copy-item template-raw-wrap" data-copy="raw" @dblclick="onCopy(template.markdown, 'raw')">
        <pre class="template-raw">{{ template.markdown }}</pre>
        <span v-if="copiedId === 'raw'" class="tick" role="status">
          <Icon name="check" />
          Copied
        </span>
      </div>
      <article v-else class="template-doc" :aria-label="template.name">
        <div
          v-for="section in sections"
          :key="section.id"
          class="md-section copy-item"
          :data-copy="section.id"
          @dblclick="onCopy(section.copyText, section.id)"
        >
          <template v-for="piece in section.pieces" :key="piece.id">
            <div
              v-if="piece.kind === 'code'"
              class="md-code copy-item"
              :data-copy="piece.id"
              @dblclick.stop="onCopy(piece.copyText, piece.id)"
            >
              <div v-html="piece.html" />
              <span v-if="copiedId === piece.id" class="tick" role="status">
                <Icon name="check" />
                Copied
              </span>
            </div>
            <div v-else class="md-prose" v-html="piece.html" />
          </template>
          <span v-if="copiedId === section.id" class="tick" role="status">
            <Icon name="check" />
            Copied
          </span>
        </div>
      </article>
    </div>
  </div>
</template>
