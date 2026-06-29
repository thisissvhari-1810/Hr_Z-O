# PeopleFlow — HR Website

Static marketing website for **PeopleFlow**, an India-focused hire-to-retire HRMS.
The homepage was originally generated on [lovable.dev](https://lovable.dev); this
repository adds the rest of the "mandatory" files you need to actually ship the
site (companion pages, favicon, SEO files, manifest, etc.).

There is **no build step**. Just open `index.html` in a browser, or deploy the
folder as-is to any static host (Netlify, Vercel, GitHub Pages, Cloudflare
Pages, Hostinger, Hostgator, S3 + CloudFront, plain shared hosting — anything).

---

## 📁 Project structure

```
Hr_Z-O/
├── index.html              ← Homepage (web servers default to this name)
├── peopleflow.html         ← Original Lovable export (kept as backup)
├── 404.html                ← Custom "Page Not Found" page
├── favicon.svg             ← Browser tab icon
├── site.webmanifest        ← PWA / installable-app manifest
├── robots.txt              ← Search engine crawler rules
├── sitemap.xml             ← Search engine URL index
├── .gitignore              ← Files Git should ignore
├── README.md               ← This file
│
├── assets/
│   ├── css/
│   │   └── site.css        ← Shared design system (used by companion pages)
│   └── js/
│       └── site.js         ← Shared nav + form handling
│
└── pages/
    ├── login.html          ← Customer login
    ├── signup.html         ← Free-trial signup
    ├── about.html          ← About / company story
    ├── contact.html        ← Contact + sales form
    ├── careers.html        ← Open job roles
    ├── blog.html           ← Blog index
    ├── help.html           ← Help / support center
    ├── privacy.html        ← Privacy policy
    ├── terms.html          ← Terms of service
    └── security.html       ← Security & compliance
```

---

## 🚀 How to view the site locally

### Option A — Just double-click

The fastest way: double-click `index.html`. It will open in your default
browser. Everything works because the site has no backend.

### Option B — Run a tiny local server (recommended)

A local server makes the favicon, manifest and `/`-based links behave exactly
like they will in production.

**Using Python (already installed on most machines):**

```bash
python -m http.server 8080
```

Then visit <http://localhost:8080>.

**Using Node.js:**

```bash
npx serve .
```

**Using PHP:**

```bash
php -S localhost:8080
```

---

## 🌐 How to deploy

### Netlify / Vercel / Cloudflare Pages

1. Push this folder to a GitHub repository.
2. Sign in to Netlify / Vercel / Cloudflare Pages.
3. "Import" the repo. Leave all build settings empty — there is no build.
4. Set the **publish directory** to `.` (the project root).
5. Click deploy. You're live.

The `404.html` file will automatically be served on broken links on Netlify and
Cloudflare Pages; Vercel uses the same convention.

### GitHub Pages

1. Push to GitHub.
2. Repo → **Settings → Pages → Build from a branch** → pick `main`, folder `/`.
3. Save. Your site is at `https://<username>.github.io/<repo>/`.

### Traditional shared hosting (cPanel / Hostinger / etc.)

1. Open your hosting File Manager.
2. Upload the entire project folder into `public_html/` (or your domain root).
3. Done. Visit your domain.

---

## ✏️ Common edits

| You want to change                | Edit this                                                   |
| --------------------------------- | ----------------------------------------------------------- |
| Colors, fonts, design tokens      | `:root { ... }` in `assets/css/site.css` *and* `index.html` |
| Homepage copy / sections          | `index.html`                                                |
| Nav links (every page)            | The `<nav>` block at the top of each page                   |
| Footer links / company info       | The `<footer>` block at the bottom of each page             |
| Contact form recipient            | Wire `pages/contact.html` form to your form provider        |
| Company name / domain in SEO      | `sitemap.xml`, `robots.txt`, `site.webmanifest`, `<title>`s |

> **Tip:** if you want to change the navbar in every page at once, do a
> project-wide find-and-replace on the `<nav class="nav">` block.

---

## 📬 Wiring up the forms

The login, signup and contact forms currently use a tiny client-side mock
(see `assets/js/site.js`) that shows a success toast. To actually receive
submissions you have two easy options:

- **Netlify Forms** — add `netlify` and `name="..."` attributes to each
  `<form>` and Netlify will collect submissions automatically.
- **Formspree / Getform / Web3Forms** — change each `<form>`'s `action` to
  the URL they give you and remove the `data-mock-submit` attribute.

---

## 📋 Checklist before going live

- [ ] Replace `peopleflow.in` with your actual domain in `sitemap.xml`,
      `robots.txt`, and the `og:` meta tags inside `index.html`.
- [ ] Add a real `favicon.ico` if you need to support very old browsers
      (the SVG works in every modern browser).
- [ ] Wire up the contact / signup / login forms (see above).
- [ ] Add your Google Analytics / Plausible / Fathom snippet inside `<head>`.
- [ ] Test the site on a real phone — not just the desktop view.
- [ ] Submit `sitemap.xml` to Google Search Console.

---

## 📜 License

Copyright © PeopleFlow Technologies Pvt. Ltd. All rights reserved.
