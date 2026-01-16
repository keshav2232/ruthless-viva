# Hosting Guide for Ruthless Viva Simulator 🚀

Since this app has both a **Backend** (Node.js) and a **Frontend** (Next.js), you need to host them separately (but they will talk to each other).

We will use **Render** (free/cheap backend) and **Vercel** (free frontend).

## Part 1: Host the Backend (Server) on Render

1.  Push your latest code to GitHub (you just did this!).
2.  Go to [dashboard.render.com](https://dashboard.render.com/) and create a **New Web Service**.
3.  Connect your GitHub repository: `ruthless-viva`.
4.  **Configure Settings:**
    *   **Root Directory:** `server` (Important!)
    *   **Build Command:** `npm install`
    *   **Start Command:** `node server.js`
    *   **Instance Type:** Free (if available)
5.  **Environment Variables:**
    Scroll down to "Advanced" -> "Environment Variables" and add:
    *   `GEMINI_API_KEY`: (Your Gemini Key)
    *   `ELEVENLABS_API_KEY`: (Your ElevenLabs Key)
    *   `PORT`: `10000` (Render handles port, but good to set default)
6.  Click **Create Web Service**.
7.  **Wait for deployment.** Once done, Render will give you a URL (e.g., `https://ruthless-viva-server.onrender.com`). **Copy this URL.**

## Part 2: Host the Frontend (Client) on Vercel

1.  Go to [vercel.com](https://vercel.com/) and click "Add New..." -> **Project**.
2.  Import your GitHub repository: `ruthless-viva`.
3.  **Configure Project:**
    *   **Root Directory:** Click "Edit" and select `client`.
    *   **Framework Preset:** Next.js (should detect automatically).
4.  **Environment Variables:**
    Expand the "Environment Variables" section and add:
    *   `NEXT_PUBLIC_API_URL`: `https://ruthless-viva-server.onrender.com/api/viva`
    *(Paste the Render URL from Step 1, and make sure to append `/api/viva`)*
5.  Click **Deploy**.

## 🎉 Done!
Vercel will build your frontend and give you a final link (e.g., `https://ruthless-viva.vercel.app`).
Open that link, and your app is live!
