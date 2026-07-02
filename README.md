High-precision motorsport starting light simulator project I made to learn advanced React state management and Firebase integration.

# F1 Reaction Test🏎️🚥
A high-performance React web application that simuulates an **F1 Starting grid**. It utilizes **React hooks**, a **local storage caching system**, and a **Firebase Firestore backend**, allowing for exact suub-millisecond reaction measurement and global real-time leaderboards. It includes 30 unique achievements and deep career analytics!

---

## 📂 Project Structure
```
F1_Reaction_Game/
└── f1-react/
    ├── node_modules/       # Dependencies
    ├── public/             # Static public assets
    ├── src/                
    │   ├── assets/         # Images, icons, and localized media
    │   ├── App.css         # Main application styles
    │   ├── App.jsx         # Core React component, state machine, & logic
    │   ├── index.css       # Tailwind directives & global styles
    │   └── main.jsx        # React entry point
    ├── .gitignore          # Git ignore rules for modules & env variables
    ├── .oxlintrc.json      # Linter configuration
    ├── index.html          # HTML root template
    ├── package-lock.json   # Exact dependency tree resolution
    ├── package.json        # Project metadata & npm scripts
    ├── postcss.config.js   # PostCSS config for Tailwind integration
    ├── README.md           # Project documentation
    ├── tailwind.config.js  # Tailwind CSS theme configuration
    └── vite.config.js      # Vite build and development configuration
```

---

## ⚙️ Features
* Connect to a **Global Real-Time Leaderboard** safely using Firebase Anonymous Authentication.
* Synchronize race times using the high-resolution `performance.now()` API for sub-millisecond percision.
* Switch seamlessly between **Competitive Mode** (recording your global times and streaks) and **Practice Mode** (featuring real time coaching tips on hold consistency).
* Switch between **11 Constructor Themes**, dynamically altering the application's UI and colors and assets to match your favorite racing team.
* **Smart State Logic:** Driven by a robust `useReducer` state machine, eliminating race conditions during high-speed tap inputs.
* Render deep analytics via a **Career Dashboard**, calculating Mean, Median, Win Rate, and Standard Deviations directly in the cliet.

---

## 🚀 How to Run
### 1. Clone this repository
```
git clone <https://github.com/SVerma2696/f1-reaction-game.git>
cd F1_Reaction_Game/f1-react
```

### 2. Install dependencies
Make sre you have Node.js installed, then run:
```
npm install
```

### 3. Configure Firebase safely
Create a `.env` file in the root of the `f1-react directory` and enter your firebase configurate:
```
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
```

### 4. Build and run the development server
```
npm run dev
```
*(Note: Open the provided localhost link in your browser to start racing).*

---

## 🔌 System Integrations (Data Flow)
### Persistent Storage
```
State Metrics (StdDev, Avg) -> React State (App.jsx)
Local High Scores         -> Browser LocalStorage (f1_pb, f1_full_history)
Achievements Unlocked     -> Browser LocalStorage (f1_achievements)
```

### Database Sync
**Note:** Global reads are strictly limited via bounded queries to optimize bandwidth.
```
Local Reaction Time (<= 0.000s) -> Firestore Document (f1_leaderboard/{uid})
Global Top 10 Times             <- Firestore Real-Time Snapshot Listener
```

---

## 📘 Concepts Demonstrated
* Modern **React Hooks** (`useRedcer`, `useMemo`, `useCallback`, `useRef`)
* **Atomic State Management** ensuring race condition safely during high-frequency I/O.
* **Debouncing & Memorization** to prevent ununecessary re-enders in heavy statistical UI components.
* **High-Resolution Time Mathematics** in Javascript (Calculating Standard Deviation for consistency tracking).
* Basic **NoSQL Database Architecture** (Firebase Firestore reads/writes & anonymous auth)
* **Response UUUI/UX design** using Tailwind CSS

---

## 🔧 Requirements
* Node.js (v16.0.0+)
* npm package manager
* A modern web browser (Chrome, Firefox, Safari, Edge)
* A Firebase Project (for Leaderboard functionality)

---

## 🎓 Credits & Professional Attributions
This project was developed strictly for educational purposes and portfolio demonstration. All trademarked entities, branding, and respective media remain the exclusive property of their creators and organizations (e.g., the FIA, Formula 1). Visual assets have been respectfully sourced from the following professional publications:

* **Application Iconography:**
    * Source (F1 Start Timer Blog): https://f1starttimer.blog/
    * Asset URL: https://f1starttimer.blog/static/logo.png

* **Formula 1 Driver Tier:**
    * Source (Performance Racing / FIA): https://www.performanceracing.com/magazine/industry-news/09-16-2025/formula-1-fia-announce-2026-sprint-calendar
    * Asset URL: https://www.performanceracing.com/sites/default/files/styles/article_full/public/2025-09/F1-1410x790.jpg?itok=jkdw4Oie

* **Formula 2 Driver Tier:**
    * Source (Brands of the World / FIA): https://www.brandsoftheworld.com/logo/f2-2026
    * Asset URL: https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/062026/f2_2026.png?RtCF4q9_tdBZEy_1xdn3uQLeEvB35d2i&itok=iXwm23zU

* **Formula 3 Driver Tier:**
    * Source (Brands of the World / FIA): https://www.brandsoftheworld.com/logo/f3-2026
    * Asset URL: https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/062026/f3_2026.png?JlwnBHyAQohh5EZ5Fgr1.RKqPLbGRoO5&itok=QfqAYMor

* **Karting Star Tier:**
    * Source (Adobe Stock): https://stock.adobe.com/search? k=karting+logo
    * Asset URL: https://t4.ftcdn.net/jpg/04/38/89/23/360_F_438892395_rBFn1ok5VpKxI9Qc3cP1ggypplEBkcJS.jpg

* **Safety Car Tier:**
    * Source (GPFans): https://www.gpfans.com/en/f1-news/102658/f1-safety-car/
    * Asset URL: https://sportsbase.io/images/gpfans/copy_1200x800/42b6f1e9703e455cb7c9630fed06f4ccd0fbe1bd.jpg