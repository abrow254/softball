# Team photos

Drop team photos in this folder (JPG/PNG/WebP), then list their paths in
`TEAM_PHOTOS` at the top of `app/page.tsx`, e.g.:

```ts
const TEAM_PHOTOS: string[] = [
  '/team/team-1.jpg',
  '/team/team-2.jpg',
  '/team/team-3.jpg',
]
```

The dashboard hero rotates through them with a slow crossfade. With none
listed, the hero shows a styled grass-gradient fallback.

Tips: landscape orientation works best (the hero is wide and short); aim for
~1600px wide for crisp display without bloating page weight.
