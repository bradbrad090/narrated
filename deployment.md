# Deployment Manual

## Overview
This manual provides step-by-step instructions for deploying the Narrated SaaS platform. Narrated transforms personal life stories into professionally written and printed autobiographies using conversation technology, with a React-based frontend, Supabase backend, and integrations for content generation.

Deployment involves:
- Pushing code to the main branch for automated frontend deployment.
- Managing backend components (database, authentication, and edge functions) via Supabase.
- Setting environment variables for secure integrations.
- Handling any infrastructure quirks to ensure smooth scaling.

The process assumes a cloud-based setup with automated scaling, using Vercel for frontend hosting (common for Vite-built React apps) and Supabase for backend services. No custom servers are required beyond these managed platforms.

**Note:** This is a one-time setup for initial deployment, with subsequent updates handled via Git pushes or CLI commands. Always test changes in a staging environment before deploying to production.

## Prerequisites

- **Git and GitHub Access**: Access to the project's GitHub repository (e.g., https://github.com/narrated/app). The repo contains the frontend code (React with TypeScript, Tailwind CSS, Vite) and Supabase configurations (e.g., migrations and edge functions).
- **Vercel Account**: Linked to the GitHub repo for CI/CD. Sign up at vercel.com if needed.
- **Supabase Account**: A Supabase project created at supabase.com. Note the project reference (e.g., your-project-ref.supabase.co).
- **Supabase CLI**: Installed globally via npm (`npm install -g supabase`). Used for local development and deploying edge functions/database changes.
- **API Keys**: Secure keys for content generation integrations (obtained from respective provider dashboards).
- **Node.js and npm**: Version 18+ for building the frontend.
- **Local Development Setup**: Clone the repo, run `npm install`, and use `supabase start` for local Supabase emulation.
- **Optional Tools**: A printing service API key if integrated for physical book delivery (not specified in core stack; assume a third-party like Printful or similar is configured separately).

## Repository and Branch

- **Repository URL**: https://github.com/narrated/app (private repo; request access via hello@aiautobiography.com if needed).
- **Deployment Branch**: main. All deployments are triggered from this branch. Feature branches should be merged via pull requests with reviews. Do not deploy from other branches to avoid inconsistencies.

## Environment Variables
Environment variables are crucial for security and configuration. Set them in the respective platforms to avoid hardcoding sensitive data.

### Frontend (Set in Vercel Dashboard > Project Settings > Environment Variables)
Use the `VITE_` prefix for Vite to expose them to the client-side code:

- `VITE_SUPABASE_URL`: The Supabase project URL (e.g., https://your-project-ref.supabase.co).
- `VITE_SUPABASE_ANON_KEY`: The anonymous public key from Supabase (for client-side auth and database access).
- `VITE_OPENAI_API_KEY`: API key for OpenAI integration (GPT-4 model for content generation).
- `VITE_XAI_API_KEY`: API key for xAI integration (for additional content generation).
- `VITE_APP_ENV`: Set to `production` for live builds (controls logging and error handling).
- `VITE_PRINT_SERVICE_API_KEY`: (Optional) Key for any printing/shipping integration if used.

### Backend (Set in Supabase Dashboard > Settings > API or via CLI for Edge Functions)

- `OPENAI_API_KEY`: Same as above, but server-side for edge functions.
- `XAI_API_KEY`: Same as above, server-side.
- `DATABASE_URL`: Automatically managed by Supabase; no need to set manually.
- `JWT_SECRET`: Supabase-generated secret for authentication; verify it's set in the dashboard.

**Security Note:** Never commit env vars to Git. Use `.env.local` for local development (ignored in `.gitignore`). Rotate keys periodically and monitor for leaks.

## Deployment Steps
Deployment is semi-automated with CI/CD. Follow these steps for initial setup or manual overrides.

### 1. Prepare the Code

- Pull the latest from main: `git pull origin main`.
- Install dependencies: `npm install`.
- Build locally to test: `npm run build` (uses Vite).
- Run tests: `npm test` (if unit/integration tests are set up).

### 2. Deploy Frontend to Vercel

- Connect the GitHub repo to Vercel if not already done (Vercel Dashboard > Add New > Import Git Repository).
- Push to main: `git push origin main`.
- Vercel automatically detects the Vite config, builds the app, and deploys it.
- **Custom Domain**: In Vercel, add `narrated.com` or `app.aiautobiography.com` under Domains. Update DNS records (A record to Vercel's IP or CNAME).
- **Build Command**: Defaults to `vite build`; override if needed.
- **Output Directory**: `dist`.
- **Time**: ~1-2 minutes per deploy.

### 3. Deploy Backend to Supabase
Supabase handles database, auth, and edge functions. No full "deployment" like traditional servers—it's configuration-based.

#### Database and Schema

- Local changes: Make schema updates in Supabase Studio or via SQL files.
- Generate migrations: `supabase db diff --file migrations/xxxx_description.sql`.
- Commit migrations to Git.
- Push changes: `supabase db push` (applies migrations to the remote database).
- Seed data: If needed, run seed scripts via `supabase db reset` locally, then push.

#### Edge Functions

- Navigate to the functions directory: `cd supabase/functions`.
- Deploy individual functions: `supabase functions deploy function-name` (e.g., for content generation or chat processing).
- Deploy all: Use a script if multiple functions exist.
- Secrets: Set via `supabase secrets set KEY=value` for function access to env vars.

#### Authentication

- Configured in Supabase Dashboard > Authentication. Enable providers (e.g., email) as needed. No deployment step required.

### 4. Integrate and Test

After deployment, test end-to-end:

- Onboard a test user via the frontend.
- Run a conversation session to verify content generation.
- Check database for stored chat histories and book metadata.

Monitor: Use Vercel Analytics and Supabase Observability for logs/errors.

### 5. Printing and Delivery (Post-Deployment)

- If integrated, configure webhooks or APIs for printing (e.g., via edge functions calling a service like Blurb or Lulu).
- Manual step: For physical books, export PDFs from the app and upload to a printer; automate via scripts if possible.

## Servers and Infrastructure

- **Frontend Server**: Vercel (serverless, auto-scaling). Domain: `narrated.vercel.app` (preview) or custom domain. No manual server management—Vercel handles hosting, CDN, and SSL.
- **Backend Server**: Supabase (managed PostgreSQL, auth, and edge functions). Endpoint: `https://your-project-ref.supabase.co`. Region: Set to closest to Perth (e.g., AWS ap-southeast-2 for Australia).

### Infrastructure Details:

- **Cloud Provider**: Vercel (built on AWS) and Supabase (also AWS-backed).
- **Scaling**: Automatic; Supabase scales database/functions based on usage, Vercel handles traffic spikes.
- **Backups**: Supabase auto-backups daily; enable point-in-time recovery if needed.

**No On-Prem Servers**: Everything is cloud-based to support automated scaling.

## Troubleshooting and Quirks ("Where the Bodies Are Buried")

### Common Issues:

- **Env Var Mismatches**: If API calls fail, double-check keys in Vercel/Supabase. Test with `console.log` in dev mode (remove before prod).
- **Supabase Connection Limits**: Free tier has limits; upgrade to Pro for production traffic.
- **Build Failures**: Vite may fail on large assets—optimize images/PDFs.
- **Rate Limits**: OpenAI/xAI APIs have quotas; monitor usage and implement retries in code.
- **Timezone Issues**: Perth is UTC+8; set Supabase database timezone to Australia/Perth via SQL: `ALTER DATABASE your_db SET timezone TO 'Australia/Perth';`.

### Hidden Gotchas:

- **Edge Functions Cold Starts**: First invocation may be slow; use keep-alive if critical.
- **CORS**: Ensure Supabase CORS settings allow your frontend domain.
- **Migrations Conflicts**: Always diff against the remote db to avoid overwriting production data.
- **Cost Overruns**: Monitor Supabase usage (e.g., function invocations) and Vercel bandwidth.

**Rollback**: Vercel supports rollbacks via dashboard. For Supabase, use migrations to revert schema changes.

**Contact for Help**: Email hello@aiautobiography.com or check repo issues for deployment logs.

---

This manual was last updated on August 02, 2025. Review and update as the stack evolves.