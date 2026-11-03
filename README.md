# email-cleaner
Trash old emails and anything else unnecessary based on custom requirements.

A local Next.js app that signs in to your Gmail, lets you build filters (older than a date, from particular senders, category, size, read status, …), previews what matches, and moves every match to **Trash** in bulk. Trashed mail can be restored from Gmail for 30 days. Starred and important emails are kept by default.

## One-time setup

You need Node 20+ (`brew install node`), then a Google Cloud project that lets this app use your Gmail. Google's OAuth settings live under **Google Auth Platform**, which has **Branding**, **Audience**, **Clients** and **Data Access** tabs in its sidebar.

### 1. Create a project and enable the Gmail API

1. Go to <https://console.cloud.google.com> and sign in with the Gmail account you want to clean.
2. Click the project picker in the top bar, then **New project**. Name it something like `email-cleaner`, click **Create**, and make sure it's selected afterwards.
3. Open the ☰ menu and go to **APIs & Services → Library**. Search for **Gmail API**, open it and click **Enable**.

### 2. Set up the consent screen

1. In the ☰ menu, go to **APIs & Services → OAuth consent screen**. If it says it isn't configured yet, click **Get started**.
2. Fill in the wizard:
   - **App name:** `Email Cleaner`. **User support email:** your Gmail address.
   - **Audience:** choose **External**. "Internal" only works for Google Workspace organisations.
   - **Contact information:** your email again.
   - Agree to the policy and click **Create**.

### 3. Add yourself as a test user

1. In the Google Auth Platform sidebar, click **Audience**.
2. **Publishing status** should say **Testing**. Leave it that way. Publishing would need a review by Google.
3. Under **Test users**, click **+ Add users**, enter your Gmail address and click **Save**.

Only accounts on this list can sign in to the app.

### 4. Add the Gmail scope

1. In the sidebar, click **Data Access**, then **Add or remove scopes**.
2. Under **Manually add scopes**, paste `https://www.googleapis.com/auth/gmail.modify` and click **Add to table**.
3. Tick the box next to the scope, then click **Update** and **Save**.

### 5. Create the web OAuth client

1. In the sidebar, click **Clients**, then **+ Create client**.
2. **Application type:** **Web application**. **Name:** e.g. `Email Cleaner local`.
3. Under **Authorized redirect URIs**, click **+ Add URI** and enter this exactly, with no trailing slash:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   You can leave **Authorized JavaScript origins** empty.
4. Click **Create**, then copy the **Client ID** and **Client secret** (or download the JSON). Newer projects may not show the secret again; if you lose it, add a new secret to the same client.

### 6. Configure and install

```sh
cp .env.example .env.local
npx auth secret   # generates AUTH_SECRET, usually written into .env.local
npm install
```

Then check `.env.local` looks like this:

```
AUTH_GOOGLE_ID=1234567890-abc...apps.googleusercontent.com
AUTH_GOOGLE_SECRET=GOCSPX-...
AUTH_SECRET=<the generated value>
```

`.env.local` is git-ignored, so your secrets won't be committed.

### 7. First sign-in

Run `npm run dev`, open <http://localhost:3000> and click **Sign in with Google**. You'll see two warnings, both expected:

- **"Google hasn't verified this app."** Click **Continue**. On some versions you need to click **Advanced** first, then **Go to Email Cleaner (unsafe)**. This shows up because the app is in testing mode.
- **A permissions screen for reading, composing and modifying email.** Tick the box and continue. This permission can't permanently delete anything.

In testing mode Google ends the sign-in after 7 days; just sign in again.

### Common errors

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | The redirect URI in step 5 must be exactly `http://localhost:3000/api/auth/callback/google`. Use `localhost`, not `127.0.0.1`, and port 3000. Changes can take a few minutes to apply. |
| "Access blocked … has not completed verification" | Your account isn't in the test users list (step 3). |
| "Gmail API has not been used in project…" | Enable the Gmail API (step 1) in the same project as the client. |
| Sign-in stops working after about a week | Normal in testing mode. Sign in again. |

## Run

```sh
npm run dev   # http://localhost:3000
npm test      # query builder unit tests
```

## How it works

- Filters are turned into a Gmail search query (shown live in the UI). Dates use your local timezone: *Older than 2021-11-20* means received before midnight at the start of 20 Nov 2021.
- **Preview** lists every matching message ID and shows the first 50. Counts are of messages, not conversations, so they can be higher than what Gmail's search shows.
- **Move to Trash** asks you to type the count to confirm, re-runs the query on the server, and trashes matches in batches of 1000 with a progress bar.
- The app only requests the `gmail.modify` scope, which cannot permanently delete mail. OAuth tokens are kept in an encrypted cookie and never sent to the browser.
