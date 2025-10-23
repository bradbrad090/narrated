# Deployment Manual

## Overview
This manual provides step-by-step instructions for deploying the Narrated SaaS platform. Narrated transforms personal life stories into professionally written and printed autobiographies using conversation technology, with a React-based frontend, Supabase backend, and integrations for content generation.

## Current Deployment Platform: Lovable + Supabase

**Frontend**: Lovable (not Vercel)  
**Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)

Deployment involves:
- Clicking "Publish" in Lovable for automated frontend deployment
- Managing backend components (database, authentication, and edge functions) via Supabase
- Setting environment variables for secure integrations
- No custom servers required - fully managed platforms

**Note:** This is a one-time setup for initial deployment, with subsequent updates handled via Git pushes or CLI commands. Always test changes in a staging environment before deploying to production.

## Prerequisites

- **Lovable Account**: Access to the Lovable project for frontend deployment
- **Supabase Account**: A Supabase project created at supabase.com. Note the project reference (e.g., your-project-ref.supabase.co)
- **Supabase CLI**: Installed globally via npm (`npm install -g supabase`). Used for local development and deploying edge functions/database changes
- **API Keys**: 
  - OpenAI API key for AI conversations
  - Stripe keys for payment processing
  - Resend API key for email delivery
- **Node.js and npm**: Version 18+ for local development
- **Local Development Setup**: Clone the repo, run `npm install`, and use `supabase start` for local Supabase emulation

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

### 2. Deploy Frontend via Lovable

**Deployment Process:**
1. Open your project in Lovable
2. Click the "Publish" button in the top right
3. Lovable automatically builds and deploys your frontend
4. Deployment typically completes in ~1-2 minutes

**Custom Domain Setup:**
1. In Lovable: Project Settings > Domains
2. Add your custom domain (e.g., `app.narrated.com.au`)
3. Follow DNS configuration instructions provided by Lovable
4. Requires paid Lovable plan for custom domains

**No manual build commands needed** - Lovable handles the entire build and deployment process.

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

### Frontend: Lovable
- **Hosting**: Lovable managed hosting (serverless, auto-scaling)
- **CDN**: Automatic global CDN distribution
- **SSL**: Automatic HTTPS certificates
- **Domain**: `[project-name].lovable.app` (default) or custom domain (paid plans)
- **No manual server management**: Lovable handles everything

### Backend: Supabase
- **Database**: Managed PostgreSQL
- **Auth**: Supabase Auth service
- **Edge Functions**: Deno runtime for serverless functions
- **Storage**: Supabase Storage for photos and files
- **Endpoint**: `https://your-project-ref.supabase.co`
- **Region**: Set to AWS ap-southeast-2 (Sydney) for Australia

### Infrastructure Details:
- **Cloud Provider**: Lovable + Supabase (both AWS-backed)
- **Scaling**: Fully automatic based on usage
- **Backups**: Supabase auto-backups daily; enable point-in-time recovery for production
- **Cost**: Usage-based pricing; monitor Lovable and Supabase dashboards

**No On-Prem Servers**: Everything is cloud-based for automatic scaling.

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

**Rollback**: 
- Lovable: Use version history to revert to previous deployments
- Supabase: Use migrations to revert schema changes (`supabase db reset`)

**Contact for Help**: Email hello@aiautobiography.com or check repo issues for deployment logs.

---

This manual was last updated on August 02, 2025. Review and update as the stack evolves.