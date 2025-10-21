# Gift Feature Troubleshooting Guide

This guide helps resolve common issues with the gift purchase and redemption feature.

## Table of Contents

1. [Stripe Webhook Issues](#stripe-webhook-issues)
2. [Payment Problems](#payment-problems)
3. [Email Delivery Issues](#email-delivery-issues)
4. [Code Redemption Failures](#code-redemption-failures)
5. [Database Issues](#database-issues)
6. [UI/UX Problems](#uiux-problems)
7. [Performance Issues](#performance-issues)

---

## Stripe Webhook Issues

### Problem: Webhooks Not Firing

**Symptoms:**
- Payment completes but gift code status doesn't update
- Emails not sent after purchase
- Database shows `stripe_payment_status` = 'pending'

**Diagnosis:**
```bash
# Check Stripe webhook logs
stripe logs tail

# Check Supabase edge function logs
# Dashboard → Edge Functions → stripe-webhook → Logs
```

**Solutions:**

#### 1. Verify Webhook Secret
```bash
# In Supabase Edge Function Secrets
STRIPE_WEBHOOK_SECRET=whsec_...
```
- Secret must match Stripe dashboard webhook secret
- Different for development (CLI) vs production

#### 2. Check Webhook Endpoint URL

**Development:**
```bash
# Correct format
http://localhost:54321/functions/v1/stripe-webhook
```

**Production:**
```
https://keadkwromhlyvoyxvcmi.supabase.co/functions/v1/stripe-webhook
```

#### 3. Verify Webhook Events

In Stripe Dashboard → Webhooks, ensure these events are selected:
- ✅ `checkout.session.completed`
- ✅ `payment_intent.payment_failed`

#### 4. Test Webhook Manually

```bash
# Use Stripe CLI to resend event
stripe events resend evt_xxx
```

#### 5. Check CORS Issues

Webhooks should not have CORS issues, but verify:
```typescript
// In stripe-webhook/index.ts
// Should NOT have corsHeaders in webhook handler
// Webhooks are server-to-server
```

---

### Problem: Webhook Signature Verification Failed

**Error Message:**
```
Webhook signature verification failed
```

**Causes:**
1. Wrong webhook secret
2. Request body modified
3. Timestamp too old (>5 min)

**Solution:**
```typescript
// Verify secret in edge function
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
console.log('Using webhook secret:', webhookSecret ? 'SET' : 'NOT SET');
```

Update the secret:
1. Go to Stripe Dashboard → Webhooks
2. Click on your endpoint
3. Click "Reveal" next to signing secret
4. Copy to Supabase Edge Function Secrets

---

## Payment Problems

### Problem: Checkout Session Not Creating

**Symptoms:**
- Error message when clicking "Purchase Gift"
- No redirect to Stripe
- Console error about checkout session

**Diagnosis:**
```javascript
// Check browser console
// Look for error from create-gift-payment function
```

**Solutions:**

#### 1. Verify Stripe Secret Key
```bash
# In Supabase Edge Function Secrets
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
```

#### 2. Check Form Validation
```typescript
// Ensure all required fields are filled:
- recipientEmail: valid email format
- purchaserEmail: valid email format
- tier: basic, standard, or premium
```

#### 3. Verify Edge Function Deployment
```bash
# Check if function is deployed
# Supabase Dashboard → Edge Functions
# Should see 'create-gift-payment' with green status
```

#### 4. Check Function Logs
```bash
# Look for errors in create-gift-payment logs
# Common issues:
- Missing Stripe key
- Invalid tier name
- Email validation failure
```

---

### Problem: Payment Successful but Code Not Marked Paid

**Symptoms:**
- Stripe shows payment succeeded
- Gift code still shows 'pending' status
- Can't redeem code

**Root Cause:**
Webhook not processing correctly

**Solutions:**

#### 1. Check Webhook Logs
Look for `checkout.session.completed` event processing

#### 2. Verify Session Metadata
```typescript
// In webhook handler logs, check:
metadata = {
  type: 'gift_purchase',  // Must be present
  gift_code: 'XXXX-XXXX-XXXX',  // Must match DB
  tier: 'standard',  // Must be valid
  recipient_email: '...'  // Must match DB
}
```

#### 3. Manual Database Fix (Emergency Only)
```sql
-- Only use if webhook failed and payment is confirmed in Stripe
UPDATE gift_codes
SET 
  stripe_payment_status = 'paid',
  stripe_payment_intent_id = 'pi_xxx',  -- Get from Stripe
  updated_at = NOW()
WHERE code = 'YOUR-CODE-HERE'
AND stripe_session_id = 'cs_xxx';  -- Verify session ID
```

---

## Email Delivery Issues

### Problem: Emails Not Sending

**Symptoms:**
- Purchase completes but no emails received
- Redemption works but no confirmation email

**Diagnosis:**
```bash
# Check send-chapter-email function logs
# Look for Resend API errors
```

**Solutions:**

#### 1. Verify Resend API Key
```bash
# In Supabase Edge Function Secrets
RESEND_API_KEY=re_...
```

#### 2. Check Domain Verification
- Go to [resend.com/domains](https://resend.com/domains)
- Ensure domain is verified (green checkmark)
- DNS records properly configured

#### 3. Check Email Addresses

**From Address:**
```typescript
// Must use verified domain
from: 'Narrated <noreply@your-verified-domain.com>'
```

**To Address:**
- Must be valid email format
- Check spam folder
- Verify email address in user profile

#### 4. Test Email Manually
```bash
# Call edge function directly
curl -X POST https://keadkwromhlyvoyxvcmi.supabase.co/functions/v1/send-chapter-email \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{\
    "email_type": "gift_purchase_confirmation",\
    "gift_code": "TEST-CODE-123",\
    "tier": "standard",\
    "recipient_email": "test@example.com",\
    "purchaser_email": "buyer@example.com"\
  }'
```

#### 5. Check Resend Logs
- Go to [resend.com/emails](https://resend.com/emails)
- Look for recent email attempts
- Check delivery status and any errors

---

### Problem: Emails Go to Spam

**Solutions:**

1. **SPF Record**: Add to your DNS
   ```
   v=spf1 include:_spf.resend.com ~all
   ```

2. **DKIM**: Resend configures automatically if domain verified

3. **DMARC**: Add to DNS
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
   ```

4. **Email Content**: Avoid spam trigger words
   - Remove excessive exclamation marks
   - Don't use all caps in subject
   - Include unsubscribe link (optional)

---

## Code Redemption Failures

### Problem: "Gift code not found"

**Causes:**
1. Code doesn't exist in database
2. Code format incorrect
3. Typo in code entry

**Solutions:**

#### 1. Verify Code in Database
```sql
SELECT * FROM gift_codes 
WHERE code = 'XXXX-XXXX-XXXX';
```

#### 2. Check Code Format
- Must be uppercase: `ABCD-EFGH-IJKL`
- Exactly 12 characters + 2 dashes
- Only alphanumeric characters

#### 3. Case Sensitivity
The code should auto-convert to uppercase, but verify:
```typescript
// In RedeemGift.tsx
const formatted = input.toUpperCase();
```

---

### Problem: "This gift code has already been redeemed"

**Expected Behavior:**
This is not a bug - codes are single-use only.

**Verification:**
```sql
SELECT 
  redeemed,
  redeemed_by,
  redeemed_at
FROM gift_codes
WHERE code = 'YOUR-CODE';
```

**If Incorrectly Marked Redeemed:**
```sql
-- Emergency reset (only if legitimately not redeemed)
UPDATE gift_codes
SET 
  redeemed = FALSE,
  redeemed_by = NULL,
  redeemed_at = NULL
WHERE code = 'YOUR-CODE'
AND redeemed = TRUE;

-- Then verify redemption didn't actually complete
-- Check orders and books tables
```

---

### Problem: "Payment for this gift code is still pending"

**Causes:**
1. Webhook hasn't processed yet (wait 1-2 minutes)
2. Webhook failed to process
3. Payment actually failed

**Solutions:**

#### 1. Check Stripe Payment Status
```bash
# Find payment in Stripe Dashboard
# Status should be "Succeeded"
```

#### 2. Check Webhook Processing
```bash
# Look for checkout.session.completed in webhook logs
# Should show successful processing
```

#### 3. Manual Fix if Payment Confirmed
```sql
-- Only if payment succeeded in Stripe
UPDATE gift_codes
SET stripe_payment_status = 'paid'
WHERE code = 'YOUR-CODE'
AND stripe_payment_intent_id = 'pi_xxx';  -- Verify
```

---

### Problem: "This gift code has expired"

**Expected Behavior:**
Codes expire 1 year after purchase

**Check Expiration:**
```sql
SELECT 
  code,
  created_at,
  expires_at,
  expires_at > NOW() as is_valid
FROM gift_codes
WHERE code = 'YOUR-CODE';
```

**Extend Expiration (if appropriate):**
```sql
-- Only for customer service situations
UPDATE gift_codes
SET expires_at = NOW() + INTERVAL '1 year'
WHERE code = 'YOUR-CODE';
```

---

## Database Issues

### Problem: RLS Policy Preventing Access

**Symptoms:**
- "Row level security policy violation" error
- User can't see their gift codes
- Redemption fails with permission error

**Check RLS Policies:**
```sql
-- View gift_codes policies
SELECT * FROM pg_policies 
WHERE tablename = 'gift_codes';
```

**Verify User Authentication:**
```typescript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

**Solutions:**

#### For Recipients:
```sql
-- RLS should allow viewing non-redeemed codes sent to user's email
CREATE POLICY "Recipients can view gifts" 
ON gift_codes FOR SELECT
USING (
  recipient_email = (auth.jwt() ->> 'email') 
  AND NOT redeemed
);
```

#### For Purchasers:
```sql
-- Should allow viewing own purchases
CREATE POLICY "Purchasers can view own gifts" 
ON gift_codes FOR SELECT
USING (purchaser_email = (auth.jwt() ->> 'email'));
```

---

### Problem: Foreign Key Constraint Errors

**Error Example:**
```
insert or update on table "orders" violates foreign key constraint
```

**Solutions:**

#### 1. Verify Book Exists
```sql
SELECT id FROM books 
WHERE id = 'book-uuid' 
AND user_id = 'user-uuid';
```

#### 2. Verify Gift Code Exists
```sql
SELECT id FROM gift_codes 
WHERE code = 'XXXX-XXXX-XXXX';
```

#### 3. Check User Authentication
```typescript
// Ensure user is logged in
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Redirect to login
}
```

---

## UI/UX Problems

### Problem: Form Validation Not Working

**Solutions:**

#### 1. Check Zod Schema
```typescript
// In Gift.tsx or RedeemGift.tsx
const schema = z.object({
  recipientEmail: z.string().email().max(255),
  // ... other fields
});
```

#### 2. Verify Error State
```typescript
// Errors should be displayed
{errors.recipientEmail && (
  <p className="text-destructive">{errors.recipientEmail}</p>
)}
```

#### 3. Check Form Submission
```typescript
// Prevent submission if invalid
if (!validateForm()) {
  return;
}
```

---

### Problem: Loading States Not Showing

**Check:**
```typescript
// Loading state should be set
const [isLoading, setIsLoading] = useState(false);

// Button should reflect loading
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="animate-spin" />}
  {isLoading ? 'Processing...' : 'Purchase Gift'}
</Button>
```

---

## Performance Issues

### Problem: Slow Page Load

**Diagnosis:**
```bash
# Chrome DevTools → Network tab
# Check:
- Total page load time
- Number of requests
- Largest resources
```

**Solutions:**

#### 1. Optimize Images
```typescript
// Use appropriate sizes
// Add lazy loading
<img loading="lazy" />
```

#### 2. Code Splitting
```typescript
// Lazy load heavy components
const Gift = lazy(() => import('./pages/Gift'));
```

#### 3. Database Query Optimization
```sql
-- Add indexes if missing
CREATE INDEX idx_gift_codes_recipient ON gift_codes(recipient_email);
CREATE INDEX idx_gift_codes_purchaser ON gift_codes(purchaser_email);
CREATE INDEX idx_gift_codes_code ON gift_codes(code);
```

---

## Emergency Procedures

### Complete System Reset (Development Only)

**WARNING:** This deletes all gift data!

```sql
-- Backup first!
-- Then:
DELETE FROM orders WHERE is_gift_redemption = TRUE;
DELETE FROM gift_codes;
-- Reset sequences if needed
```

### Manual Gift Code Creation (Testing Only)

```sql
INSERT INTO gift_codes (
  code,
  tier,
  recipient_email,
  purchaser_email,
  purchaser_name,
  stripe_payment_status,
  amount_paid,
  expires_at
) VALUES (
  'TEST-CODE-001',
  'basic',
  'recipient@example.com',
  'purchaser@example.com',
  'Test Purchaser',
  'paid',
  29.99,
  NOW() + INTERVAL '1 year'
);
```

---

## Getting Help

### Information to Collect

Before seeking help, gather:

1. **Error Messages**
   - Exact error text
   - Stack trace
   - Console logs

2. **Steps to Reproduce**
   - What were you doing?
   - What tier was selected?
   - What user account?

3. **System State**
   - Gift code (if applicable)
   - User ID
   - Timestamp of issue

4. **Logs**
   - Browser console
   - Edge function logs
   - Stripe webhook logs

### Support Channels

- **Technical Issues**: Email technical team
- **Payment Issues**: Check Stripe dashboard first
- **Email Issues**: Check Resend dashboard
- **Database Issues**: Check Supabase dashboard

---

## Preventive Measures

### Regular Monitoring

1. **Daily Checks**
   - [ ] Stripe webhooks processing
   - [ ] Email delivery rates
   - [ ] Error rates in edge functions

2. **Weekly Review**
   - [ ] Unredeemed codes aging report
   - [ ] Failed payment analysis
   - [ ] User feedback review

3. **Monthly Audit**
   - [ ] Database integrity check
   - [ ] Performance metrics review
   - [ ] Security audit

### Automated Alerts

Set up monitoring for:
- Webhook processing failures
- Email delivery failures
- High error rates in edge functions
- Database connection issues
- API rate limits approaching

---

## Version History

- **v1.0** (2024-01-20): Initial troubleshooting guide
- Document updates as issues are discovered and resolved
