# Stem — Standalone Setup

This turns Stem into a real website your team (and buyers, if you want) can use
from any browser — no Claude account, no chat link, just a URL.

## What this costs

For a soft launch with a small team, this is effectively free:

- **Supabase** (database + login system): free tier includes 500MB database,
  50,000 monthly active users, and 5GB file storage — way more than a soft
  launch needs. The one catch: a free Supabase project **pauses after about a
  week of no activity** and needs one click to unpause. Not a problem once
  people are actually using it daily; worth knowing if it sits idle for a week.
- **Vercel** (hosting): free tier is generous for this — plenty of bandwidth
  for a small team or demo audience, real SSL, a real URL.
- **Total to start: $0.** You'd only start paying if you outgrow the free
  tiers — a paid Supabase plan starts around $25/month, Vercel similarly, and
  neither is necessary until you have real scale.

Setup takes about 20–30 minutes the first time.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up / sign in.
2. Click **New Project**. Pick any name and a database password (save that password somewhere — you likely won't need it again, but keep it just in case).
3. Wait ~2 minutes for it to spin up.
4. In the left sidebar, go to **SQL Editor → New query**.
5. Open `supabase/schema.sql` from this folder, paste the whole thing in, and click **Run**. This creates all the tables and security rules.
6. In the left sidebar, go to **Project Settings → API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key (NOT the `service_role` key — never put that one in this app)

### Optional but recommended: turn off email confirmation

By default, Supabase makes new users click a confirmation link in their email
before they can sign in. For an internal team tool that's often more friction
than it's worth. To turn it off:

**Authentication → Providers → Email → toggle "Confirm email" off.**

You can always turn it back on later if you want that extra step.

## 2. Configure the app

1. In this folder, copy `.env.example` to a new file named `.env`.
2. Fill in the two values from Supabase step 6 above:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 3. Run it locally first (recommended)

You'll need [Node.js](https://nodejs.org) installed (any recent version).

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Sign up with your
own email — **the first person to ever sign up automatically becomes admin.**
Everyone who signs up after that starts as a Sales Rep; promote them or grant
specific permissions from **Admin → Team**.

## 4. Deploy it for real (Vercel)

1. Push this folder to a GitHub repository (or use Vercel's CLI/drag-and-drop
   deploy if you'd rather skip GitHub).
2. Go to [vercel.com](https://vercel.com), sign up, and click **Add New → Project**.
3. Import the repository.
4. Before deploying, add the same two environment variables from your `.env`
   file under **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. In a minute or two you'll get a real URL like
   `stem.vercel.app` — that's what you hand to your team or buyers.
6. **Optional — a custom domain:** Vercel lets you attach your own domain
   (e.g. `app.yourcompany.com`) for free; you just need to own the domain
   itself (typically $10–15/year from any registrar). Not required for a
   soft launch, but makes it look more like a real product if you're showing
   buyers.

## How accounts work here (different from the Claude version)

- Admin can't create accounts *for* people directly in-app — browsers aren't
  allowed to do that for security reasons, only a real server can.
- Instead: share the site URL, have each person sign up themselves with their
  own email + password, and then promote/grant permissions to them from
  **Admin → Team**.
- Passwords are handled entirely by Supabase's authentication system —
  properly hashed, with real password-reset emails. This is a meaningful
  security upgrade over the Claude-hosted version's built-in password system.
- There's no "keeps resetting to the setup screen" problem here — unlike a
  republished Claude artifact, this data lives in your own Supabase project
  and stays put across every deploy.

## Notes

- All inventory, orders, trim logs, rooms, and strains live in one shared row
  in the `app_state` table — simple and fast for a small team. If you ever
  outgrow that (hundreds of thousands of records, need for granular
  history/auditing), it can be split into proper relational tables later
  without changing the UI.
- The 454g = 1lb conversion, grade/room structure, trim-to-inventory flow,
  and printable letter-size invoices with your shipper info all work exactly
  like the Claude-hosted version.
- Your logo and the "Stem" name are baked into the app already.
