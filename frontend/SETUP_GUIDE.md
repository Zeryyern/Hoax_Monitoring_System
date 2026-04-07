# VSCode Setup Guide for Intelligent Hoax Monitoring System

This guide will help you set up and run this project in VSCode on your local machine.

---

## Important Notes (Windows)

- Run frontend scripts from **PowerShell** or **Command Prompt**. Some Git Bash setups can fail running Vite with `fatal error - couldn't create signal pipe (Win32 error 5)`.
- The backend API does **not** auto-reload code changes (`use_reloader=False`). If you edit backend Python files (especially `Hoax_Monitoring/api.py`), stop and restart the backend process to apply the changes.

## Prerequisites

Before you start, make sure you have these installed on your computer:

### 1. **Node.js** (Required)
- Download and install from: https://nodejs.org/
- **Recommended version:** Node.js 18 or higher
- This includes npm (Node Package Manager)

To verify installation, open terminal/command prompt and run:
```bash
node --version
npm --version
```

### 2. **pnpm** (Recommended Package Manager)
Install pnpm globally:
```bash
npm install -g pnpm
```

Verify installation:
```bash
pnpm --version
```

**Alternative:** You can use `npm` instead if you prefer, but pnpm is recommended for this project.

### 3. **Visual Studio Code (VSCode)**
- Download from: https://code.visualstudio.com/
- Install the latest version

### 4. **Git** (Optional but recommended)
- Download from: https://git-scm.com/
- Used for version control

---

## Project Setup Steps

### Step 1: Create Project Folder
1. Create a new folder on your computer (e.g., `hoax-monitoring-system`)
2. Copy ALL files from this Figma Make project into that folder

Your folder structure should look like this:
```
hoax-monitoring-system/
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── styles/
├── package.json
├── vite.config.ts
├── postcss.config.mjs
└── tsconfig.json (you'll need to create this)
```

### Step 2: Create Missing Configuration Files

#### A. Create `tsconfig.json` in the root folder:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### B. Create `tsconfig.node.json` in the root folder:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

#### C. Create `index.html` in the root folder:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Intelligent Hoax Monitoring & Analysis System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

#### D. Create `src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.tsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

#### E. Update `package.json` to add the dev script:
Add these lines to the "scripts" section:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

Also add React dependencies if not present:
```json
"dependencies": {
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

### Step 3: Install Dependencies

Open VSCode and open your project folder:
1. Open VSCode
2. File → Open Folder → Select your project folder
3. Open the integrated terminal (Terminal → New Terminal or Ctrl + `)

Install all dependencies:

**If using pnpm (recommended):**
```bash
pnpm install
```

**If using npm:**
```bash
npm install
```

This will download all required packages. It may take a few minutes.

### Step 4: Run the Development Server

Start the development server:

**If using pnpm:**
```bash
pnpm dev
```

**If using npm:**
```bash
npm run dev
```

You should see output like:
```
VITE v6.3.5  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 5: Open in Browser

Open your web browser and go to:
```
http://localhost:5173
```

You should see your Hoax Monitoring System running!

---

## Recommended VSCode Extensions

Install these extensions for better development experience:

1. **ES7+ React/Redux/React-Native snippets** - Code snippets
2. **Prettier - Code formatter** - Auto-format code
3. **ESLint** - Code linting
4. **Tailwind CSS IntelliSense** - Tailwind autocomplete
5. **Path Intellisense** - File path autocomplete
6. **Auto Rename Tag** - Rename HTML/JSX tags
7. **Better Comments** - Enhanced comments

To install extensions:
- Click Extensions icon in left sidebar (or Ctrl+Shift+X)
- Search for extension name
- Click Install

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@/app/...'"
**Solution:** Make sure `tsconfig.json` has the correct path alias:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

### Issue 2: Port 5173 already in use
**Solution:** Stop other Vite projects or use a different port:
```bash
pnpm dev --port 3000
```

### Issue 3: "pnpm/npm command not found"
**Solution:** 
- Restart VSCode after installing Node.js/pnpm
- Make sure Node.js is in your system PATH

### Issue 4: Styles not loading
**Solution:** 
- Check that `src/styles/index.css` exists
- Verify it's imported in `src/main.tsx`
- Clear browser cache (Ctrl+Shift+R)

---

## Building for Production

To create a production build:

**If using pnpm:**
```bash
pnpm build
```

**If using npm:**
```bash
npm run build
```

This creates a `dist` folder with optimized files ready for deployment.

To preview the production build:
```bash
pnpm preview
# or
npm run preview
```

---

## Project Structure

```
hoax-monitoring-system/
├── src/
│   ├── app/
│   │   ├── components/          # Reusable components
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── UserSidebar.tsx
│   │   ├── pages/              # Page components
│   │   │   ├── admin/          # Admin dashboard pages
│   │   │   ├── user/           # User dashboard pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── NewsPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── UserLoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   └── App.tsx             # Main app component
│   ├── styles/                 # CSS files
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   ├── theme.css
│   │   └── fonts.css
│   └── main.tsx                # Entry point
├── index.html                  # HTML template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
└── postcss.config.mjs          # PostCSS config
```

---

## Key Features of the System

### Public Pages (No Login Required)
- **Home:** Latest detected hoax articles from various sources
- **About:** System architecture and key features
- **News:** Browse and filter hoax articles
- **Login:** Separate login for Users and Admins
- **Signup:** User registration (requires admin approval)

### Admin Dashboard (Admin Login Required)
- **Dashboard:** Overview with statistics
- **Scraping Process:** Monitor and control web scraping, select specific sources
- **NLP Results:** View natural language processing analysis
- **Data Visualization:** Charts and graphs of hoax trends
- **User Management:** Approve/reject user registrations

### User Dashboard (User Login Required - View Only)
- **Overview:** System statistics (read-only)
- **News Monitoring:** View hoax articles (read-only)
- **Analytics:** View trends and analysis (read-only)
- **Profile:** Manage user profile

---

## Development Tips

1. **Hot Reload:** Changes are automatically reflected in the browser
2. **Clear Cache:** Use Ctrl+Shift+R if styles don't update
3. **Console Errors:** Check browser DevTools (F12) for errors
4. **TypeScript Errors:** VSCode shows TypeScript errors inline

---

## Next Steps

1. **Backend Integration:** Connect to a real backend API for data persistence
2. **Authentication:** Implement proper JWT authentication
3. **Database:** Set up PostgreSQL/MongoDB for storing hoax data
4. **Deployment:** Deploy to Vercel, Netlify, or your own server

---

## Support

If you encounter issues:
1. Check the error message in the terminal/browser console
2. Verify all dependencies are installed (`node_modules` folder exists)
3. Make sure all configuration files are created correctly
4. Restart the development server

---

**Good luck with your project! 🚀**
