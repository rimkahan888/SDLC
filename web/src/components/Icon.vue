<script setup lang="ts">
defineProps<{
  name:
    | 'cheatsheet'
    | 'prompt'
    | 'copy'
    | 'download'
    | 'share'
    | 'reset'
    | 'help'
    | 'panel'
    | 'check'
    | 'back'
    | 'next'
    | 'loop'
}>()
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'cheatsheet'">
      <path d="M8 7h11M8 12h11M8 17h11" />
      <path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" />
    </template>
    <template v-else-if="name === 'prompt'">
      <path d="M7 4.5h7.5L19 9v10.5H7z" />
      <path d="M14.5 4.5V9H19" />
      <path d="M9.5 13h5M9.5 16h3.5" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8" y="8" width="10" height="12" rx="1.5" />
      <path d="M6 15.5V6.5A1.5 1.5 0 0 1 7.5 5H15" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 5v10" />
      <path d="M8 11.5 12 15.5 16 11.5" />
      <path d="M6 19h12" />
    </template>
    <template v-else-if="name === 'share'">
      <path d="M10 13.5 14 10.5" />
      <path d="M14 13.5 10 10.5" />
      <circle cx="7" cy="12" r="2.2" />
      <circle cx="17" cy="8" r="2.2" />
      <circle cx="17" cy="16" r="2.2" />
    </template>
    <template v-else-if="name === 'reset'">
      <path d="M19 12a7 7 0 1 1-2-4.9" />
      <path d="M19 5v4.5h-4.5" />
    </template>
    <template v-else-if="name === 'help'">
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.7.3-1.3.9-1.3 1.6V14" />
      <path d="M12 17h.01" />
    </template>
    <template v-else-if="name === 'panel'">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M13 5v14" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M6 12.5 10 16.5 18 8" />
    </template>
    <template v-else-if="name === 'back'">
      <path d="M14.5 6.5 9 12l5.5 5.5" />
    </template>
    <template v-else-if="name === 'loop'">
      <path d="M16.5 8.5a5 5 0 1 0 1.2 3.2" />
      <path d="M16.2 4.8v4.2h-4" />
    </template>
    <template v-else>
      <path d="M9.5 6.5 15 12l-5.5 5.5" />
    </template>
  </svg>
</template>
