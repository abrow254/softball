import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { AT_BAT_CODES, type AtBatCode } from './codes'
import type { ExtractedAtBat, ExtractedCard, ExtractedPlayer } from './scorecard'

// SERVER ONLY. The Anthropic call to read a scorecard photo into structured
// JSON. The API key lives in ANTHROPIC_API_KEY and never reaches the client.
// Result shapes (ExtractedCard etc.) live in lib/scorecard.ts so client code
// can import them without pulling in this server-only module.
export type { ExtractedAtBat, ExtractedCard, ExtractedPlayer } from './scorecard'

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

// Force the model's output into our exact shape via tool use. Tool input schemas
// are tolerant of nullable/optional fields, which suits messy handwriting.
const recordScorecardTool: Anthropic.Tool = {
  name: 'record_scorecard',
  description: 'Record the structured contents of the softball scorecard photo.',
  input_schema: {
    type: 'object',
    properties: {
      game: {
        type: 'object',
        properties: {
          opponent: { type: ['string', 'null'], description: 'Opponent team name if written on the card' },
          our_runs: { type: ['integer', 'null'], description: 'Our final run total if written' },
          opp_runs: { type: ['integer', 'null'], description: 'Opponent final run total if written' },
        },
      },
      players: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Player name as written in the row' },
            batting_order: { type: ['integer', 'null'], description: 'Row number / batting order position' },
            starting_pos: { type: ['string', 'null'], description: 'Fielding position if written (e.g. SS, RF)' },
            at_bats: {
              type: 'array',
              description: 'One entry per non-blank inning cell, left to right',
              items: {
                type: 'object',
                properties: {
                  inning: { type: ['integer', 'null'], description: 'Inning column 1-7' },
                  code: { type: 'string', enum: [...AT_BAT_CODES] },
                },
                required: ['code'],
              },
            },
          },
          required: ['name', 'at_bats'],
        },
      },
    },
    required: ['game', 'players'],
  },
}

const SYSTEM_PROMPT = `You read a single handwritten slo-pitch softball scorecard photo and transcribe it.

Card layout: one row per player. Across the top are innings 1 through 7. A cell may hold ONE or MORE codes (e.g., "H1 H2" if the player batted twice), or be blank.

The ONLY valid codes are:
  H1 = single, H2 = double, H3 = triple, H4 = home run,
  FC = fielder's choice, FO = fly out, PO = pop out, GO = ground out, K = strikeout.

Rules:
- Read every player row top to bottom. Use the row order as batting_order.
- For each player, extract EVERY code from every NON-BLANK inning cell, left to right.
  If a cell contains multiple codes (e.g., "H1 H2"), create one at_bat entry PER CODE with the SAME inning number.
- Map every code to the closest valid code. Watch the easily-confused pairs: FO / PO / GO, and H1 / H4.
- If a code is genuinely unreadable, make your best single guess from the nine codes — a human reviews everything before it is saved.
- Capture opponent and final score only if they are clearly written; otherwise null.
- Do not invent players or at-bats. Call the record_scorecard tool exactly once.`

export async function extractScorecard(
  imageBase64: string,
  mediaType: AllowedImageType,
): Promise<ExtractedCard> {
  const client = new Anthropic() // reads ANTHROPIC_API_KEY from the environment

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [recordScorecardTool],
    tool_choice: { type: 'tool', name: 'record_scorecard' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'Transcribe this scorecard using the record_scorecard tool.' },
        ],
      },
    ],
  })

  const toolUse = message.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!toolUse) {
    throw new Error('The model did not return structured scorecard data. Try a clearer photo.')
  }

  return normalizeExtraction(toolUse.input)
}

// Defensive normalization — drop any at-bat whose code isn't in the vocabulary,
// coerce types, and guarantee the shape the review grid expects.
function normalizeExtraction(raw: unknown): ExtractedCard {
  const obj = (raw ?? {}) as Record<string, unknown>
  const game = (obj.game ?? {}) as Record<string, unknown>
  const playersRaw = Array.isArray(obj.players) ? obj.players : []

  const players: ExtractedPlayer[] = playersRaw.map((p) => {
    const pr = (p ?? {}) as Record<string, unknown>
    const atBatsRaw = Array.isArray(pr.at_bats) ? pr.at_bats : []
    const at_bats: ExtractedAtBat[] = atBatsRaw
      .map((ab) => {
        const abr = (ab ?? {}) as Record<string, unknown>
        return {
          inning: typeof abr.inning === 'number' ? abr.inning : null,
          code: abr.code as AtBatCode,
        }
      })
      .filter((ab) => (AT_BAT_CODES as readonly string[]).includes(ab.code))

    return {
      name: typeof pr.name === 'string' ? pr.name : '',
      batting_order: typeof pr.batting_order === 'number' ? pr.batting_order : null,
      starting_pos: typeof pr.starting_pos === 'string' ? pr.starting_pos : null,
      at_bats,
    }
  })

  return {
    game: {
      opponent: typeof game.opponent === 'string' ? game.opponent : null,
      our_runs: typeof game.our_runs === 'number' ? game.our_runs : null,
      opp_runs: typeof game.opp_runs === 'number' ? game.opp_runs : null,
    },
    players,
  }
}
