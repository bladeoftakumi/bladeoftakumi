# Security & cost-control checklist — Blade of Takumi

This is a **static, client-only** site. The only way anything here can cost
money or be abused is through the **Google services behind it** — so the
protections below live in the Google/Firebase consoles, not in the code.

## What's in the repo (and why it's safe)

| Item | In repo? | Secret? | Notes |
|---|---|---|---|
| `firebase-config.js` (apiKey, projectId, …) | ✅ yes | ❌ no | Public project identifiers. Safe to commit. Google's own docs say so. |
| Owner username / password | ❌ no | — | Lives in Firebase Auth, never in code. |
| **Google Maps API key** (Rihla) | ❌ **no** | ✅ **yes** | Entered at runtime, stored only in your browser's localStorage. Never written to a file. |
| Firebase Admin / service-account keys | ❌ no | ✅ yes | Not used. Never put these in client code. |

A `.gitignore` blocks the common secret-file names as a backstop.

## Do these in the console to prevent abuse / cost (≈10 min)

### 1. Stay on the **Spark (free) plan** for now  ← strongest cost guarantee
Firebase → ⚙ → Usage and billing. On Spark there is **no billing account**,
so nothing can run up a charge — abuse just hits free quota and stops. Only
upgrade to Blaze when you add a feature that needs it (e.g. authenticator-app
2FA), and set a **budget alert** the same day (Google Cloud → Billing → Budgets).

### 2. Lock Firestore to the right access (essays sync is live)
Rules → publish the policy below. Public essays are world-readable (it's a public
blog); essays you mark **private** return nothing unless you're logged in; only
you can ever write. The `private` flag is enforced **here at the database**, not
just hidden in the UI — that's what makes "Make private" real.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /essays/{doc} {
      allow read:  if resource.data.private == false || request.auth != null;
      allow write: if request.auth != null;
    }
    // everything else: deny by default
    match /{doc=**} {
      allow read, write: if false;
    }
  }
}
```
Notes:
- `resource.data.private == false` lets the public read only docs explicitly
  marked public. Every essay published from Suzuri gets `private: false` by
  default, so they show normally; flip it with **Make private** on the Essays page.
- Logged-out visitors' query asks only for public essays (`where private == false`),
  so it never trips the rule. The owner is signed in, so reads return everything.
- Never use `allow read: if true` here — that exposes private drafts to anyone
  hitting the database API directly, regardless of the UI.

### 3. Restrict the **Google Maps API key** (Rihla) — most important for cost
Google Cloud Console → APIs & Services → Credentials → your key:
- **Application restriction:** HTTP referrers → add only your domain(s)
  (e.g. `https://bladeoftakumi.com/*`). This stops anyone else's site using it.
- **API restriction:** limit to **Places API (New)** + **Routes API** only.
- Set a **quota cap** on those APIs so a runaway loop can't rack up charges.

### 4. Limit who can create an account
Single-owner site: once you've created your account, **disable new sign-ups** —
Firebase → Authentication → Settings → "User actions" → uncheck *Enable create*
(or keep Email/Password as the only provider and rely on the owner-only rules).

### 5. (Optional) Turn on **App Check**
Firebase → App Check → register the web app with reCAPTCHA. This blocks the
public web config from being used outside your actual site.

## If a key ever leaks
- **Maps key:** Google Cloud → Credentials → regenerate the key, re-restrict it.
- **Firebase web config:** can't really "leak" (it's public) — abuse is stopped
  by the rules + App Check + plan limits above, not by hiding the config.
