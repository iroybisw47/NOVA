export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
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
