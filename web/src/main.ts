import { createApp } from 'vue'
import { loadContent } from './content/catalog'
import App from './App.vue'
import router from './router'
import './styles.css'

type PendingKey = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  repeat: boolean
}

// The document load event fires while this module is still fetching content.
// Keys pressed in that gap are replayed once the shortcut listener is mounted.
const pendingKeys: PendingKey[] = []

function rememberKey(event: KeyboardEvent): void {
  pendingKeys.push({
    key: event.key,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    repeat: event.repeat,
  })
}

window.addEventListener('keydown', rememberKey)

await loadContent().catch(() => {
  // The page alert and the toast already name the failure.
})

window.removeEventListener('keydown', rememberKey)

const app = createApp(App)
app.use(router)
app.mount('#app')
await router.isReady()

for (const pending of pendingKeys) {
  window.dispatchEvent(new KeyboardEvent('keydown', { ...pending, bubbles: true, cancelable: true }))
}
