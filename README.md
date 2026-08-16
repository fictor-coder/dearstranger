# Heartleak Vite project

This project runs the supplied `heartleak-prototype (2).jsx` unchanged as `src/App.jsx`.

## Included dependencies

- React 19
- Vite 8
- Tailwind CSS 4 (the prototype uses Tailwind utility classes)
- Lucide React (the prototype's icon library)

The prototype is otherwise self-contained: its logo is embedded in the JSX and it has no external stylesheet, image, API, or database dependency. Its posts, messages, profiles, moderation, and upload interactions are local demo state only, so data resets on refresh.

## Supabase connection

The project's URL and publishable key are stored locally in `.env.local`. That file is ignored by Git, so it will not be committed if this project is later pushed to GitHub.

Before anonymous accounts can be enabled in the app, turn on **Allow anonymous sign-ins** in the Supabase dashboard under **Authentication → Settings → General configuration**. Do not add a `service_role` or secret key to this project.

After pulling this project or changing its dependencies, install packages with:

```powershell
npm.cmd install --cache .npm-cache
```

On its first visit, HeartLeak now creates a private anonymous Supabase account for the visitor. The current UI still uses demonstration data; posts and chat will be moved to database tables next.

## Run locally on Windows PowerShell

```powershell
cd "C:\Users\admin\Documents\Codex\2026-08-14\referenced-chatgpt-conversation-this-is-an\outputs\heartleak-vite"
npm.cmd install
npm.cmd run dev
```

Use `npm.cmd`, rather than `npm`, because this computer's PowerShell policy blocks the `npm.ps1` launcher.
