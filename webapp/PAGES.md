# GitHub Pages

## One-time setup (required)

1. Open **Settings → Pages**  
   https://github.com/Justonejewelry/Chicas-Map/settings/pages
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Save

## Deploy

- Automatic on every push to `main` that touches `webapp/`
- Or: **Actions → Deploy Chicas Map webapp to GitHub Pages → Run workflow**

## URL

After the first successful run:

https://justonejewelry.github.io/Chicas-Map/

## Local

```bash
cd webapp && python3 -m http.server 8080
```
