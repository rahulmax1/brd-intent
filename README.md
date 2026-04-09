# BRD Intent

AI-powered intent model platform for structuring project requirements. Upload documents, generate structured intent models (actors, entities, journeys, business rules), review collaboratively, and export artifacts.

Built with Next.js, React, TypeScript, TailwindCSS, and ShadCN. AI powered by Claude via AWS Bedrock.

## Features

- **AI draft generation** — upload documents, AI extracts a structured intent model
- **Consensus review** — section-by-section review with approve/dispute tracking
- **AI-powered editing** — describe changes in plain language, see diffs, approve/reject
- **Version history** — full diff tracking between model versions
- **Artifact export** — auto-generated BRD, TypeScript types, Zod schemas, API stubs, migrations
- **3D explorer** — interactive visualizations (force graph, lifecycle, actor layers)

## Getting started

```bash
pnpm install
pnpm dev        # starts on http://localhost:4444
```

## Environment variables

- `AWS_REGION` / `AWS_DEFAULT_REGION` — Bedrock region (default: ap-southeast-2)
- `AWS_BEARER_TOKEN_BEDROCK` — Anthropic Bedrock API key
- `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` — Neon Postgres connection

## Deployment

Deployed on Vercel with Neon Postgres.

```bash
vercel deploy --prod
```

## License

ISC
