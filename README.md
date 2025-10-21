# Narrated - AI-Powered Autobiography Platform

Narrated is a comprehensive autobiography creation platform that helps users transform their memories into beautifully crafted books through AI-assisted conversations.

## Features

### Core Functionality
- **AI-Powered Conversations**: Intelligent interview system that guides users through their life story
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
- One-time use only
- Secure validation and tracking
- Personal message support

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
- Fields: `tier`, `title`, `user_id`, `status`, `purchase_status`

#### `chapters`
- Individual chapters within books
- Fields: `book_id`, `title`, `content`, `is_submitted`, `chapter_number`

#### `gift_codes`
- Gift purchase and redemption tracking
- Fields: `code`, `tier`, `recipient_email`, `purchaser_email`, `redeemed`, `expires_at`, `stripe_payment_status`

#### `orders`
- Transaction records for purchases
- Fields: `user_id`, `book_id`, `total_price`, `status`, `is_gift_redemption`

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
- **Auth**: Required (JWT)

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

### Quick Test Checklist

- [ ] Gift purchase flow completes
- [ ] Stripe checkout redirects properly
- [ ] Payment webhook updates database
- [ ] Emails are delivered
- [ ] Gift code redemption works
- [ ] Book tier updates correctly
- [ ] Edge cases handled (expired, used codes)

## Deployment

The application is designed for deployment on Lovable/Supabase infrastructure:

1. **Frontend**: Deployed via Lovable's publish feature
2. **Edge Functions**: Auto-deployed with code changes
3. **Database**: Hosted on Supabase
4. **Webhooks**: Configure in Stripe Dashboard with production URL

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

## Support

For technical support:
- Email: contact@narrated.com.au
- Documentation: See project wiki
- Testing guides: GIFT_TESTING_GUIDE.md
