# TripPocket

Your whole trip, close to hand. A mobile-first travel wallet proof of concept built with React, Vite, Vercel, Neon and free OpenRouter models. Infrastructure is provisioned through **Stripe Projects**.

**Fictional information only.** This disposable prototype deliberately has no application-level encryption or account login. Never paste real private booking emails, passport information, dates of birth, full card numbers or other sensitive information. AI imports send the supplied text and full photo to OpenRouter and a third-party model provider, which may retain inputs. This is not an official ticket or document wallet.

## Try it

The first visit opens a fictional London trip and a second trip to Lisbon. Open a trip, choose **Add to trip**, and try the sample booking email. Review and edit the extracted fields, then save. Open any item to copy its reference or present it at a larger size.

- Create, edit and delete trips.
- Flights, rail journeys, hotels, identity documents, cards (last four digits only), event tickets and miscellaneous references.
- Airline and rail dropdowns with locally rendered provider badges.
- Paste messy text or upload/take a photo; QR decoding runs in the browser. The whole photo and decoded QR content are passed to the model together.
- Review before saving; missing important details require explicit acceptance.
- Model-generated QR content is discarded. Only supplied or scanned QR payloads are rendered as codes.
- Photo attachments, large presentation view, reference copying, pinning and quick pocket, search and category filters.
- IndexedDB persistence, cloud saving and a service worker for previously loaded assets. Offline access requires a successful earlier load. AI and cloud saves need an internet connection; reopening online retries saving the local pocket.
- No signup. A random browser device token separates anonymous demo pockets. There is no account recovery, cross-device sync or conflict resolution between concurrent tabs.
- Export the pocket as JSON, restore fictional samples, or delete its data from settings. Cloud deletion requires a successful cloud save of the empty pocket; if offline, reconnect and use **Try cloud save again**. Exports are plaintext.

## Run locally

Requires Node.js 24+ and npm.

```sh
npm ci
cp .env.example .env
npm run dev:api
# In another terminal:
npm run dev
```

Open the Vite URL. With no credentials, the API stores demo pockets in ignored `.data/` files and uses an explicitly labelled basic text parser. That fallback does **not** interpret photos. Manual input, photo attachment and browser QR decoding still work.

For cloud storage and free AI, set `DATABASE_URL` and `OPENROUTER_API_KEY` in `.env`, then run:

```sh
npm run db:setup
```

The database schema is created idempotently. The browser never receives provider credentials. The API uses parameterized SQL and hashes device tokens before storing them as owner keys.

## Stripe Projects setup

Use the Stripe CLI to initialize or pull your own project. No account or project identifiers are committed here.

```sh
stripe projects init --mode manual --skip-skills
stripe projects link vercel --accept-tos
stripe projects add vercel/hobby --accept-tos
stripe projects add vercel/project --name trippocket-web --config '{"name":"trippocket-poc"}' --accept-tos
stripe projects link neon --accept-tos
stripe projects add neon/free --accept-tos
stripe projects add neon/postgres --name trippocket-db --accept-tos
stripe projects link openrouter --accept-tos
stripe projects add openrouter/free --accept-tos
stripe projects add openrouter/api --name trippocket-ai --accept-tos
```

Read provider terms before using `--accept-tos`. This setup selects only free plans. Do not select a paid plan or use `--confirm-paid-service` for this PoC. Provider quotas and free-plan eligibility still apply.

Stripe Projects writes ignored local credentials. The app accepts its `TRIPPOCKET_DB_CONNECTION_STRING` and `TRIPPOCKET_AI_API_KEY` names as alternatives to the generic server variables. Vercel deploy credentials (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`) are only used locally by the deploy script.

## Deploy

The deployment script uploads **only committed source files**, reads deployment credentials from ignored `.env`, and sets encrypted Vercel environment variables through its API. It never puts credential values in command arguments or source. Initialize your own repository, commit the reviewed source, and run:

```sh
npm run db:setup
npm run deploy
```

The Vercel project must already exist. The script reuses its ID from the environment and deploys to production. The command prints the deployment URL and initial status; verify that the build reaches Ready in Vercel. GitHub push alone does not trigger deployments unless you separately connect the repository in Vercel.

## Cost boundaries

The importer hardcodes `openrouter/free` with zero maximum prompt/completion prices. No paid model fallback or top-up is implemented. The database caps import attempts at 12 per browser pocket and 40 globally per UTC day. Free model availability, image support and provider rate limits can vary. When imports fail, manual entry remains available. Vercel Hobby and Neon Free enforce their own quotas.

Official references: [OpenRouter free models](https://openrouter.ai/collections/free-models/), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Neon plans](https://neon.com/docs/introduction/plans).

## Verification

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm audit
```

Browser tests cover desktop and mobile layouts, trip creation, photo attachments, persistence, pass presentation, import review, missing-field acceptance, QR decoding with whole-photo forwarding, and graceful AI failure. Mocked model responses keep those tests deterministic; a live model smoke check is separate.

Before committing or pushing:

```sh
npm run scan:public
```

This scans the exact staged contents for known local credential values, common secrets and account identifiers, and blocks private file paths. It supplements human review. `.env`, `.projects`, `.vercel`, `.data`, dependencies, builds and browser-test output must remain untracked. `.env.example` contains variable names with empty values only.

## Deliberate PoC limits

Not suitable for real travel or identity data. No encryption, strong authentication, sharing, account recovery, malware scanning or production abuse controls. Browser tokens can be lost or copied. Import results require human verification. Images are compressed and limited in size; PDFs and live continuous camera scanning are not supported. Device camera capture or image upload scans one frame, retaining its surrounding context. Travel provider badges are illustrative, not official licensed logos. Pockets are capped at 30 trips, 200 items and approximately 1.8 MB of serialized data. There is no payment collection or subscription flow.
