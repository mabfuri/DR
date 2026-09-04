const RELEVANT_MESSAGE_TYPES = new Set([
  'RUN_UNLOCK',
  'NEXT_OFFER',
  'STOP_AUTORUN'
])

if (!Array.isArray(window.__DR_PENDING_PARENT_MESSAGES)) {
  window.__DR_PENDING_PARENT_MESSAGES = []
}

if (typeof window.__DR_DASHBOARD_MESSAGE_HANDLER_READY !== 'boolean') {
  window.__DR_DASHBOARD_MESSAGE_HANDLER_READY = false
}

function isParentMessage(event) {
  if (event.source !== window.parent) {
    if (RELEVANT_MESSAGE_TYPES.has(event.data?.type)) {
      console.warn('[DR] parent message rejected: source is not window.parent', event.data?.type)
    }
    return false
  }
  return true
}

window.addEventListener('message', (event) => {
  const type = event.data?.type
  if (!RELEVANT_MESSAGE_TYPES.has(type)) return
  if (!isParentMessage(event)) return

  if (window.__DR_DASHBOARD_MESSAGE_HANDLER_READY) {
    return
  }

  window.__DR_PENDING_PARENT_MESSAGES.push({
    data: event.data,
    origin: event.origin || '*'
  })
  console.log('[DR] parent message queued before Dashboard handler:', type)
})

console.log('[DR] iframe bridge installed')