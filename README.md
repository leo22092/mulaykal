# Mulaykkal Sri Mahavishnu Kshetram Website

Static temple website with a Cloudflare Worker-backed admin panel for live content updates.

## Project Structure

- `index.html` - main public website.
- `gallery.html` - public gallery page.
- `documents.html` - public notices/documents page.
- `privacy.html`, `terms.html` - legal pages.
- `login.html` - admin login page.
- `admin.html` - admin dashboard.
- `css/style.css` - public site styling.
- `css/admin.css` - admin dashboard styling.
- `js/app.js` - public site rendering logic.
- `js/admin.js` - admin dashboard logic.
- `cloudflare-data-worker.js` - current Cloudflare Worker code.
- `cloudflare-data-worker.old-json-only.js` - older Worker version kept for reference.
- `output.png` - icon/apple-touch image.
- `favicon.ico` - browser favicon.
- `og-image.png` - 1200x630 social sharing image.
- `robots.txt`, `sitemap.xml` - crawler files.
- `docs/screenshots/` - screenshots used by the admin manual.

## Runtime Architecture

The public site is mostly static HTML/CSS/JS. Dynamic content is loaded by `js/app.js` from:

```txt
https://temple-data.tkm22092.workers.dev
```

The admin panel in `admin.html` and `js/admin.js` loads the same Worker data, edits it in memory, and publishes it back to Cloudflare when the admin clicks **Publish To Cloudflare Worker**.

## Cloudflare Worker

Current Worker file:

```txt
cloudflare-data-worker.js
```

Required bindings/settings:

- `TEMPLE_DATA` - Cloudflare KV namespace.
- `TEMPLE_MEDIA` - Cloudflare R2 bucket binding for uploaded images.
- `PUBLIC_MEDIA_URL` - public base URL for R2 media.
- `ADMIN_TOKEN` or `ADMIN_SECRET` - token accepted by admin login and publish/upload requests.

Stored data:

- KV key: `templeData`
- Value: JSON object used by the website and admin dashboard.

Uploaded media:

- Stored in R2 through the Worker `/upload` endpoint.
- Gallery uploads are compressed in the browser before upload.
- Trustee and Acharya photos are also compressed.
- Hero uploads are sent without compression.

## Admin Flow

1. Open `login.html`.
2. Enter the Cloudflare Worker admin token.
3. Edit content in `admin.html`.
4. Use tab-level **Save** buttons to save changes into the current browser session.
5. Click **Publish To Cloudflare Worker** to update the live site.
6. Use **Download data.js** to export a local backup.

Important: local tab-level save buttons do not publish to the live website. Only **Publish To Cloudflare Worker** writes to Cloudflare KV.

## Local Development

This is a static site. You can view pages directly in a browser, but a small local server is better because absolute paths like `/output.png` and `/favicon.ico` behave like production.

Example:

```sh
python3 -m http.server 8000
```

Then open:

```txt
http://localhost:8000/
```

The public site and admin dashboard currently fetch live data from the Cloudflare Worker. If the Worker is unavailable, the code expects a local `js/data.js` fallback, but that file is not currently present in this repository. For safer offline development, export `data.js` from the admin panel and place it at `js/data.js`.

## SEO And Assets

The homepage includes:

- canonical URL
- meta description
- Open Graph tags
- Twitter card tags
- JSON-LD structured data
- favicon links
- apple touch icon

Subpages include canonical, description, robots, Open Graph, Twitter, and favicon tags.

Crawler files:

- `robots.txt`
- `sitemap.xml`

After deployment, submit this sitemap in Google Search Console:

```txt
https://mulaykal.templediary.in/sitemap.xml
```

## Backup Recommendations

Keep backups of:

- `cloudflare-data-worker.js`
- latest exported `data.js`
- Cloudflare KV `templeData`
- R2 media bucket contents or at least a media URL list

Recommended routine:

1. After major admin edits, click **Download data.js**.
2. Store the downloaded file with a date, for example `backup-data-2026-05-30.js`.
3. Keep Worker code changes in git.
4. Before changing Worker bindings or secrets, export the current Cloudflare Worker settings.

## Deployment Notes

When deploying:

- Upload all static files to the hosting target.
- Ensure `favicon.ico`, `output.png`, `og-image.png`, `robots.txt`, and `sitemap.xml` are at the site root.
- Keep admin pages deployed only if password/token access remains required.
- Ensure Worker CORS allows the public domain.
- Ensure `CLOUDFLARE_API_URL` in `js/app.js` and `js/admin.js` points to the active Worker.

## Known Maintenance Notes

- `js/data.js` is referenced by public/admin pages but is not currently in the repo.
- `admin.html` sidebar text says the website reads live data from `/js/data.js`; the current implementation actually fetches live data from the Worker first.
- `hero_mahavishnu_mobile2.png` exists as an untracked/extra image candidate; confirm whether it should be kept before deployment.
