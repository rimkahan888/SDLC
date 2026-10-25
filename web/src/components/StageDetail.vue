<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CopyItem from '@/components/CopyItem.vue'
import Icon from '@/components/Icon.vue'
import {
  artifactCopyText,
  detailTabLabels,
  detailTabs,
  documentCopyText,
  groupCopyText,
  groupFlags,
  optionCopyText,
  stageDocuments,
  stepCopyText,
  type DetailTab,
} from '@/domain/detail'
import type { Stage, TemplateFile } from '@/domain/types'

const props = defineProps<{
  stage: Stage
  templates: TemplateFile[]
  tab: DetailTab
  currentTemplateId: string | null
  canPrevious: boolean
  canNext: boolean
}>()

const emit = defineEmits<{
  close: []
  previous: []
  next: []
  'update:tab': [tab: DetailTab]
}>()

const tabs = computed(() => detailTabs(props.stage))
const documents = computed(() => stageDocuments(props.stage.templates, props.templates))
const shown = computed(() => (tabs.value.includes(props.tab) ? props.tab : (tabs.value[0] ?? 'documents')))
</script>

<template>
  <div class="detail-fill">
    <div class="detail-bar">
      <p id="stage-detail-label" class="detail-kicker">
        <span class="stage-order">{{ stage.order }}</span>
        <span>{{ stage.name }}</span>
      </p>
      <div class="detail-actions">
        <button
          type="button"
          class="icon-button"
          aria-label="Previous stage"
          :disabled="!canPrevious"
          @click="emit('previous')"
        >
          <Icon name="back" />
        </button>
        <button type="button" class="icon-button" aria-label="Next stage" :disabled="!canNext" @click="emit('next')">
          <Icon name="next" />
        </button>
        <RouterLink class="icon-button" :to="{ name: 'templates', query: { stage: stage.id } }" aria-label="All templates">
          <Icon name="list" />
        </RouterLink>
        <button type="button" class="icon-button" aria-label="Close stage detail" @click="emit('close')">
          <Icon name="close" />
        </button>
      </div>
    </div>
    <div class="detail-scroll">
      <div class="detail-facts">
        <CopyItem copy-key="purpose" :text="stage.goal">
          <p class="meta-label">Purpose</p>
          <p class="detail-body">{{ stage.goal }}</p>
        </CopyItem>
        <CopyItem copy-key="artifact" :text="artifactCopyText(stage.keyArtifact)">
          <p class="meta-label">Key artifact</p>
          <p class="detail-body">{{ stage.keyArtifact }}</p>
        </CopyItem>
      </div>
      <RouterLink class="text-button detail-launch" :to="{ name: 'prompt', params: { stageId: stage.id } }">
        <Icon name="prompt" />
        Open in prompt builder
      </RouterLink>
      <div class="detail-tabs" role="tablist" aria-label="Stage sections">
        <button
          v-for="item in tabs"
          :id="`detail-tab-${item}`"
          :key="item"
          type="button"
          class="detail-tab"
          role="tab"
          :data-tab="item"
          :aria-selected="shown === item"
          :aria-controls="`detail-panel-${item}`"
          :tabindex="shown === item ? 0 : -1"
          @click="emit('update:tab', item)"
        >
          {{ detailTabLabels[item] }}
        </button>
      </div>
      <div :id="`detail-panel-${shown}`" role="tabpanel" :aria-labelledby="`detail-tab-${shown}`">
        <ul v-if="shown === 'steps'" class="detail-list">
          <li v-for="step in stage.steps" :key="step.id">
            <CopyItem :copy-key="`step:${step.id}`" :text="stepCopyText(step)">
              <p class="copy-title">{{ step.title }}</p>
              <p class="detail-note">{{ step.text }}</p>
            </CopyItem>
          </li>
        </ul>
        <ul v-else-if="shown === 'done'" class="detail-list">
          <li v-for="check in stage.doneChecks" :key="check.id">
            <CopyItem :copy-key="`check:${check.id}`" :text="check.text">
              <p class="detail-body">{{ check.text }}</p>
            </CopyItem>
          </li>
        </ul>
        <ul v-else-if="shown === 'pitfalls'" class="detail-list">
          <li v-for="pitfall in stage.pitfalls" :key="pitfall.id">
            <CopyItem :copy-key="`pitfall:${pitfall.id}`" :text="pitfall.text">
              <p class="detail-body">{{ pitfall.text }}</p>
            </CopyItem>
          </li>
        </ul>
        <p v-else-if="shown === 'documents' && documents.length === 0" class="detail-note">None</p>
        <ul v-else-if="shown === 'documents'" class="detail-list">
          <li v-for="document in documents" :key="document.id">
            <CopyItem :copy-key="`doc:${document.id}`" :text="documentCopyText(document)">
              <RouterLink
                class="text-button"
                :to="{ name: 'template', params: { templateId: document.id } }"
                :aria-current="currentTemplateId === document.id ? 'true' : undefined"
              >
                {{ document.name }}
              </RouterLink>
              <p v-if="document.summary" class="detail-note">{{ document.summary }}</p>
              <p v-else-if="document.file" class="detail-note">{{ document.file }}</p>
            </CopyItem>
          </li>
        </ul>
        <div v-else class="detail-groups">
          <section v-for="group in stage.optionGroups" :key="group.id" class="detail-group">
            <CopyItem :copy-key="`group:${group.id}`" :text="groupCopyText(group)">
              <p class="copy-title">{{ group.label }}</p>
              <p class="detail-note">{{ group.help }}</p>
              <p class="detail-note">{{ groupFlags(group) }}</p>
            </CopyItem>
            <ul class="detail-list">
              <li v-for="option in group.options" :key="option.id">
                <CopyItem
                  :copy-key="`option:${group.id}:${option.id}`"
                  :text="optionCopyText(option.label, option.detail)"
                >
                  <p class="copy-title">{{ option.label }}</p>
                  <p class="detail-note">{{ option.detail }}</p>
                </CopyItem>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
