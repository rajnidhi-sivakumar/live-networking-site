# GitHub + Deployment in 10 Minutes

## 1. Create the repository

On GitHub, create a new **public** repository named:

`nexus-live-networking`

Do not add a README if GitHub gives you that option; this folder already has one.

## 2. Upload the files

Fastest method: drag the contents of this folder into the GitHub upload page.

Recommended structure:

```text
nexus-live-networking/
├── index.html
├── styles.css
├── app.js
├── README.md
├── .gitignore
└── docs/
    ├── VIDEO_SCRIPT.md
    ├── SUBMISSION_CHECKLIST.md
    └── GITHUB_AND_DEPLOY.md
```

## 3. Optional: use Git locally

```bash
git init
git add .
git commit -m "Build NEXUS live event networking prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nexus-live-networking.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## 4. Deploy with GitHub Pages

1. Open the repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/root` (the repository root), then save.
5. Wait for GitHub to publish the site.
6. Copy the published URL into the submission form.

Because this project has no build step, no Node.js setup is required.

## 5. Repository description

Paste this as the GitHub description:

> Live event networking app that helps attendees discover who to meet, why, and when — with explainable matching, live presence, connections, and organizer analytics.

## 6. One-line submission pitch

> NEXUS turns networking from a static attendee directory into a live, explainable conversation queue: who is here, who matches me, and why I should meet them.
