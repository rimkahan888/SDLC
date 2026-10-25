<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Icon from '@/components/Icon.vue'
import type { TemplateIndexGroup } from '@/domain/templates'

defineProps<{
  groups: TemplateIndexGroup[]
  copiedId: string | null
  copiedLabel: string | null
  backLabel: string | null
  returnStageId: string | null
}>()

defineEmits<{
  back: []
  close: []
}>()
</script>

<template>
  <div class="detail-fill">
    <div class="detail-bar">
      <div class="detail-identity">
        <button v-if="backLabel" type="button" class="icon-button" :aria-label="backLabel" @click="$emit('back')">
          <Icon name="back" />
        </button>
        <p id="template-index-label" class="detail-kicker">Templates</p>
      </div>
      <div class="detail-actions">
        <button type="button" class="icon-button" aria-label="Close templates" @click="$emit('close')">
          <Icon name="close" />
        </button>
      </div>
    </div>
    <div class="detail-scroll">
      <p v-if="groups.length === 0" class="detail-note">No templates.</p>
      <div v-else class="template-index" data-template-index>
        <section v-for="group in groups" :key="group.stageId" class="template-group">
          <h2 class="template-group-title">
            <span class="stage-order" aria-hidden="true">{{ group.order }}</span>
            <span>{{ group.stageName }}</span>
          </h2>
          <ul class="template-list">
            <li v-for="item in group.items" :key="item.id" class="template-row">
              <RouterLink
                class="template-link"
                :to="{
                  name: 'template',
                  params: { templateId: item.id },
                  query: returnStageId ? { from: 'index', stage: returnStageId } : { from: 'index' },
                }"
                :data-template-id="item.id"
              >
                <span class="copy-title">{{ item.name }}</span>
                <span v-if="item.file" class="detail-note">{{ item.file }}</span>
                <span v-if="item.summary" class="detail-note">{{ item.summary }}</span>
              </RouterLink>
              <span v-if="copiedId === item.id" class="tick" role="status">
                <Icon name="check" />
                {{ copiedLabel || 'Copied' }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
