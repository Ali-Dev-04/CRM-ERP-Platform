# Web Test Guide — CRM + ERP (for manual testers)

A simple, step-by-step guide to test the app in your browser. No coding needed.

You don't need to be technical to use this. Just follow each step, look at the
screen, and check that you see what we describe. If it matches → it **passes**.
If something else happens → it **fails** (note it down, see section 8).

---

## 1. Before you start (5 minutes)

You need the app running. If it isn't, ask a developer to start it, or run:

```
npm run dev:backend      # starts the server (API)
npm run dev:frontend     # starts the website (UI)
```

Then:

1. Open your browser (Chrome, Edge, or Firefox).
2. Go to 👉 **http://localhost:3000**
3. You should land on the **Sign in** page.

**Your test login:**
- Email: `demo@crm.dev`
- Password: `DemoPass12345`

> Tip: keep this guide open in one tab and the app in another, so you can follow along.

---

## 2. Tiny word list (only 4 terms)

| Word | What it means in plain English |
|------|-------------------------------|
| **Page** | A screen in the app, like "Clients" or "Dashboard". |
| **Field** | A box you type into (e.g. the email box). |
| **Button** | Something you click (e.g. "Sign in", "Create"). |
| **Expected** | What you should see if the app works correctly. |

That's it. Let's start testing. 👇

---

## 3. Sign in & Sign up

### Test 3.1 — Sign in (good login)
1. On the Sign in page, type `demo@crm.dev` in **Email**.
2. Type `DemoPass12345` in **Password**.
3. Click **Sign in**.
- ✅ **Pass if:** you go to the **Dashboard** page and see a welcome message with the name "Ada".
- ❌ **Fail if:** you see an error, a blank page, or stay on the sign-in page.

### Test 3.2 — Sign in with a wrong password
1. Sign out (bottom-left, **Sign out**).
2. Type `demo@crm.dev` and a wrong password like `WrongPass99`.
3. Click **Sign in**.
- ✅ **Pass if:** you see a message like **"Invalid email or password"** and stay on the sign-in page.
- ❌ **Fail if:** the message tells you specifically "password is wrong" (it should NOT reveal which part was wrong).

### Test 3.3 — Sign up a new account
1. Click **Create one** (the link under the sign-in form).
2. Fill in all fields: first name, last name, an organisation name, email (use a new one, e.g. `tester1@test.com`), and a password (at least 12 characters, with a letter and a number — e.g. `TestPass12345`).
3. Click **Create account**.
- ✅ **Pass if:** you go to the **Dashboard**.
- ❌ **Fail if:** it accepts a short password (under 12 chars) or a password with no number.

---

## 4. Dashboard

1. Sign in as `demo@crm.dev`. You start on the **Dashboard**.
2. Look at the four cards at the top: **Clients**, **Active projects**, **Employees**, **Task completion**.
3. Look lower for **Revenue (paid)**, **Outstanding**, **Overdue**.
4. Look for the **Tasks by status** box.
- ✅ **Pass if:** all cards show numbers, and nothing says "error" or shows a broken image. Numbers can be 0 — that's fine.
- ✅ **Bonus:** if the demo data was added, "Clients" should be more than 0.
- ❌ **Fail if:** any card is blank, shows "NaN", or the page is white/empty.

---

## 5. Clients

1. In the left menu, click **Clients**.
2. You should see a table of clients.

### Test 5.1 — View the list
- ✅ **Pass if:** a table appears with columns (Name, Company, Email, Status, Created).
- ❌ **Fail if:** the table is missing or the page crashes.

### Test 5.2 — A client is visible
- ✅ **Pass if:** at least one client shows (e.g. "Globex Corp") if demo data was added.

> Note: Creating a client from the UI is limited in this build. To add clients easily, use the **API Tester (Swagger)** in section 10. For now, the list view is what we test here.

---

## 6. Projects & Kanban board

1. In the left menu, click **Projects**.
2. You see a list of projects at the top.
3. Click a project name (or row).

### Test 6.1 — Open a project
- ✅ **Pass if:** a **board** appears below with columns like "To do", "In progress", "In review", "Done".

### Test 6.2 — Read the columns
- ✅ **Pass if:** each column header shows a count in parentheses, e.g. "To do (2)".
- ✅ **Pass if:** task cards show a title and a priority word (low/medium/high/urgent).

> Moving cards by dragging is not wired up in this build. Cards display correctly and in order — that's what we check here.

---

## 7. Invoices

1. In the left menu, click **Invoices**.
2. You see a table of invoices.

### Test 7.1 — View invoices
- ✅ **Pass if:** the table has columns Number, Status, Total, Due.
- ✅ **Pass if:** totals show as money (e.g. `$150.00`), not long numbers like `15000`.
- ✅ **Pass if:** each status has a coloured badge (green for Paid, blue for Sent, red for Overdue).

---

## 8. Calendar

1. Click **Calendar** in the left menu.
2. You see a date range (e.g. "Aug 7 → Sep 6").

### Test 8.1 — Calendar loads
- ✅ **Pass if:** two boxes appear: **Meetings** and **Tasks due**.
- ✅ **Pass if:** the page does not show an error. (Empty boxes are fine if there are no meetings/tasks.)

---

## 9. Knowledge, Analytics, Notifications

### 9.1 Knowledge
1. Click **Knowledge**.
- ✅ **Pass if:** a list of articles appears (or "No articles yet"). Each item shows a title and a "Published" or "Draft" badge.

### 9.2 Analytics
1. Click **Analytics**.
- ✅ **Pass if:** you see a **"Collected revenue (last 6 months)"** chart with bars. Months are labelled on the left.
- ✅ **Pass if:** bars are drawn (even small ones). Empty is fine if there were no payments.

### 9.3 Notifications
1. Click **Notifications**.
- ✅ **Pass if:** an **Inbox** appears. Unread items look highlighted; read items look faded. ("No notifications" is fine.)

---

## 10. "Try to break it" (negative tests)

These are quick checks that the app handles mistakes gracefully. Fun and easy.

| # | What to do | What you should see |
|---|-----------|---------------------|
| N1 | Sign in with empty email + password | The Sign in button does nothing / form complains; no crash. |
| N2 | On Sign up, enter a password of only 5 letters | It should be rejected (needs 12+ chars, a letter, and a number). |
| N3 | On Sign up, enter an invalid email like `abc@xyz` | It should say the email is invalid. |
| N4 | Sign out, then click the browser **Back** button | You should NOT see private dashboard data — you should be asked to sign in again. |
| N5 | Open two tabs: sign in on tab 1, sign out on tab 1, then try to use tab 2 | Tab 2 should send you back to sign-in (no access after logout). |

- ✅ **Pass if:** the app stays calm — shows a friendly message, never a white screen or technical error text.

---

## 11. (Optional) API Tester — for parts without a screen

Some parts (Employees, Attendance, Invoices creation, Payments, AI features, etc.)
don't have a screen yet, but you can still test them through a built-in tester
page called **Swagger**.

1. Open 👉 **http://localhost:4000/docs** in your browser.
2. At the top, click the **Authorize** button (a lock icon).
3. Paste a token like this: `Bearer PASTE_TOKEN_HERE`
   - To get a token: ask a developer, or run the login (Test 3.1) and grab the
     `accessToken` from the browser's stored login. For a beginner, just ask a dev for a token.
4. Now you can click any endpoint (e.g. **POST /auth/login**), click **Try it out**, fill the example, and click **Execute**.

### Easy checks in Swagger
| Endpoint | What to try | What you should see |
|----------|-------------|---------------------|
| `GET /health/live` | Try it out → Execute | Response code **200** and `{"status":"ok"}`. |
| `GET /health/ready` | Try it out → Execute | **200** and both `database` and `redis` say `"ok"`. |
| `GET /auth/me` | Authorize first, then Execute | **200** and your user details. |

- ✅ **Pass if:** you see **200** responses and JSON that matches the description.
- ❌ **Fail if:** you see **500** errors or pages that say "Internal Server Error".

> Only do this section if you feel comfortable. The browser tests (sections 3–10) are the main ones.

---

## 12. What to do if you find a bug

For each problem, note:
1. **Which test** failed (e.g. "Test 5.1").
2. **What you did** (steps).
3. **What you expected** (from this guide).
4. **What actually happened** (the real result, or paste any error text).
5. A **screenshot** if possible.

Hand that to a developer and they'll fix it.

---

## 13. Final checklist (tick as you go)

Beginner (browser) tests:
- [ ] 3.1 Sign in works
- [ ] 3.2 Wrong password is rejected cleanly
- [ ] 3.3 Sign up works (and rejects weak passwords)
- [ ] 4 Dashboard shows cards and numbers
- [ ] 5 Clients table loads
- [ ] 6 Projects → board with columns
- [ ] 7 Invoices table with money + coloured status
- [ ] 8 Calendar loads with Meetings + Tasks due
- [ ] 9.1 Knowledge list
- [ ] 9.2 Analytics revenue chart
- [ ] 9.3 Notifications inbox
- [ ] 10 Negative tests (N1–N5) — app stays calm

Optional (Swagger) tests:
- [ ] 11 `/health/live` → 200 ok
- [ ] 11 `/health/ready` → 200, database + redis ok
- [ ] 11 `/auth/me` → 200 user details

When every box is ticked, the app is verified for release. 🎉
