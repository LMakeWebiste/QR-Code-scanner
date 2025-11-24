# Gemini QR Lens

A smart QR code and barcode scanner powered by Google's Gemini 2.5 Flash model. It scans codes, identifies products, checks link safety, and uses Google Search Grounding to find real-time product details.

## Features

*   **Multi-Format Scanning**: Supports QR, UPC, EAN, Code 128, Data Matrix, Aztec, PDF417, and more.
*   **Gemini AI Analysis**: Automatically searches the internet for scanned content.
*   **Product Identification**: Finds product names, brands, and details for barcodes.
*   **Safety Checks**: Indicators for safe, suspicious, or dangerous URLs.
*   **Flashlight Support**: Toggle torch for low-light environments.
*   **History**: Keeps track of your recent scans and their AI analysis.

## Setup & Installation

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    Create a `.env` file in the root directory and add your Google Gemini API key:
    ```
    VITE_API_KEY=your_google_api_key_here
    ```
    *Note: You must get a paid API key or a free tier key from [Google AI Studio](https://aistudio.google.com/).*

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Build for Production

```bash
npm run build
```

## How to Publish to GitHub Pages

1.  **Create a Repository**: Create a new repository on GitHub.
2.  **Push Code**:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -m main
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin main
    ```
3.  **Deploy**:
    ```bash
    npm run deploy
    ```
    This command will build your app and push it to a `gh-pages` branch.
4.  **Settings**: Go to your GitHub Repository Settings > Pages. Ensure the source is set to "Deploy from a branch" and select `gh-pages` / `(root)`.

## Technologies

*   React 19
*   TypeScript
*   Vite
*   Google GenAI SDK (`gemini-2.5-flash`)
*   @zxing/library (Barcode detection)
*   Tailwind CSS
*   Lucide React (Icons)
