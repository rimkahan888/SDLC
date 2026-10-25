<script setup lang="ts">
import { contentState, loadContent } from '@/content/catalog'

void loadContent().catch(() => {
  // The page alert and the toast already name the failure.
})
</script>

<template>
  <main class="cheatsheet">
    <h1>SDLC</h1>
    <section class="card">
      <p>Six stages, read from the content files.</p>
      <p>Open Prompt to walk the six stages and copy a prompt.</p>
      <p v-if="!contentState.ready && !contentState.error" class="stage-line">Loading content.</p>
      <ol class="stages">
        <li v-for="stage in contentState.stages" :key="stage.id">
          <span class="stage-name">{{ stage.name }}</span>
          <span class="stage-line">{{ stage.oneLiner }}</span>
        </li>
      </ol>
    </section>
  </main>
</template>
