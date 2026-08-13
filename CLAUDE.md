# Hair Stylist Booking & CMS

## 1. PROJECT OVERVIEW

This project is a personal online booking and content management platform for a single professional hairstylist.

The application allows customers to:

- Browse hair services
- View service details
- Select a service
- Select an available date
- Select an available time
- Provide personal and service-specific information
- Accept the required policies
- Pay a deposit or full amount online
- Receive booking confirmation
- Receive payment confirmation
- Receive appointment reminders
- Reschedule or cancel appointments where permitted
- Manage an existing appointment through a secure link

The stylist can use a private admin dashboard to:

- Manage appointments
- Manage the calendar
- Manage customers
- Manage services
- Manage availability
- Block dates and times
- Manage payments
- Manage website content
- Manage FAQs
- Manage legal and booking policies
- Configure booking settings
- Configure business information
- Configure notification settings

This is NOT a SaaS product.

There is only ONE stylist/business.

Do NOT implement:

- Multiple businesses
- Multiple organisations
- Staff management
- Team scheduling
- Franchise management
- SaaS subscriptions
- Tenant management
- Staff commissions
- Marketplace functionality

Keep the architecture simple, secure, maintainable and appropriate for a single-business application.

---

# 2. PRIMARY TECHNOLOGY STACK

Use the following stack unless there is a strong technical reason to change it:

- Next.js
- TypeScript
- Next.js App Router
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- shadcn/ui
- Stripe
- Resend
- Auth.js

Deployment target:

- Vercel

Use strict TypeScript.

Avoid unnecessary dependencies.

Before installing a new package, determine whether the existing stack already provides the required functionality.

---

# 3. DEVELOPMENT PRINCIPLES

## 3.1 Do not over-engineer

This application is for one hairstylist.

Do not introduce enterprise architecture, microservices, unnecessary abstractions or complex infrastructure.

Prefer:

- Simple
- Explicit
- Maintainable
- Type-safe
- Well-tested
- Secure

over unnecessary complexity.

## 3.2 Server-side authority

Never trust data supplied by the browser for:

- Prices
- Payment amounts
- Appointment availability
- Appointment duration
- Service details
- Booking status
- Payment status

The server/database is the source of truth.

## 3.3 Validate everything

Validate all user input on the server.

Client-side validation can improve UX but must never replace server-side validation.

Use appropriate schema validation.

## 3.4 Do not duplicate business logic

Booking availability calculations should exist in one authoritative service/module.

Do not recreate availability logic separately in multiple components.

## 3.5 Preserve existing functionality

When implementing a new feature:

- Inspect existing code first.
- Understand existing dependencies.
- Do not unnecessarily rewrite working components.
- Do not delete existing functionality without a clear reason.
- Run tests after significant changes.

---

# 4. PUBLIC WEBSITE

The public website should include:

- Home
- About
- Services
- Book
- Contact
- FAQ
- Privacy Policy
- Terms & Conditions
- Booking Policy
- Appointment Policy
- Cancellation Policy
- Refund Policy

The public website must be responsive.

Mobile experience is a priority.

---

# 5. ADMIN APPLICATION

Admin routes must be protected.

Primary admin sections:

- Dashboard
- Calendar
- Appointments
- Customers
- Services
- Availability
- Blocked Times
- Payments
- Content
- Policies
- Settings

Content sections:

- Homepage
- About
- Contact
- FAQ

Policy sections:

- Privacy Policy
- Terms & Conditions
- Booking Policy
- Appointment Policy
- Cancellation Policy
- Refund Policy

Settings sections:

- Business
- Booking
- Payments
- Notifications
- Account

---

# 6. CMS REQUIREMENTS

The application contains a lightweight custom CMS.

The stylist must be able to edit website content without editing source code.

## Homepage CMS

Editable fields may include:

- Hero heading
- Hero description
- Hero image
- Hero button text
- Featured services
- About section
- About image
- Testimonials
- FAQ section
- Contact section

## About CMS

Editable:

- Heading
- Biography
- Images
- Supporting content

## Contact CMS

Editable:

- Email
- Phone
- Location
- Social links
- Contact information

## FAQ CMS

The stylist can:

- Create FAQ
- Edit FAQ
- Delete FAQ
- Reorder FAQ
- Publish/unpublish FAQ

---

# 7. POLICY CMS

Policies must be editable through the admin dashboard.

Required policies:

1. Privacy Policy
2. Terms & Conditions
3. Booking Policy
4. Appointment Policy
5. Cancellation Policy
6. Refund Policy

Each policy should support:

- Title
- Rich text content
- Published/unpublished status
- Last updated date
- Version number

Do not hard-code policy content into the frontend.

The public policy pages should retrieve their content from the CMS/database.

---

# 8. POLICY VERSIONING

Policy acceptance is important.

When a customer accepts policies during booking, store:

- Policy name
- Policy version
- Acceptance timestamp
- Booking ID
- Customer information associated with the booking

Do not simply store:

"Customer accepted terms: true"

The system should know which version was accepted.

---

# 9. SERVICES

Services are managed through the CMS.

Each service should support:

- Name
- Description
- Category
- Price
- Deposit amount
- Duration
- Buffer time
- Image
- Preparation instructions
- Active/inactive status
- Featured status

Example:

Service:

Knotless Braids

Price:

£80

Deposit:

£30

Duration:

150 minutes

Buffer:

15 minutes

---

# 10. SERVICE-SPECIFIC QUESTIONS

Services can have their own booking questions.

Examples:

"What length would you like?"

Options:

- Shoulder
- Mid-back
- Waist
- Hip

Another service might ask:

"Are you providing your own hair?"

Options:

- Yes
- No

Questions can be:

- Text
- Textarea
- Select
- Radio
- Checkbox

Questions can be:

- Required
- Optional

Questions should be associated with individual services.

Do not hard-code individual hairstyle questions into the booking application.

---

# 11. AVAILABILITY

The stylist can configure recurring weekly availability.

Example:

Monday:
09:00–18:00

Tuesday:
09:00–18:00

Wednesday:
Closed

Thursday:
10:00–19:00

Friday:
10:00–19:00

Saturday:
09:00–17:00

Sunday:
Closed

Support multiple availability periods per day.

Example:

09:00–13:00

14:00–18:00

This allows breaks.

---

# 12. BLOCKED TIMES

The stylist can block:

- Entire days
- Specific times
- Holidays
- Personal appointments
- Breaks
- Emergencies
- Other unavailable periods

Blocked times must be excluded from public availability.

---

# 13. BOOKING ENGINE

The booking engine is a critical part of the application.

Available appointment slots must consider:

1. Weekly availability
2. Service duration
3. Buffer time
4. Existing appointments
5. Blocked times
6. Blocked dates
7. Minimum booking notice
8. Maximum advance booking period
9. Timezone
10. Booking rules

Example:

Working hours:

09:00–17:00

Service duration:

120 minutes

Buffer:

15 minutes

The system must calculate valid slots accordingly.

---

# 14. DOUBLE-BOOKING PREVENTION

Never rely only on frontend availability.

Availability must be checked again on the server when the customer submits the booking.

The system must protect against race conditions where two customers attempt to book the same time simultaneously.

The final booking concurrency strategy uses PostgreSQL `pg_advisory_xact_lock` inside a Prisma interactive transaction. The lock key is derived from the appointment's local date (YYYYMMDD encoded as a bigint) using the configured business timezone. This serialises concurrent booking attempts for the same day without blocking bookings on different days. The lock is transaction-scoped and is automatically released on commit or rollback — it never persists beyond the transaction.

The booking system must fail safely.

If a slot becomes unavailable before confirmation, show the customer a clear message and allow them to select another slot.

---

# 15. BOOKING FLOW

Customer booking flow:

1. Select service
2. Select date
3. Select time
4. Enter customer details
5. Answer service-specific questions
6. Review appointment
7. Accept required policies
8. Proceed to payment
9. Complete payment
10. Confirm appointment
11. Display confirmation
12. Send confirmation email

The booking should not be considered confirmed until the required payment has been successfully confirmed.

PENDING appointments hold their slot using `Appointment.holdExpiresAt`. A PENDING appointment blocks availability only while the hold is active (i.e. `holdExpiresAt` is in the future or null). Once the hold expires, the slot is automatically freed without requiring a background job. The default payment hold duration is 15 minutes, configured via `BookingSettings.paymentHoldMins`.

---

# 16. CUSTOMER INFORMATION

Required customer information should include:

- First name
- Last name
- Email
- Phone number

Optional:

- Notes
- Service-specific information

Do not collect unnecessary personal information.

---

# 17. CUSTOMER ACCOUNTS

Customers do NOT need to create accounts to book.

Use secure appointment management links/tokens for customer self-service.

Do not expose appointment information through predictable URLs.

Appointment management tokens must be:

- Cryptographically secure
- Unpredictable
- Expirable where appropriate
- Revocable where appropriate

The raw token is generated server-side using a cryptographically secure random source. Only the SHA-256 hash of the raw token is stored in the database (`AppointmentToken.tokenHash`). The raw token is sent to the customer once in an email and is never persisted. Token lookup is performed by hashing the token from the URL and querying by hash.

---

# 18. APPOINTMENT STATUS

Appointment status values:

- PENDING
- CONFIRMED
- COMPLETED
- CANCELLED
- RESCHEDULED
- NO_SHOW

Do not use payment status as appointment status.

---

# 19. PAYMENT STATUS

Payment status values:

- PENDING
- DEPOSIT_PAID
- PAID_IN_FULL
- FAILED
- REFUNDED
- PARTIALLY_REFUNDED

Appointment status and payment status must remain separate.

---

# 20. STRIPE

Stripe is the payment provider.

Never store:

- Card numbers
- CVV
- Full card details

Use Stripe's secure payment infrastructure.

Prices must be calculated server-side.

Never trust an amount supplied by the browser.

Stripe webhook events must be verified using the Stripe webhook signing secret.

Webhook signature verification must occur before any database processing.

Payment processing must be idempotent.

Webhook idempotency is implemented using the `StripeWebhookEvent` model. Webhook event insertion, Stripe business processing (updating Payment, Appointment, Refund, and AppointmentEvent records), and marking the event as processed all occur atomically inside a single database transaction. If processing fails, the transaction rolls back entirely — including the event insertion — so Stripe can retry the webhook safely. A committed `StripeWebhookEvent` row always means the event was successfully processed.

Repeated webhook events must not create duplicate bookings or duplicate payments.

---

# 21. DEPOSITS

Services can have:

- No deposit
- Fixed deposit
- Percentage deposit
- Full payment

Example:

Service price:

£80

Deposit:

£30

Customer pays:

£30

Remaining balance:

£50

The remaining balance should be clearly shown to both the stylist and customer.

---

# 22. REFUNDS

Refunds must be processed through Stripe.

Do not manually mark a payment as refunded without processing the corresponding Stripe refund where applicable.

Store:

- Refund amount
- Refund date
- Stripe refund ID
- Refund status

---

# 23. CALENDAR

Admin calendar must support:

- Day view
- Week view
- Month view

Appointments should display:

- Customer
- Service
- Time
- Status
- Payment status

Clicking an appointment should open its details.

---

# 24. APPOINTMENT MANAGEMENT

Stylist can:

- Create appointment
- Edit appointment
- Reschedule
- Cancel
- Complete appointment
- Mark no-show
- Add internal notes
- View customer
- View payment information

Manual appointments must also respect availability unless explicitly overridden by the stylist.

---

# 25. CUSTOMER SELF-SERVICE

Customers can access a secure appointment management page.

They may be allowed to:

- View appointment
- Reschedule
- Cancel

depending on the configured policies.

Before allowing cancellation or rescheduling, check the applicable rules on the server.

---

# 26. CANCELLATION POLICY

Cancellation rules must be configurable.

Example:

Cancellation deadline:

24 hours

The system should calculate whether the cancellation is:

- Within allowed period
- Outside allowed period

Do not hard-code a 24-hour cancellation period.

---

# 27. RESCHEDULING

Rescheduling must:

1. Verify the appointment.
2. Check whether rescheduling is permitted.
3. Calculate available slots.
4. Verify the new slot server-side.
5. Update the appointment safely.
6. Preserve payment information.
7. Record the change.
8. Send a notification.

Do not create a new unrelated appointment unless there is a deliberate reason to do so.

---

# 28. EMAILS

Use Resend for transactional emails.

Required emails:

- Booking confirmation
- Payment confirmation
- Appointment reminder
- Rescheduling confirmation
- Cancellation confirmation
- Refund confirmation

Email sending should not cause the booking transaction itself to fail.

Use reliable asynchronous/background processing where appropriate.

---

# 29. REMINDERS

Reminder timing should be configurable.

Possible defaults:

- 48 hours before
- 24 hours before

Do not hard-code the reminder schedule.

Avoid sending duplicate reminders.

---

# 30. BUSINESS SETTINGS

Allow editing:

- Business name
- Stylist name
- Email
- Phone
- Address
- Logo
- Website URL
- Social media links
- Timezone
- Currency

Default currency:

GBP

Default timezone:

Europe/London

However, timezone should remain configurable.

---

# 31. BOOKING SETTINGS

Allow configuring:

- Minimum booking notice
- Maximum advance booking period
- Default buffer
- Cancellation deadline
- Rescheduling deadline
- Deposit rules
- Reminder timing
- Whether customers can cancel
- Whether customers can reschedule

---

# 32. DATABASE

Implemented models (22):

- User
- BusinessSettings
- BookingSettings
- SiteContent
- Faq
- Policy
- PolicyAcceptance
- ServiceCategory
- Service
- ServiceQuestion
- ServiceQuestionOption
- AvailabilityRule
- BlockedPeriod
- Customer
- AppointmentToken
- Appointment
- AppointmentAnswer
- AppointmentEvent
- Payment
- Refund
- NotificationLog
- StripeWebhookEvent

Implemented enums (11):

- AppointmentEventType
- AppointmentStatus
- ContentSection
- DepositType
- NotificationStatus
- NotificationType
- PaymentStatus
- PaymentType
- PolicyType
- QuestionType
- RefundStatus

Database design should be normalised appropriately.

Avoid storing duplicate data unnecessarily.

Use proper indexes for:

- Appointment date
- Appointment status
- Customer email
- Stripe payment ID
- Service ID
- Booking tokens

---

# 33. SECURITY

Security is a first-class requirement.

Implement:

- Protected admin routes
- Secure authentication
- Server-side authorisation
- Server-side input validation
- Secure session management
- Rate limiting
- Secure booking tokens
- Stripe webhook verification
- Environment variables for secrets
- No secret keys in client-side code
- Appropriate database constraints
- Safe error handling
- Protection against SQL injection through Prisma
- Protection against XSS
- Protection against CSRF where applicable

Never expose:

- Stripe secret key
- Database credentials
- Authentication secrets
- Email provider API keys

to the browser.

---

# 34. ERROR HANDLING

Errors must be user-friendly.

Do not expose:

- Stack traces
- Database errors
- Internal implementation details
- API keys
- Server paths

Use clear messages.

Example:

Instead of:

"Prisma P2002 constraint violation"

show:

"This appointment time is no longer available. Please select another time."

---

# 35. ACCESSIBILITY

Build to WCAG 2.2 AA principles where reasonably applicable.

Requirements include:

- Keyboard navigation
- Visible focus states
- Proper labels
- Semantic HTML
- Accessible form errors
- Sufficient colour contrast
- Accessible buttons
- Accessible modals
- Screen-reader-friendly status messages
- No colour-only communication

---

# 36. SEO

Public pages should have:

- Proper metadata
- Page titles
- Meta descriptions
- Canonical URLs
- Open Graph metadata
- Sitemap
- Robots configuration

Use structured data where appropriate.

Do not add unnecessary SEO content to private admin pages.

---

# 37. PERFORMANCE

Prioritise:

- Fast page loading
- Optimised images
- Server-side rendering where appropriate
- Minimal client-side JavaScript
- Lazy loading where appropriate
- Efficient database queries
- Proper caching

Do not add unnecessary animation.

---

# 38. DESIGN

The public website should feel like a premium hairstylist brand.

Design characteristics:

- Elegant
- Modern
- Clean
- Minimal
- Mobile-first
- Strong typography
- High-quality imagery
- Generous spacing
- Clear CTAs

Do not copy Acuity's visual design.

Acuity is only a functional reference.

The admin dashboard should prioritise usability and efficiency.

---

# 39. MOBILE

The customer booking experience must be excellent on mobile.

Test:

- iPhone-sized screens
- Android-sized screens
- Tablet
- Desktop

Touch targets should be appropriately sized.

Forms should be easy to complete on mobile.

---

# 40. TESTING

Write tests for critical business logic.

At minimum test:

- Availability calculation
- Service duration
- Buffer time
- Blocked times
- Existing appointments
- Minimum booking notice
- Maximum booking window
- Double booking prevention
- Booking creation
- Payment success
- Payment failure
- Stripe webhook handling
- Duplicate webhook handling
- Cancellation rules
- Rescheduling rules
- Refund handling
- Policy acceptance

Critical booking/payment logic must not depend solely on manual testing.

---

# 41. LOGGING

Use structured server-side logging for important events.

Log:

- Booking creation
- Booking cancellation
- Rescheduling
- Payment events
- Refund events
- Webhook failures
- Authentication failures

Do not log sensitive personal or payment information unnecessarily.

---

# 42. AUDITABILITY

Important changes should be traceable where practical.

Examples:

- Appointment created
- Appointment rescheduled
- Appointment cancelled
- Payment received
- Payment refunded
- Policy version accepted

Do not implement an unnecessarily complicated enterprise audit system.

Implement enough history to understand important booking and payment events.

---

# 43. ENVIRONMENT VARIABLES

Use environment variables for:

- Database URL
- Authentication secrets
- Stripe keys
- Stripe webhook secret
- Resend API key
- Application URL

Create a safe `.env.example`.

Never commit real credentials.

---

# 44. GIT

Use Git properly.

Before major changes:

- Check git status.
- Review existing changes.
- Avoid overwriting unrelated user work.

Make logical commits where appropriate.

Never remove unrelated project files simply to make the implementation easier.

---

# 45. IMPLEMENTATION PROCESS

Work in phases.

Do NOT attempt to build the entire application in one step.

Recommended phases:

1. Project foundation
2. Database
3. Authentication
4. Admin layout
5. CMS
6. Services
7. Availability
8. Booking engine
9. Customer booking
10. Stripe
11. Emails
12. Customer management
13. Calendar improvements
14. Testing
15. Security review
16. Production preparation

At the beginning of each phase:

1. Inspect the existing project.
2. Understand what has already been implemented.
3. Identify dependencies.
4. Create a plan.
5. Implement the phase.
6. Run tests.
7. Fix errors.
8. Verify existing functionality still works.
9. Summarise what changed.

Do not silently skip failed tests.

---

# 46. IMPORTANT CLAUDE CODE BEHAVIOUR

Before implementing a significant feature:

- Inspect relevant existing files.
- Do not assume file names.
- Do not assume dependencies exist.
- Do not create duplicate functionality.
- Do not rewrite working architecture unnecessarily.

If requirements are ambiguous, identify the ambiguity before making a major architectural decision.

Prefer the simplest implementation consistent with this document.

---

# 47. OUT OF SCOPE

Do NOT build:

- Multiple businesses
- Multiple stylists
- Staff accounts
- Team calendars
- SaaS subscriptions
- Marketplace
- Franchise management
- Staff commissions
- Customer social profiles
- Public reviews system unless explicitly requested
- Loyalty programme unless explicitly requested
- Gift cards unless explicitly requested
- Inventory management unless explicitly requested
- POS system
- Accounting system
- Complex CRM
- Native mobile application

These can be added later if explicitly requested.

---

# 48. DEFINITION OF DONE

A feature is not complete simply because the UI exists.

A feature is complete when:

- UI works
- Server logic works
- Database integration works
- Validation works
- Error handling exists
- Security has been considered
- Mobile layout works
- Tests exist for important business logic
- Existing functionality remains operational

For payment and booking functionality, correctness is more important than speed of implementation.

---

# 49. FINAL PRINCIPLE

Build a professional, reliable booking application for a real hairstylist.

Prioritise:

1. Booking correctness
2. Payment correctness
3. Security
4. Reliability
5. Usability
6. Accessibility
7. Maintainability
8. Performance
9. Visual polish

Do not sacrifice booking or payment correctness for visual effects.

Do not over-engineer the system.

Keep the application simple enough for one hairstylist to manage independently.
