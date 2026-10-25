import { createRouter, createWebHashHistory } from 'vue-router'
import CheatsheetView from '@/views/CheatsheetView.vue'
import PromptBuilderView from '@/views/PromptBuilderView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'cheatsheet',
      component: CheatsheetView,
    },
    {
      path: '/stages/:stageId',
      name: 'stage',
      component: CheatsheetView,
    },
    {
      path: '/templates/:templateId',
      name: 'template',
      component: CheatsheetView,
    },
    {
      path: '/prompt/:stageId?',
      name: 'prompt',
      component: PromptBuilderView,
    },
  ],
})

export default router
