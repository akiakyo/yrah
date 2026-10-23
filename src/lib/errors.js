// turns low level errors into something a student can act on
export function friendlyError(err) {
  const msg = String(err?.message || err || '')
  if (/dynamically imported module|importing a module script failed|error loading dynamically|chunk/i.test(msg)) {
    return 'yrah just updated. refresh the page and try again'
  }
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return "you're offline or the connection dropped. try again"
  return msg || 'something went wrong'
}
