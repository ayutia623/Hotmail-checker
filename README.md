# 🔍 Hotmail Inbox Checker

Modern web application for checking Hotmail/Outlook inbox with keyword search, multi-threading support, and proxy rotation.

## ✨ Features

- 🚀 **Multi-checking** - Check multiple accounts simultaneously with threading
- 🔍 **Keyword Search** - Search inbox for specific keywords (e.g., Riotgames, Roblox)
- 🌐 **Proxy Support** - Rotate proxies to avoid rate limiting
- 📸 **Capture Full** - Save complete inbox data and screenshots
- 📊 **Live Stats** - Real-time monitoring of checking progress
- 🎨 **Modern UI** - Beautiful dark theme with smooth animations
- 📱 **Responsive** - Works on mobile, tablet, and desktop

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Next.js API Routes
- **IMAP**: ImapFlow

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open browser**:
   ```
   http://localhost:3000
   ```

## 📝 Usage

1. **Upload Combo List** - Format: `email:password` (one per line)
2. **Enter Keywords** - Search terms separated by comma
3. **Configure Proxy** (optional) - Format: `host:port:user:pass`
4. **Start Checking** - Monitor live progress
5. **View Results** - See hits and full inbox details

## 🔧 Build

```bash
npm run build
npm start
```

## 📦 Project Structure

```
hotmail-checker/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Core logic and utilities
└── public/          # Static assets
```

## 📄 License

MIT License - See LICENSE file for details

## 👤 Author

Created by Ziver

---

**⚠️ Disclaimer**: This tool is for educational purposes only. Use responsibly and respect service terms.
