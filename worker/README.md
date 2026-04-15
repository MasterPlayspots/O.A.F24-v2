# ZFBF API Worker

## Setup

1. Install dependencies:
\`\`\`bash
cd worker
npm install
\`\`\`

2. Create D1 databases:
\`\`\`bash
# Main database
npm run db:create

# BAFA database (currently commented out in wrangler.toml)
wrangler d1 create bafa_antraege
\`\`\`

3. Copy the database_id values from output and update `wrangler.toml`
   - For the main DB, it should already be configured
   - For BAFA_DB, uncomment lines 20-23 and replace the placeholder ID

4. Run migrations:
\`\`\`bash
# Main database migrations
npm run db:migrate

# BAFA database migration (after creating and configuring BAFA_DB)
wrangler d1 execute bafa_antraege --remote --file=./db/migrations/007-bafa-antraege-schema.sql
\`\`\`

5. Set secrets:
\`\`\`bash
wrangler secret put JWT_SECRET
wrangler secret put FRONTEND_URL
\`\`\`

6. Deploy:
\`\`\`bash
npm run deploy
\`\`\`

## Environment Variables

- `JWT_SECRET` - Secret for JWT signing (same as in Vercel)
- `FRONTEND_URL` - Frontend URL for CORS

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/verify-email` - Verify email
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update user (onboarding)

### Reports
- `GET /api/reports` - List all reports
- `GET /api/reports/:id` - Get single report
- `POST /api/reports` - Create new report
- `PATCH /api/reports/:id` - Update report
- `POST /api/reports/:id/finalize` - Finalize report (uses contingent)

### AI
- `POST /api/ai/generate` - Generate text with AI

### Payments
- `POST /api/gutschein/validate` - Validate coupon code
- `POST /api/payments/create` - Create payment
