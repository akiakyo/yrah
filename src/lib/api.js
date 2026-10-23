// talks to the python backend in /server (proxied by vite in dev)
const BASE = import.meta.env.VITE_API_URL || '/api'

async function post(path, file) {
  const body = new FormData()
  body.append('file', file)
  let res
  try {
    res = await fetch(BASE + path, { method: 'POST', body })
  } catch {
    throw new Error('backend is offline. run the python server first.')
  }
  if (!res.ok) {
    const msg = await res.json().catch(() => null)
    throw new Error(msg?.detail || 'something went wrong')
  }
  return res
}

export async function convertFile(path, file) {
  const res = await post(path, file)
  const blob = await res.blob()
  const name = res.headers.get('x-filename') || 'converted'
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return name
}

export async function pptxToText(file) {
  const res = await post('/pptx/text', file)
  return (await res.json()).text
}
