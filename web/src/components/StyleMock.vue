<script setup lang="ts">
import { computed } from 'vue'
import { mockCssVariables } from '@/domain/styleTokens'
import type { StyleTokens } from '@/domain/types'

const props = defineProps<{
  name: string
  tokens: StyleTokens
  large?: boolean
}>()

const skin = computed(() => mockCssVariables(props.tokens))
</script>

<template>
  <!-- The action is a span so the card can be the only button. Nested buttons are invalid HTML. -->
  <article class="mock" :class="{ large }" :style="skin">
    <div class="mock-card">
      <p class="mock-kicker">{{ name }}</p>
      <h3>The quick look</h3>
      <p class="mock-body">A sentence of body text.</p>
      <span class="mock-action">Action</span>
    </div>
  </article>
</template>
