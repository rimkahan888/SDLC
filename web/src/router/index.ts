import { createRouter, createWebHashHistory } from 'vue-router'
import PlaceholderView from '@/views/PlaceholderView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'placeholder',
      component: PlaceholderView,
    },
  ],
})

export default router
