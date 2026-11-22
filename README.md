# FILEVIO — Your Files, Simplified.

FILEVIO is a browser-based online PDF and document utility platform featuring 21 tools for organizing, converting, optimizing, editing, signing, and securing documents directly on your device.

## Key Capabilities

- **PDF Organization**: Merge PDF, Split PDF, Organize PDF, Rotate PDF, Delete PDF Pages, Extract PDF Pages
- **PDF Conversion**: JPG to PDF, PNG to PDF, PDF to JPG, PDF to PNG, Word (.docx) to PDF, HTML to PDF
- **PDF Optimization**: Compress PDF (Lossless Structural, Balanced, Strong), Repair PDF
- **PDF Editing**: Add Page Numbers, Add Watermark (Text or Image), Sign PDF (Draw, Type, Upload), Edit PDF (Text, Highlight, Whiteout, Freehand Ink), Add Text to PDF
- **PDF Security**: Protect PDF with AES-256 Password, Unlock PDF (authorized password required)

## Privacy-First Architecture

All PDF parsing, page rendering, encryption, and document conversion execute locally in the browser using `@cantoo/pdf-lib`, `pdfjs-dist`, `jszip`, `mammoth`, and `html2canvas`. No documents or passwords are uploaded to external servers.

## Local Development

```bash
npm install
npm run dev
```

Run unit tests:

```bash
npx --yes tsx --test src/utils/pdfEngine.test.ts
```

Build for production:

```bash
npm run build
```

## Deploying to GitHub Pages

FILEVIO uses relative asset paths (`base: './'` in `vite.config.ts`) and hash-based routing (`HashRouter`) so page refreshes and deep links work out of the box on GitHub Pages (`https://<username>.github.io/<repo>/` or a custom domain).

### Option 1: GitHub Actions (Recommended)

1. Push this repository to GitHub.
2. In your GitHub repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy FILEVIO to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Option 2: Manual `dist/` Publish

```bash
npm run build
npx gh-pages -d dist
```
