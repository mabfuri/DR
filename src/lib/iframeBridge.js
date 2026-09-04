const DASHBOARD_ORIGIN = 'https://iframe-c8r.pages.dev'
let pendingRunUnlock = false
let observerStarted = false

function isDashboardMessage(event) {
  if (event.origin !== DASHBOARD_ORIGIN) {
    console.log('[DR] message rejected: origin', event.origin)
    return false
  }
  if (event.source !== window.parent) {
    console.log('[DR] message rejected: source is not window.parent')
    return false
  }
  return true
}

function findUnlockButton() {
  return document.querySelector('button.unlock:not([disabled])')
}

function replayRunUnlock() {
  if (!pendingRunUnlock) return false
  const button = findUnlockButton()
  if (!button) return false

  pendingRunUnlock = false
  console.log('[DR] unlock handler started')
  console.log('[DR] replaying RUN_UNLOCK through the existing Unlock button')
  button.click()
  return true
}

function startObserver() {
  if (observerStarted) return
  observerStarted = true
  const observer = new MutationObserver(() => {
    if (replayRunUnlock()) observer.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
  setTimeout(() => {
    if (replayRunUnlock()) observer.disconnect()
  }, 0)
}

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'RUN_UNLOCK') return
  if (!isDashboardMessage(event)) return

  console.log('[DR] RUN_UNLOCK received')

  // If the Dashboard React component is already mounted, its own message
  // handler is authoritative. Only queue/replay when the app has not mounted
  // yet, which closes the iframe-load/auth/profile timing gap.
  const dashboardMounted = Boolean(document.querySelector('.dashboard'))
  if (dashboardMounted) {
    console.log('[DR] RUN_UNLOCK delegated to Dashboard handler')
    return
  }

  pendingRunUnlock = true
  startObserver()
  replayRunUnlock()
})

console.log('[DR] iframe bridge installed')
