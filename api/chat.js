// Simple in-memory rate limiter (per serverless instance)
const rateMap = new Map()
const RATE_LIMIT = 20      // max requests per window
const WINDOW_MS = 60 * 1000 // 1 minute window

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now - entry.start > WINDOW_MS) {
    rateMap.set(ip, { start: now, count: 1 })
    return false
  }

  entry.count++
  if (entry.count > RATE_LIMIT) return true
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: { message: 'Too many requests. Please wait a minute.' } })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Server misconfigured: missing ANTHROPIC_API_KEY' } })
  }

  const { system, messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Missing or invalid messages array' } })
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: system || '',
        messages,
      }),
    })

    const data = await anthropicRes.json()
    return res.status(anthropicRes.status).json(data)
  } catch (err) {
    console.error('Anthropic proxy error:', err)
    return res.status(500).json({
      error: { message: 'Failed to reach Anthropic API' },
    })
  }
}
