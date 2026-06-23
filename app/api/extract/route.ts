import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { extractScorecard, ALLOWED_IMAGE_TYPES, type AllowedImageType } from '@/lib/extraction'

// Node runtime (Anthropic SDK + Buffer), never statically optimized.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  // Admin-gated: only admins can spend on extraction. RLS still gates the commit.
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Photo intake is not configured (missing ANTHROPIC_API_KEY).' },
      { status: 503 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected a multipart form upload.' }, { status: 400 })
  }

  const file = form.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image uploaded.' }, { status: 400 })
  }

  const mediaType = file.type
  if (!ALLOWED_IMAGE_TYPES.includes(mediaType as AllowedImageType)) {
    return NextResponse.json(
      {
        error: `Unsupported image type "${mediaType || 'unknown'}". Use JPEG, PNG, WebP, or GIF — iPhone HEIC isn't supported, share or export as JPEG first.`,
      },
      { status: 415 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 10 MB.' }, { status: 413 })
  }

  try {
    const card = await extractScorecard(buffer.toString('base64'), mediaType as AllowedImageType)
    return NextResponse.json(card)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
