# Gift Feature Testing Guide

This guide provides comprehensive testing procedures for the gift purchase and redemption feature.

## Test Codes for Quick Testing

For rapid testing without going through Stripe checkout, use these pre-seeded test codes:

### Available Test Codes

| Code | Tier | Description |
|------|------|-------------|
| `TEST-BSIC-0001` | Basic | Upgrades book to Basic tier |
| `TEST-STND-0001` | Standard | Upgrades book to Standard tier |
| `TEST-PREM-0001` | Premium | Upgrades book to Premium tier |

### Test Code Features

- ✅ **No payment required** - Bypass Stripe checkout completely
- ✅ **Reusable** - Can be used by multiple users/accounts
- ✅ **Never expire** - Valid for 10 years
- ✅ **Instant redemption** - No webhook delays
- ⚠️ **Development only** - Should not be used in production

### How to Use Test Codes

1. Log in to your account
2. Navigate to `/redeem-gift` or `/redeem-gift?code=TEST-PREM-0001`
3. Enter test code or confirm pre-filled code
4. Click "Redeem Gift Code"
5. Book will be upgraded immediately

### Resetting Test Codes

If you need to reset test codes to allow re-testing:

```sql
UPDATE gift_codes 
SET redeemed = false, 
    redeemed_by = NULL, 
    redeemed_at = NULL 
WHERE is_test_code = true;
```

---

## Prerequisites

### Required Accounts
- [ ] Stripe test account with API keys configured
- [ ] Resend account with domain verified
- [ ] Supabase project with all secrets configured
- [ ] Two different user accounts for testing

### Environment Setup
1. Ensure all edge function secrets are configured
2. Stripe webhook endpoint is set up (development or production)
3. Database is in a clean state (or you can delete test data after)

## Test 1: Gift Purchase Flow

### Objective
Verify complete gift purchase workflow from form submission to payment confirmation.

### Steps

#### 1.1 Navigate to Gift Page
```
URL: /gift
```
- [ ] Page loads without errors
- [ ] All three tiers are displayed (Basic, Standard, Premium)
- [ ] Pricing is correct
- [ ] UI is responsive on mobile

#### 1.2 Fill Gift Details Form
```
Recipient Email: recipient-test@example.com
Purchaser Email: purchaser-test@example.com
Purchaser Name: Test Purchaser
Gift Message: "Happy Birthday! Looking forward to reading your story."
```
- [ ] All input fields are functional
- [ ] Character counter works for gift message (500 max)
- [ ] Email validation works (try invalid email format)
- [ ] Error messages display correctly

#### 1.3 Select Tier and Purchase
- [ ] Click "Purchase Gift" on Standard tier
- [ ] Validation passes (no error messages)
- [ ] Loading state activates
- [ ] Redirects to Stripe checkout

#### 1.4 Complete Stripe Checkout
```
Test Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```
- [ ] Stripe checkout page loads
- [ ] Correct amount is displayed ($49.99)
- [ ] Tier information is shown
- [ ] Payment processes successfully
- [ ] Redirects to success page

#### 1.5 Verify Success Page
```
URL: /gift-success?code=XXXX-XXXX-XXXX&tier=standard&...
```
- [ ] Success page displays
- [ ] Gift code is shown in correct format
- [ ] Tier information is correct
- [ ] Recipient and purchaser emails are displayed
- [ ] Copy code button works
- [ ] Redeem link is functional

### Database Verification

#### Check `gift_codes` table:
```sql
SELECT * FROM gift_codes 
WHERE purchaser_email = 'purchaser-test@example.com'
ORDER BY created_at DESC LIMIT 1;
```

Verify:
- [ ] `code` is in format XXXX-XXXX-XXXX
- [ ] `tier` = 'standard'
- [ ] `recipient_email` = 'recipient-test@example.com'
- [ ] `purchaser_email` = 'purchaser-test@example.com'
- [ ] `purchaser_name` = 'Test Purchaser'
- [ ] `gift_message` is stored correctly
- [ ] `stripe_payment_status` = 'paid'
- [ ] `stripe_session_id` is populated
- [ ] `stripe_payment_intent_id` is populated
- [ ] `redeemed` = false
- [ ] `expires_at` is ~1 year from now
- [ ] `amount_paid` = 49.99

### Email Verification

#### Purchaser Confirmation Email
Check inbox for: `purchaser-test@example.com`

Verify:
- [ ] Email received within 2 minutes
- [ ] Subject mentions gift purchase
- [ ] Gift code is displayed
- [ ] Tier information is correct
- [ ] Amount paid is shown
- [ ] Instructions for sharing with recipient

#### Recipient Notification Email
Check inbox for: `recipient-test@example.com`

Verify:
- [ ] Email received within 2 minutes
- [ ] Subject mentions gift received
- [ ] Gift code is prominently displayed
- [ ] Purchaser name is shown (if provided)
- [ ] Gift message is included
- [ ] Clear redemption instructions
- [ ] Link to redemption page

### Edge Function Logs

Check Supabase Edge Function logs:

#### `create-gift-payment` logs:
- [ ] Function executed successfully
- [ ] Gift code generated and logged
- [ ] Stripe session created
- [ ] No errors in logs

#### `stripe-webhook` logs:
- [ ] Webhook received `checkout.session.completed` event
- [ ] Session ID matches your purchase
- [ ] Gift code updated with payment status
- [ ] Email invocation attempted
- [ ] No errors in webhook processing

---

## Test 2: Gift Redemption Flow

### Objective
Verify gift code redemption process and book tier upgrade.

### Prerequisites
- Use gift code from Test 1
- Log in as a DIFFERENT user (not the purchaser)

### Steps

#### 2.1 Login as Recipient
```
Email: Use different email than purchaser
```
- [ ] Can log in successfully
- [ ] Has existing book OR can create one

#### 2.2 Navigate to Redeem Page
```
URL: /redeem-gift
```
- [ ] Page loads correctly
- [ ] Form is displayed
- [ ] Instructions are clear
- [ ] Code input is properly formatted

#### 2.3 Enter Gift Code
```
Code: XXXX-XXXX-XXXX (from Test 1)
```
- [ ] Auto-formatting works (adds dashes)
- [ ] Only alphanumeric characters accepted
- [ ] Maximum 14 characters (12 + 2 dashes)
- [ ] Validation message shows correct format

#### 2.4 Redeem Code - New Book Option
- [ ] Click "Redeem Gift Code"
- [ ] Loading state shows
- [ ] Success toast appears
- [ ] Gift message toast shows (if provided)
- [ ] Redirects to appropriate page (dashboard or book)

#### 2.5 Verify Book Tier Update
Navigate to Dashboard:
- [ ] Book shows correct tier badge
- [ ] Tier features are unlocked
- [ ] No errors in console

### Database Verification

#### Check `gift_codes` table:
```sql
SELECT * FROM gift_codes 
WHERE code = 'YOUR-GIFT-CODE';
```

Verify:
- [ ] `redeemed` = true
- [ ] `redeemed_by` = current user's UUID
- [ ] `redeemed_at` is populated with timestamp
- [ ] `updated_at` is updated

#### Check `books` table:
```sql
SELECT id, tier, user_id FROM books 
WHERE user_id = 'REDEEMER_UUID' 
ORDER BY updated_at DESC LIMIT 1;
```

Verify:
- [ ] Book tier matches gift tier ('standard')
- [ ] Book belongs to redeemer user

#### Check `orders` table:
```sql
SELECT * FROM orders 
WHERE user_id = 'REDEEMER_UUID' 
ORDER BY created_at DESC LIMIT 1;
```

Verify:
- [ ] Order record created
- [ ] `is_gift_redemption` = true
- [ ] `gift_code_id` matches gift code UUID
- [ ] `book_id` matches upgraded book
- [ ] `total_price` = 0 (since it's a redemption)

### Email Verification

Check inbox for redeemer's email:
- [ ] Redemption confirmation email received
- [ ] Email contains tier information
- [ ] Instructions for next steps included

### Edge Function Logs

Check `redeem-gift-code` logs:
- [ ] Function executed successfully
- [ ] Code validation passed
- [ ] Book tier updated
- [ ] Order created
- [ ] Email sent
- [ ] No errors

---

## Test 3: Edge Cases & Error Handling

### Test 3.1: Already Redeemed Code

#### Steps:
1. Try to redeem the same code again (from Test 2)
2. Expected result:
   - [ ] Error message: "This gift code has already been redeemed"
   - [ ] No database changes
   - [ ] User friendly error display

### Test 3.2: Expired Code

#### Setup:
```sql
-- Manually expire a gift code for testing
UPDATE gift_codes 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE code = 'TEST-EXPIRED-CODE';
```

#### Steps:
1. Try to redeem expired code
2. Expected result:
   - [ ] Error message: "This gift code has expired"
   - [ ] No redemption occurs
   - [ ] Clear expiration message

### Test 3.3: Invalid Code Format

#### Steps:
Try these invalid formats:
- `ABCD1234EFGH` (no dashes)
- `ABC-1234-EFGH` (wrong segment lengths)
- `abcd-efgh-ijkl` (lowercase - should auto-uppercase)
- `!@#$-%^&*-(){}` (special characters)

Expected results:
- [ ] Validation error shows
- [ ] Message: "Invalid code format. Use format: XXXX-XXXX-XXXX"
- [ ] Submit button stays disabled
- [ ] No API call made

### Test 3.4: Non-existent Code

#### Steps:
1. Enter valid format but fake code: `FAKE-CODE-1234`
2. Click redeem
3. Expected result:
   - [ ] Error message: "Gift code not found"
   - [ ] No database changes
   - [ ] Clear error display

### Test 3.5: Unpaid Gift Code

#### Setup:
```sql
-- Create a gift code with pending payment status
INSERT INTO gift_codes (code, tier, recipient_email, purchaser_email, stripe_payment_status)
VALUES ('TEST-UNPD-CODE', 'basic', 'test@example.com', 'buyer@example.com', 'pending');
```

#### Steps:
1. Try to redeem unpaid code
2. Expected result:
   - [ ] Error message: "Payment for this gift code is still pending"
   - [ ] No redemption occurs
   - [ ] Appropriate error message

### Test 3.6: Payment Failure Handling

#### Steps:
1. Start gift purchase flow
2. Use declined test card: `4000 0000 0000 9995`
3. Expected results:
   - [ ] Payment fails in Stripe
   - [ ] User sees error message
   - [ ] Webhook receives `payment_intent.payment_failed`
   - [ ] Gift code marked as failed in database
   - [ ] No confirmation email sent

### Test 3.7: Webhook Retry Logic

#### Simulate webhook failure:
1. Temporarily break webhook endpoint (or use Stripe CLI)
2. Complete a purchase
3. Stripe will retry webhook
4. Fix endpoint
5. Expected result:
   - [ ] Webhook eventually succeeds
   - [ ] Database updated correctly
   - [ ] No duplicate records
   - [ ] Idempotency maintained

---

## Test 4: User Experience & Performance

### Test 4.1: Mobile Responsiveness

Test on mobile devices or Chrome DevTools:
- [ ] `/gift` page is mobile-friendly
- [ ] `/redeem-gift` page is mobile-friendly
- [ ] `/gift-success` page is mobile-friendly
- [ ] Forms are easy to fill on mobile
- [ ] Buttons are touch-target appropriate (44x44px min)

### Test 4.2: Loading States

Verify all loading states:
- [ ] Purchase button shows spinner during processing
- [ ] Redeem button shows loading state
- [ ] Appropriate loading messages displayed
- [ ] User cannot double-submit forms

### Test 4.3: Error Recovery

Test error scenarios:
- [ ] Network failure during purchase (show friendly error)
- [ ] Stripe checkout cancelled (handle redirect back)
- [ ] Browser back button from Stripe (maintains state)
- [ ] Session timeout during redemption (redirect to login)

### Test 4.4: Navigation Flow

Test navigation:
- [ ] Gift link in header works
- [ ] Gift link in footer works
- [ ] "Redeem Gift" button in dashboard works
- [ ] All back buttons function correctly
- [ ] Breadcrumb navigation is intuitive

---

## Test 5: Console & Network Validation

### Console Checks

For all pages, verify:
- [ ] No JavaScript errors
- [ ] No unhandled promise rejections
- [ ] No React warnings
- [ ] No 404 errors for assets
- [ ] No CORS errors

### Network Checks

Monitor Network tab during:
- [ ] Gift purchase - verify API calls
- [ ] Stripe redirect - check all requests succeed
- [ ] Code redemption - verify edge function call
- [ ] Email operations - check function invocations

### Performance Checks

- [ ] Page load time < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] No memory leaks during navigation
- [ ] Efficient re-renders (use React DevTools Profiler)

---

## Checklist Summary

After completing all tests, verify:

### Functional Requirements
- [x] Gift purchase completes successfully
- [x] Stripe integration works correctly
- [x] Gift codes are generated properly
- [x] Emails are delivered to both parties
- [x] Code redemption updates database correctly
- [x] Book tiers are upgraded appropriately
- [x] Edge cases are handled gracefully

### Non-Functional Requirements
- [x] UI is responsive and accessible
- [x] Loading states provide feedback
- [x] Error messages are user-friendly
- [x] Navigation is intuitive
- [x] Performance is acceptable
- [x] No console errors
- [x] Security measures are in place

### Database Integrity
- [x] All foreign keys valid
- [x] No orphaned records
- [x] Timestamps are accurate
- [x] RLS policies enforced
- [x] Data types correct

### Email Delivery
- [x] Purchaser receives confirmation
- [x] Recipient receives gift notification
- [x] Redeemer receives confirmation
- [x] Email content is accurate
- [x] Email formatting is correct

---

## Known Issues & Limitations

Document any issues found during testing:

1. **Issue**: [Description]
   - **Severity**: Low/Medium/High/Critical
   - **Steps to Reproduce**: 
   - **Expected**: 
   - **Actual**: 
   - **Status**: Open/In Progress/Resolved

---

## Testing Sign-off

Test completed by: _______________  
Date: _______________  
Environment: Development / Staging / Production  
All tests passed: Yes / No (see issues above)  
Notes: _______________
