import { createRouter, createWebHashHistory } from 'vue-router'
import PlaceholderView from '@/views/PlaceholderView.vue'
import PromptBuilderView from '@/views/PromptBuilderView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'cheatsheet',
      component: PlaceholderView,
    },
    {
      path: '/prompt/:stageId?',
      name: 'prompt',
      component: PromptBuilderView,
    },
  ],
})

export default router
