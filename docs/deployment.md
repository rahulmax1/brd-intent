# Deployment Guide

How to deploy Adapt Canvas to Vercel for production use.

---

## Prerequisites

- Vercel account
- GitHub repository with Adapt Canvas code
- OpenAI API key
- Vercel KV database (for production persistence)

---

## Step 1: Create GitHub Repository

```bash
cd /Users/rahul/DBiz/adapt-canvas

# Add GitHub remote (replace with your repo URL)
git remote add origin git@github.com:your-org/adapt-canvas.git

# Push code
git branch -M main
git push -u origin main
```

---

## Step 2: Create Vercel KV Database

1. Go to https://vercel.com/dashboard
2. Navigate to Storage
3. Create → KV Database
4. Name it `adapt-canvas-kv`
5. Note the credentials (you'll add these as environment variables)

---

## Step 3: Deploy to Vercel

### Option A: Vercel CLI

```bash
cd /Users/rahul/DBiz/adapt-canvas

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel --scope db-iz
```

During setup:
- Set up and deploy? **Yes**
- Which scope? **db-iz**
- Link to existing project? **No**
- Project name? **adapt-canvas**
- Directory? **./***
- Override settings? **No**

### Option B: Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - Project name: `adapt-canvas`
   - Framework: Next.js
   - Root directory: `./`
   - Build command: `pnpm build`
   - Output directory: `.next`
4. Click Deploy

---

## Step 4: Configure Environment Variables

In Vercel dashboard → Project Settings → Environment Variables:

Add these variables:

```
OPENAI_API_KEY=sk-...your-key...
KV_REST_API_URL=https://...your-kv-url...
KV_REST_API_TOKEN=...your-kv-token...
```

**Where to find KV credentials:**
- Vercel dashboard → Storage → Your KV database → .env.local tab

**For all environments:**
- Check: Production, Preview, Development

---

## Step 5: Trigger Redeploy

After adding environment variables:

```bash
vercel --prod --scope db-iz
```

Or via dashboard: Deployments → ••• menu → Redeploy

---

## Step 6: Verify Deployment

1. Visit your deployment URL (shown after deploy)
2. Check all pages load
3. Test AI chat panel (requires OPENAI_API_KEY)
4. Make a test edit and verify it persists (requires KV)

---

## Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel KV database created
- [ ] Project deployed to Vercel
- [ ] Environment variables configured
- [ ] Deployment verified working
- [ ] AI editing tested
- [ ] Model persistence tested

---

## Troubleshooting

### Build fails with TypeScript errors

Check that you ran these before deploying:
```bash
pnpm generate:ai-types
pnpm generate:schemas
pnpm build
```

### AI chat not working

- Verify `OPENAI_API_KEY` is set in environment variables
- Check API key is valid
- Check Vercel logs for API errors

### Model changes not persisting

- Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
- Check KV database is accessible
- View Vercel logs for connection errors

### Page not found errors

- Verify build completed successfully
- Check Vercel logs for routing issues
- Ensure `.next` directory generated correctly

---

## Production Best Practices

### Security

- Rotate OpenAI API key periodically
- Limit API key permissions to minimum required
- Enable Vercel password protection if needed
- Use Vercel Teams for access control

### Performance

- Enable Vercel Analytics
- Monitor API usage (OpenAI costs)
- Set up alerts for errors

### Backup

- Regular git commits
- Periodic model snapshots (`pnpm intent:snapshot`)
- Export models for offline backup (`pnpm export:contract`)

---

## Updating Deployed App

```bash
# Make changes locally
git add .
git commit -m "your changes"
git push origin main
```

Vercel auto-deploys on push to main.

---

## Custom Domain

In Vercel dashboard → Project Settings → Domains:

1. Add domain
2. Configure DNS (follow Vercel instructions)
3. Wait for DNS propagation
4. SSL automatically provisioned

---

## Next Steps

- [Getting Started](getting-started.md) — Using the deployed app
- [Workflows](workflows.md) — Team collaboration
- [Scripts Reference](scripts-reference.md) — Maintenance tasks
```
