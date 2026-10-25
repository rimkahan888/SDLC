<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { toggleHelp } from '@/feedback'

const route = useRoute()
const onPrompt = computed(() => route.path.startsWith('/prompt'))
const onCheatsheet = computed(() => !onPrompt.value)
</script>

<template>
  <header class="header">
    <p class="name">SDLC</p>
    <nav class="nav" aria-label="Views">
      <RouterLink to="/" custom v-slot="{ href, navigate }">
        <a :href="href" :aria-current="onCheatsheet ? 'page' : undefined" @click="navigate">
          <Icon name="cheatsheet" />
          <span>Cheatsheet</span>
        </a>
      </RouterLink>
      <RouterLink :to="{ name: 'prompt', params: { stageId: 'plan' } }" custom v-slot="{ href, navigate }">
        <a :href="href" :aria-current="onPrompt ? 'page' : undefined" @click="navigate">
          <Icon name="prompt" />
          <span>Prompt</span>
        </a>
      </RouterLink>
    </nav>
    <button type="button" class="icon-button" aria-label="Keyboard shortcuts" @click="toggleHelp">
      <Icon name="help" />
    </button>
  </header>
</template>
