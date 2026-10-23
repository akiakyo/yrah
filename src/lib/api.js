// talks to the python backend in /server (proxied by vite in dev)
const BASE = import.meta.env.VITE_API_URL || '/api'

// vercel functions reject request bodies over 4.5mb
const MAX_UPLOAD = 4.4 * 1024 * 1024

async function post(path, file) {
  if (file.size > MAX_UPLOAD) {
    throw new Error(`that file is ${(file.size / 1024 / 1024).toFixed(1)}mb, the limit is 4mb`)
  }
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
    if (res.status === 413) throw new Error('that file is too big, the limit is 4mb')
    if (res.status === 504) throw new Error('that took too long, try a smaller file')
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
