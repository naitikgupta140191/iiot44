# Complete Deployment Guide

This guide breaks down exactly what settings you need to fill in on Render (for your backend) and Vercel (for your frontend). Since your code is already pushed to GitHub, we'll deploy directly from your repository!

---

## Part 1: Deploying the Backend on Render

The backend must be deployed first so we get the live API URL to paste into the frontend code.

1. Go to [Render.com](https://render.com) and sign in with your GitHub account.
2. Click the **"New +"** button at the top and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and click Next.
4. Connect your GitHub account (if prompted) and search for your repository: `7H-ANKUR/tata_sales-analysis`. Click **Connect**.
5. Fill in the deployment settings exactly as follows:

   - **Name**: `tata-motors-api` (or anything you prefer)
   - **Region**: Choose the one closest to you (e.g., Singapore or Frankfurt).
   - **Branch**: `main`
   - **Root Directory**: `ml/tata-backend` *(Very Important!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`

6. Scroll down to the **Instance Type** and select the **Free** tier.
7. Click **Create Web Service**.

Wait approximately 3-5 minutes for Render to install the Python packages and boot up the ML model. Once you see a message saying "Your service is live 🎉", **copy the URL located at the top left of your screen** (it will look something like `https://tata-motors-api-xyz.onrender.com`).

---

## Part 2: Deploying the Frontend on Vercel

Vercel handles everything else! We've utilized Vercel's Serverless architecture so you can securely pass your Render URL as an Environment Variable without exposing it in your GitHub code!

1. Go to [Vercel.com](https://vercel.com) and log in with your GitHub account.
2. From your dashboard, click **"Add New"** > **"Project"**.
3. Under the *Import Git Repository* section, find `tata_sales-analysis` and click **Import**.
4. Fill in the deployment settings exactly as follows:

   - **Project Name**: `tata-motors-platform`
   - **Framework Preset**: `Other`
   - **Root Directory**: Click "Edit", select `ml/tata-frontend`, and click **Continue**. *(Very Important!)*

5. Expand the **Environment Variables** section:
   - **Key**: `RENDER_BACKEND_URL`
   - **Value**: The Render URL you copied earlier! (e.g., `https://tata-motors-api-xyz.onrender.com`)
   - Click **Add**.

6. Click **Deploy**.

Vercel will quickly deploy your frontend and securely route your API endpoints. Click **Visit** to see your live, fully operational Tata Motors Sales Intelligence Platform!
