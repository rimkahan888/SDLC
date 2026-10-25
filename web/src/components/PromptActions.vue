<script setup lang="ts">
import Icon from '@/components/Icon.vue'

defineProps<{
  tick: string | null
}>()

defineEmits<{
  copy: []
  download: []
  share: []
  reset: []
  togglePanel: []
}>()

function badge(tick: string | null, action: string): string | null {
  if (tick !== action) return null
  if (action === 'download') return 'Downloaded'
  if (action === 'reset') return 'Reset'
  return 'Copied'
}
</script>

<template>
  <div class="prompt-actions">
    <div class="action">
      <button type="button" class="icon-button" aria-label="Copy prompt" @click="$emit('copy')">
        <Icon name="copy" />
      </button>
      <span v-if="badge(tick, 'copy')" class="tick" role="status">
        <Icon name="check" />
        {{ badge(tick, 'copy') }}
      </span>
    </div>
    <div class="action">
      <button type="button" class="icon-button" aria-label="Download prompt" @click="$emit('download')">
        <Icon name="download" />
      </button>
      <span v-if="badge(tick, 'download')" class="tick" role="status">
        <Icon name="check" />
        {{ badge(tick, 'download') }}
      </span>
    </div>
    <div class="action">
      <button type="button" class="icon-button" aria-label="Share link" @click="$emit('share')">
        <Icon name="share" />
      </button>
      <span v-if="badge(tick, 'share')" class="tick" role="status">
        <Icon name="check" />
        {{ badge(tick, 'share') }}
      </span>
    </div>
    <div class="action">
      <button type="button" class="icon-button" aria-label="Reset choices" @click="$emit('reset')">
        <Icon name="reset" />
      </button>
      <span v-if="badge(tick, 'reset')" class="tick" role="status">
        <Icon name="check" />
        {{ badge(tick, 'reset') }}
      </span>
    </div>
    <div class="action">
      <button type="button" class="icon-button" aria-label="Hide prompt" @click="$emit('togglePanel')">
        <Icon name="panel" />
      </button>
    </div>
  </div>
</template>
