# Security

Outfittr is a demo/portfolio application. This document outlines the security considerations, current mitigations, and recommendations for hardening if the app were to be used in production.

---

## Threat Model

| Threat | Severity | Current mitigation |
| --- | --- | --- |
| Credential theft (password leak) | High | Passwords hashed with bcrypt (cost factor 12). Plaintext never stored or logged. |
| JWT token theft | Medium | Tokens expire after 7 days. Stored in `localStorage` (see recommendation below). |
| Unauthorized API access | Medium | All data-mutating endpoints require valid JWT. Ownership checks on all resources. |
| CORS bypass | Low | `CORS_ORIGIN` is set to a single exact-match domain. No wildcard origins. |
| Cloudinary abuse (storage spam) | Low | Unsigned preset restricted to folder, formats, and file size. |
| SQL injection | Low | Prisma ORM uses parameterized queries. No raw SQL in the codebase. |
| Brute-force auth | Medium | No rate limiting currently (see recommendation below). |

---

## Secrets Management

### Rules

1. **Never commit `.env` files.** The `.gitignore` already excludes `.env` and `.env.local`. Only `.env.example` templates (with placeholder values) should be in the repo.
2. **Use strong `JWT_SECRET` values in production.** Generate with:

   ```bash
   openssl rand -hex 32
   ```

   This produces a 64-character hex string. The local dev `.env.example` uses a placeholder that must be replaced.

3. **Rotate `JWT_SECRET` if compromised.** Changing the secret immediately invalidates all existing tokens. Users will need to re-authenticate.
4. **Neon `DATABASE_URL` contains credentials.** Never expose it in client-side code, logs, or error messages. Render environment variables are encrypted at rest.
5. **Cloudinary cloud name and preset name are public by design** (they're in `NEXT_PUBLIC_*` variables sent to the browser). This is safe only because the preset is unsigned and restricted — see Cloudinary section below.

---

## Authentication

- Passwords are hashed with `bcryptjs` at cost factor 12 before storage.
- JWTs are signed with HS256 using `JWT_SECRET`.
- Tokens are returned on login/register and sent as `Authorization: Bearer <token>` headers.
- The `authenticate` middleware validates the token on every protected request.

### Recommendations for production

- **Move token storage from `localStorage` to `httpOnly` cookies** to prevent XSS-based token theft. This requires a same-origin or proxy setup.
- **Add refresh tokens** with short-lived access tokens (e.g., 15 min access + 7-day refresh).
- **Implement rate limiting** on `/api/auth/login` and `/api/auth/register` to prevent brute-force attacks. Recommended: `express-rate-limit` with 5 attempts per minute per IP.

  ```ts
  // Example (not yet implemented):
  import rateLimit from 'express-rate-limit';
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { message: 'Too many attempts. Try again in a minute.' },
  });
  app.use('/api/auth', authLimiter);
  ```

---

## CORS

The API uses the `cors` middleware with a single `CORS_ORIGIN` value:

```ts
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
```

### Rules

- `CORS_ORIGIN` must match the frontend domain exactly, including protocol (`https://`).
- No trailing slash. `https://outfittr.vercel.app` is correct; `https://outfittr.vercel.app/` is not.
- Wildcard (`*`) is never used. This prevents cross-origin requests from unauthorized domains.
- In local development, it defaults to `http://localhost:3000`.

### Recommendation for production

If you need multiple allowed origins (e.g., staging + production), modify the CORS configuration to accept an array:

```ts
const allowed = process.env.CORS_ORIGINS?.split(',') ?? [];
app.use(cors({ origin: allowed, credentials: true }));
```

---

## Cloudinary Unsigned Uploads

Wardrobe image uploads go directly from the browser to Cloudinary using an **unsigned upload preset**. This means no API secret is needed in client code, but it also means anyone who knows the cloud name and preset name can upload.

### Current restrictions (required)

| Restriction | Value |
| --- | --- |
| Signing mode | Unsigned |
| Folder | `outfittr` |
| Allowed formats | `jpg,jpeg,png,webp` |
| Max file size | 5 MB |

### Recommendations

- **Enable Cloudinary moderation** if the app were public-facing to prevent abuse.
- **Monitor usage** in the Cloudinary dashboard. Free tier includes 25 credits/month.
- **Never create a signed preset for client-side use** — it would expose your `api_secret`.
- If the app scales, consider proxying uploads through the API so the frontend never references Cloudinary directly.

---

## Data Privacy

Outfittr is a **demo application** and is not designed for production data handling. In its current form:

- User data (email, name, wardrobe, trips, outfits, feedback) is stored in a Postgres database.
- No personal data is shared with third-party services except:
  - **Cloudinary**: Receives uploaded images only.
  - **Open-Meteo**: Receives location strings for geocoding. No user identifiers are sent.
- There is no data export or deletion endpoint currently. For GDPR compliance, a `DELETE /auth/me` endpoint and data export feature would be needed.
- No analytics, tracking, or cookies (beyond JWT in localStorage) are used.

---

## Input Validation

All API inputs are validated using Zod schemas before reaching controllers:

- String lengths are bounded.
- Enums are strictly checked (e.g., `bodyType` must be one of `lean | athletic | broad | curvy | average`).
- Arrays have max-length constraints (e.g., `favoriteColors` max 10 items).
- URLs are validated with `z.string().url()`.
- The validation middleware returns structured error responses on failure.

---

## Responsible Disclosure

This is a portfolio/demo project. If you discover a security issue:

1. **Do not open a public GitHub issue.**
2. Contact the maintainer directly via the email in the GitHub profile.
3. Allow reasonable time for a fix before any public disclosure.

Thank you for helping keep the project safe.
