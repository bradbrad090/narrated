# Narrated - AI-Powered Autobiography Platform

Narrated is a comprehensive autobiography creation platform that helps users transform their memories into beautifully crafted books through AI-assisted conversations.

> 📘 **For detailed system information**, see [CURRENT_STATE.md](./CURRENT_STATE.md)

## Features

### Core Functionality
- **AI-Powered Conversations**: Intelligent interview system that guides users through documenting their life story
- **Multiple Books**: Users can create and manage multiple autobiography projects
- **Chapter Management**: Organize stories into chapters with rich content editing
- **Photo Integration**: Upload and organize photos within chapters
- **Professional Editing**: AI-assisted content generation and editing

### Tier System
- **Free Tier**: One free chapter to try the platform
- **Basic ($29.99)**: Unlimited chapters, 10 recipes, 50 photos, digital PDF
- **Standard ($49.99)**: All Basic features plus printed book delivery
- **Premium ($99.99)**: All Standard features plus unlimited recipes/photos and 5 copies

### Gift Feature 🎁
Purchase autobiography packages as gifts for loved ones:

#### How It Works
1. **Purchase**: Visit `/gift` to select a tier and fill in recipient/purchaser details
2. **Payment**: Complete Stripe checkout with secure payment processing
3. **Code Generation**: Unique gift code (format: XXXX-XXXX-XXXX) is generated
4. **Email Delivery**: 
   - Recipient receives email with gift code and instructions
   - Purchaser receives confirmation with code details
5. **Redemption**: Recipient redeems code at `/redeem-gift` to unlock features
6. **Activation**: Book tier is upgraded immediately upon redemption

#### Gift Code Features
- Valid for 1 year from purchase date
- Can be applied to new or existing books
- One-time use only (except test codes)
- Secure validation and tracking
- Personal message support

#### Test Codes (Development Only)
For rapid development testing without Stripe:
- `TEST-BSIC-0001` - Basic tier test code
- `TEST-STND-0001` - Standard tier test code
- `TEST-PREM-0001` - Premium tier test code

Test codes can be reused, skip payment validation, and are valid for 10 years.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **React Helmet** for SEO
- **Zod** for form validation

### Backend
- **Supabase** for:
  - PostgreSQL database
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Edge Functions (Deno)
  - Storage for photos and PDFs

### Payment Processing
- **Stripe** for:
  - Checkout Sessions
  - Payment Intents
  - Webhook handling
  - Secure payment processing

### AI Integration
- **OpenAI API** for conversation and content generation
- **Custom prompts** for autobiography-specific content

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Supabase account and project
- Stripe account
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Stripe (for local testing)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Edge Function Secrets

Configure these in Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Database Schema

### Key Tables

#### `books`
- Stores user's autobiography projects
- Fields: `tier`, `title`, `user_id`, `status`, `purchase_status`, `usage_metrics`

#### `chapters`
- Individual chapters within books
- Fields: `book_id`, `title`, `content`, `summary`, `is_submitted`, `chapter_number`, `status`, `pdf_url`

#### `gift_codes`
- Gift purchase and redemption tracking
- Fields: `code`, `tier`, `recipient_email`, `purchaser_email`, `redeemed`, `redeemed_by`, `expires_at`, `stripe_payment_status`, `is_test_code`
- Test codes (`is_test_code = true`) can be reused for development testing

#### `orders`
- Transaction records for purchases
- Fields: `user_id`, `book_id`, `total_price`, `status`, `is_gift_redemption`, `gift_code_id`

#### `book_profiles`
- Comprehensive user biographical data
- Fields: Question responses (1-10), timestamps

#### `chat_histories`
- Complete conversation records
- Fields: `user_id`, `chapter_id`, `session_id`, `messages`, `context_snapshot`, `conversation_type`, `conversation_medium`

#### `conversation_context_cache`
- Performance optimization cache
- Fields: `user_id`, `book_id`, `chapter_id`, `context_data`, `expires_at`

#### `chapter_photos`
- Photo storage references
- Fields: `chapter_id`, `book_id`, `storage_path`, `file_name`, `file_size`

### Security

All tables have Row Level Security (RLS) enabled:
- Users can only access their own data
- Service role required for cross-user operations (webhooks, redemptions)
- Gift codes validated for ownership and status

## Stripe Integration

### Webhook Events

The application handles these Stripe webhook events:

#### `checkout.session.completed`
- Triggered when payment is successful
- Updates `gift_codes` table with payment status
- Sends confirmation emails
- Creates order records

#### `payment_intent.payment_failed`
- Marks gift codes as failed
- Logs error for troubleshooting

### Webhook Setup

1. **Development**:
   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```

2. **Production**:
   - Add webhook endpoint in Stripe Dashboard
   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`
   - Copy webhook secret to Supabase secrets

### Test Cards

Use Stripe test cards for development:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 9995`

## Edge Functions

### Key Functions

#### `create-gift-payment`
- Creates Stripe checkout session for gift purchase
- Generates unique gift code
- Stores gift data in database
- **Auth**: Not required (public)

#### `redeem-gift-code`
- Validates and redeems gift codes
- Updates book tier or creates new book
- Creates order record
- Sends confirmation email
- Supports test codes for development (reusable, no payment validation)
- **Auth**: Required (JWT)

#### `openai-conversation`
- Handles text-based conversations
- Processes conversation history
- Integrates with user/book profiles
- **Auth**: Required (JWT)

#### `ai-conversation-realtime`
- Real-time voice conversation sessions
- WebSocket support
- **Auth**: Required (JWT)

#### `voice-to-text`
- Transcribes audio using OpenAI Whisper
- **Auth**: Required (JWT)

#### `generate-chapter`
- Converts conversations to chapter content
- **Auth**: Required (JWT)

#### `generate-summary`
- Generates chapter summaries
- **Auth**: Required (JWT)

#### `conversation-context-builder`
- Builds AI conversation context
- **Auth**: Required (JWT)

#### `analytics-tracker`
- Tracks user engagement metrics
- **Auth**: Not required (public)

#### `stripe-webhook`
- Handles Stripe payment events
- Updates payment status
- Triggers email notifications
- **Auth**: Verified via Stripe signature

#### `send-chapter-email`
- Sends various email types via Resend
- Supports gift purchase/redemption emails
- **Auth**: Service role only

## Email Configuration

### Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Verify your sending domain
3. Create API key
4. Add `RESEND_API_KEY` to Supabase secrets

### Email Types

- `gift_purchase_confirmation`: Sent to purchaser after payment
- `gift_recipient_notification`: Sent to recipient with code
- `gift_redemption_confirmation`: Sent after successful redemption

## Testing

See [GIFT_TESTING_GUIDE.md](./GIFT_TESTING_GUIDE.md) for comprehensive testing procedures.

### Quick Test with Test Codes

For rapid testing without Stripe payment:
1. Log in to your account
2. Navigate to `/redeem-gift`
3. Enter one of the test codes:
   - `TEST-BSIC-0001` for Basic tier
   - `TEST-STND-0001` for Standard tier
   - `TEST-PREM-0001` for Premium tier
4. Verify book tier upgrade

### Full Test Checklist

- [ ] Gift purchase flow completes
- [ ] Stripe checkout redirects properly
- [ ] Payment webhook updates database
- [ ] Emails are delivered
- [ ] Gift code redemption works (both regular and test codes)
- [ ] Book tier updates correctly
- [ ] Edge cases handled (expired, used codes)
- [ ] Test codes can be reused
- [ ] Test codes bypass payment validation

## Deployment

### Current Deployment Platform: Lovable + Supabase

1. **Frontend**: Click "Publish" button in Lovable → Automatic deployment
   - No manual build commands needed
   - Automatic CDN distribution
   - Custom domain via Lovable project settings
   
2. **Edge Functions**: Auto-deploy on Git push to main branch
   - Managed through Supabase integration
   - Secrets configured in Supabase dashboard
   
3. **Database**: Migrations via Supabase CLI
   - Test locally: `supabase start`
   - Deploy: `supabase db push`
   
4. **Webhooks**: Configure in Stripe Dashboard with your Supabase function URL
   - Format: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`

> ⚠️ **Note**: This project deploys via **Lovable**, not Vercel. Ignore any Vercel-specific instructions in old documentation.

## Troubleshooting

See [TROUBLESHOOTING_GIFT.md](./TROUBLESHOOTING_GIFT.md) for common issues and solutions.

### Common Issues

- **Webhook not firing**: Check Stripe webhook configuration and secret
- **Email not sending**: Verify Resend domain and API key
- **Code redemption fails**: Check RLS policies and user authentication
- **Payment not completing**: Review Stripe dashboard for failed payments

## Security Considerations

### Input Validation
- All user inputs validated with Zod schemas
- Email format validation (RFC 5322 compliant)
- Gift code format enforcement (XXXX-XXXX-XXXX)
- SQL injection prevention via parameterized queries

### Authentication
- JWT verification on protected routes
- Session management via Supabase Auth
- RLS policies enforce data isolation

### Payment Security
- PCI compliance via Stripe
- No card data stored locally
- Webhook signature verification
- HTTPS enforcement

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

## Documentation

- **[README.md](./README.md)** - This file, quick start guide
- **[CURRENT_STATE.md](./CURRENT_STATE.md)** - Detailed system state and features
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design
- **[GIFT_TESTING_GUIDE.md](./GIFT_TESTING_GUIDE.md)** - Gift feature testing procedures
- **[TROUBLESHOOTING_GIFT.md](./TROUBLESHOOTING_GIFT.md)** - Gift feature troubleshooting
- **[Instructions.md](./Instructions.md)** - Business context and objectives
- **[todo.md](./todo.md)** - Development roadmap

## Support

For technical support:
- Email: hello@aiautobiography.com
- Testing guides: GIFT_TESTING_GUIDE.md
- Troubleshooting: TROUBLESHOOTING_GIFT.md
