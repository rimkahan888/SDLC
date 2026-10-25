<script setup lang="ts">
import { stages } from '@/stages'
</script>

<template>
  <div class="page">
    <header class="header">
      <p class="name">SDLC</p>
    </header>
    <main>
      <h1>SDLC</h1>
      <section class="card">
        <p>Six stages, read from the content files.</p>
        <p>The cheatsheet and the prompt builder come in later changes.</p>
        <ol class="stages">
          <li v-for="stage in stages" :key="stage.id">
            <span class="stage-name">{{ stage.name }}</span>
            <span class="stage-line">{{ stage.oneLiner }}</span>
          </li>
        </ol>
      </section>
    </main>
  </div>
</template>
