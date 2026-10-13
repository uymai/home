# uymai.net

Source for [uymai.net](https://uymai.net): a personal link hub plus a drawer of
"finaglings" — small experiments, explainers, and mini-apps (darts scorers, a
guitar scale viewer, sorting-algorithm animations, and more).

Built with Next.js (App Router), React, TypeScript, and Tailwind CSS v4.
Deployed on Vercel.

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:3000
npm test           # Vitest
npm run lint       # ESLint
npm run build      # tests + production build
```

The Steam page needs `STEAM_API_KEY` and `STEAM_USER_ID` set in the environment
(e.g. `.env.local`).

See [CLAUDE.md](CLAUDE.md) for a map of the codebase.

## License

[MIT](LICENSE)
