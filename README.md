# ZFBF API Worker

## Setup

1. Install dependencies:
\`\`\`bash
cd worker
npm install
\`\`\`

2. Create D1 database:
\`\`\`bash
npm run db:create
\`\`\`

3. Copy the database_id from output and update `wrangler.toml`

4. Run migrations:
\`\`\`bash
npm run db:migrate
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
