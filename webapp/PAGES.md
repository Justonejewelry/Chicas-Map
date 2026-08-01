# GitHub Pages

## One-time setup (required)

1. Open **Settings → Pages**  
   https://github.com/Justonejewelry/Project-YardBird/settings/pages
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Save

## Deploy

- Automatic on every push to `main` that touches `webapp/`
- Or: **Actions → Deploy YardBird webapp to GitHub Pages → Run workflow**

## URL

After the first successful run:

https://justonejewelry.github.io/Project-YardBird/

## Local

```bash
cd webapp && python3 -m http.server 8080
```
