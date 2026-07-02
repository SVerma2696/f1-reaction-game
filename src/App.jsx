import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { Trophy, Edit2, Check, Info, Moon, Sun, Monitor, Target, Activity, Flame, Medal, X, Play, Loader2, BarChart2, Share2, Award, History } from 'lucide-react';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, increment, query, orderBy, limit } from 'firebase/firestore';


// ==========================================
// 1. UTILITIES & CONFIGURATION
// ==========================================

/*
 * Environment-driven Firebase configuration.
 * We initialize them securely without strict module meta references to ensure broad compatibility.
 */
const firebaseConfig = {
  apiKey: typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_API_KEY || '' : '',
  authDomain: typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_AUTH_DOMAIN || '' : '',
  projectId: typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_PROJECT_ID || '' : '',
  storageBucket: typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_STORAGE_BUCKET || '' : '',
  messagingSenderId: typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '' : '',
  appId: typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_APP_ID || '' : ''
};

/*
 * Safe Initialization Block
 * We execute this immediately to guarantee `app`, `db`, and `auth` are defined in the 
 * global scope before React's component tree mounts. This fixes the ReferenceError crashes.
 */
const initFirebase = () => {
  try {
    const initializedApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return { 
      app: initializedApp, 
      db: getFirestore(initializedApp), 
      auth: getAuth(initializedApp) 
    };
  } catch (error) {
    console.warn("Firebase initialization failed. Running gracefully in offline mode.");
    return { app: null, db: null, auth: null };
  }
};

const { app, db, auth } = initFirebase();


/* 
 * Constructor Selection Data
 * This dictionary maps racing teams to their brand colors and Tailwind CSS classes.
 * It is heavily utilized throughout the UI to dynamically theme buttons and text.
 */
const CONSTRUCTORS = {
  'Ferrari': { color: '#ef4444', class: 'bg-red-600', hover: 'hover:bg-red-500', textClass: 'text-white' },
  'Mercedes': { color: '#00d2be', class: 'bg-[#00d2be]', hover: 'hover:bg-[#00b5a3]', textClass: 'text-black' },
  'Red Bull': { color: '#1e3a8a', class: 'bg-blue-900', hover: 'hover:bg-blue-800', textClass: 'text-white' },
  'McLaren': { color: '#f97316', class: 'bg-orange-500', hover: 'hover:bg-orange-400', textClass: 'text-black' },
  'Aston Martin': { color: '#00665e', class: 'bg-[#00665e]', hover: 'hover:bg-[#004f48]', textClass: 'text-white' },
  'Alpine': { color: '#0090ff', class: 'bg-blue-500', hover: 'hover:bg-blue-400', textClass: 'text-white' },
  'Williams': { color: '#00a0de', class: 'bg-[#00a0de]', hover: 'hover:bg-[#008cc2]', textClass: 'text-white' },
  'Haas': { color: '#e6002b', class: 'bg-slate-800', hover: 'hover:bg-slate-700', textClass: 'text-white' },
  'Audi': { color: '#f50537', class: 'bg-[#f50537]', hover: 'hover:bg-[#d60430]', textClass: 'text-white' },
  'Racing Bulls': { color: '#1534cc', class: 'bg-blue-700', hover: 'hover:bg-blue-600', textClass: 'text-white' },
  'Cadillac': { color: '#d4af37', class: 'bg-[#d4af37]', hover: 'hover:bg-[#b5952f]', textClass: 'text-black' }
};

/*
 * The Comprehensive Achievement Dictionary (30 Milestones)
 * We strictly use String emojis for the 'icon' property to ensure React never tries 
 * to render a raw Object, preventing the "Objects are not valid as a React child" error.
 */
const ACHIEVEMENT_DEFS = [
  // --- Volume Milestones ---
  { id: 'first_race', icon: '🏁', name: 'First Race', desc: 'Complete your first valid sequence.' },
  { id: 'races_10', icon: '🥉', name: 'Rookie', desc: 'Complete 10 valid races.' },
  { id: 'races_50', icon: '🥈', name: 'Veteran', desc: 'Complete 50 valid races.' },
  { id: 'races_100', icon: '🥇', name: 'Centurion', desc: 'Complete 100 valid races.' },
  { id: 'races_250', icon: '✈️', name: 'Frequent Flyer', desc: 'Complete 250 valid races.' },
  { id: 'races_500', icon: '💉', name: 'Addict', desc: 'Complete 500 valid races.' },
  { id: 'races_1000', icon: '👑', name: 'Legend', desc: 'Complete 1,000 valid races.' },
  
  // --- Speed Targets ---
  { id: 'speed_350', icon: '🥱', name: 'Waking Up', desc: 'React faster than 350ms.' },
  { id: 'speed_300', icon: '🏃', name: 'Warming Up', desc: 'React faster than 300ms.' },
  { id: 'speed_250', icon: '🏎️', name: 'F2 Reflexes', desc: 'React faster than 250ms.' },
  { id: 'speed_200', icon: '⚡', name: 'F1 Reflexes', desc: 'React faster than 200ms.' },
  { id: 'speed_180', icon: '🍾', name: 'Podium Pace', desc: 'React faster than 180ms.' },
  { id: 'speed_150', icon: '👽', name: 'Alien Speed', desc: 'React faster than 150ms.' },

  // --- Consistency Streaks ---
  { id: 'streak_5', icon: '🔥', name: 'Hot Streak', desc: 'Complete 5 valid races in a row.' },
  { id: 'streak_10', icon: '🚂', name: 'Unstoppable', desc: 'Complete 10 valid races in a row.' },
  { id: 'streak_25', icon: '💎', name: 'Flawless', desc: 'Complete 25 valid races in a row.' },
  { id: 'streak_50', icon: '🤖', name: 'The Machine', desc: 'Complete 50 valid races in a row.' },

  // --- Mistakes & Fails ---
  { id: 'fail_1', icon: '🚫', name: 'Jump Start', desc: 'Commit your first false start.' },
  { id: 'fail_10', icon: '😤', name: 'Impatient', desc: 'Commit 10 total false starts.' },
  { id: 'fail_50', icon: '🐿️', name: 'Eager Beaver', desc: 'Commit 50 total false starts.' },
  { id: 'slow_1000', icon: '😴', name: 'Sleeper', desc: 'React slower than 1 full second.' },

  // --- Edge Cases & Special Conditions ---
  { id: 'close_call', icon: '📸', name: 'Photo Finish', desc: 'React between 0.000s and 0.050s.' },
  { id: 'night_owl', icon: '🦉', name: 'Night Owl', desc: 'Complete a race between midnight and 4 AM.' },
  { id: 'early_bird', icon: '🌅', name: 'Early Bird', desc: 'Complete a race between 4 AM and 8 AM.' },
  
  // --- Practice & Patience ---
  { id: 'practice_1', icon: '📋', name: 'Practice Run', desc: 'Complete a practice mode race.' },
  { id: 'practice_10', icon: '🏋️', name: 'Drills', desc: 'Complete 10 practice mode races.' },
  { id: 'patience_2500', icon: '🧊', name: 'Ice in the Veins', desc: 'Wait out a 2.5s+ hold delay and react < 250ms.' },
  
  // --- Statistical Consistency ---
  { id: 'consistency_50', icon: '📊', name: 'Consistent', desc: 'Hold a deviation under 50ms for 10 races.' },
  { id: 'consistency_20', icon: '⏱️', name: 'Metronome', desc: 'Hold a deviation under 20ms for 10 races.' },
  { id: 'session_20', icon: '🧘', name: 'In the Zone', desc: 'Complete 20 races in a single active session.' },
];


/* 
 * Tier Calculation function.
 * Evaluates the user's reaction time and assigns a gamified rank. 
 */
const getLevel = (time) => {
  if (time === null || time === undefined) return { name: 'Unranked', img: 'https://sportsbase.io/images/gpfans/copy_1200x800/42b6f1e9703e455cb7c9630fed06f4ccd0fbe1bd.jpg', desc: 'Complete a valid race to rank up.', color: 'text-gray-500' };
  if (time < 0.200) return { name: 'F1 Driver', img: 'https://www.performanceracing.com/sites/default/files/styles/article_full/public/2025-09/F1-1410x790.jpg?itok=jkdw4Oie', desc: 'Alien reflexes! You belong on the grid.', color: 'text-red-500' };
  if (time < 0.250) return { name: 'F2 Driver', img: 'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/062026/f2_2026.png?RtCF4q9_tdBZEy_1xdn3uQLeEvB35d2i&itok=iXwm23zU', desc: 'Ready for the big leagues.', color: 'text-orange-500' };
  if (time < 0.300) return { name: 'F3 Driver', img: 'https://d1yjjnpx0p53s8.cloudfront.net/styles/logo-thumbnail/s3/062026/f3_2026.png?JlwnBHyAQohh5EZ5Fgr1.RKqPLbGRoO5&itok=QfqAYMor', desc: 'Solid reflexes. Keep pushing.', color: 'text-yellow-500' };
  if (time < 0.400) return { name: 'Karting Star', img: 'https://t4.ftcdn.net/jpg/04/38/89/23/360_F_438892395_rBFn1ok5VpKxI9Qc3cP1ggypplEBkcJS.jpg', desc: 'Good start, but room to improve.', color: 'text-green-500' };
  return { name: 'Safety Car', img: 'https://sportsbase.io/images/gpfans/copy_1200x800/42b6f1e9703e455cb7c9630fed06f4ccd0fbe1bd.jpg', desc: 'Pacing the field today.', color: 'text-gray-500' };
};

/* 
 * Number formatter
 * Takes the raw mathematical time and pads it with zeroes to simulate a real stopwatch (e.g. 0.123).
 */
const formatTime = (time) => {
  if (time === null || time === undefined) return '--.---';
  return (time < 0 ? '-' : '') + Math.abs(time).toFixed(3).padStart(5, '0');
};

/* 
 * Mathematical variance calculator.
 * Computes the Standard Deviation of an array to measure the user's precision/consistency.
 */
const calculateStdDev = (arr) => {
  const valid = arr.filter(t => t > 0);
  if (valid.length < 2) return 0.000;
  const mean = valid.reduce((sum, time) => sum + time) / valid.length;
  const variance = valid.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / valid.length;
  return Math.sqrt(variance);
};

/* 
 * Contextual coaching system.
 * Looks at the user's latest run and offers advice based on speed and standard deviation.
 */
const getPracticeTip = (reactionTime, stdDev) => {
  if (reactionTime < 0) return "You jumped the gun! The hold delay is random (0.2s - 3.0s). Wait for all 5 lights to go out.";
  if (reactionTime < 0.200) return "Incredible speed! Focus on maintaining this sub-200ms time to keep your consistency tight.";
  if (reactionTime > 0.350) return "A bit slow. Don't overthink it, just react the instant the 5th light goes dark.";
  if (stdDev > 0.050) return "Good speed, but your times are fluctuating. Build muscle memory for the tap to improve consistency.";
  return "Solid reaction! Try to shave off a few more milliseconds while keeping your consistency tight.";
};

/* 
 * Audio Context Management 
 * Web browsers block audio playback until the user physically interacts with the page.
 * This function creates the context securely within a click handler.
 */
let audioCtx = null;
const initAudio = () => {
  if (typeof window !== 'undefined' && !audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try { 
        audioCtx = new AudioContextClass(); 
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        gain.gain.value = 0; osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(0); osc.stop(audioCtx.currentTime + 0.001);
      } catch (e) {}
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
};

/* 
 * Audio Synthesizer
 * Generates the short "beeps" synchronously with the visual light updates using oscillators.
 */
const playBeep = (type = 'light') => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = type === 'go' ? 'sine' : 'square';
  osc.frequency.setValueAtTime(type === 'go' ? 800 : 400, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.1);
};


// ==========================================
// 2. STATE MACHINE
// ==========================================

/*
 * The fundamental states our game can be in.
 * IDLE: Waiting to begin.
 * SEQUENCE: Lights are currently turning on or waiting for the random hold.
 * READY: Lights just went out, waiting for user input.
 * JUMP_START: User clicked too early.
 * FINISHED: User successfully completed the race.
 */
const initialGameState = {
  status: 'IDLE', 
  litCount: 0,
  reactionTime: null,
  jumpPenalty: null,
  holdTime: null,
  streak: 0
};

/* STREAMING_CHUNK:Defining the Reducer state machine for accurate sequencing... */
/*
 * The central reducer orchestrating state transitions.
 * By using a reducer instead of multiple useState hooks, we eliminate race conditions
 * and ensure that the state updates perfectly atomically during high-speed actions.
 */
function gameReducer(state, action) {
  switch (action.type) {
    case 'START_SEQUENCE':
      return { ...state, status: 'SEQUENCE', litCount: 0, reactionTime: null, jumpPenalty: null, holdTime: action.payload };
    case 'SET_LIT_COUNT':
      return { ...state, litCount: action.payload };
    case 'LIGHTS_OUT':
      return { ...state, status: 'READY', litCount: 0 };
    case 'FALSE_START':
      return { ...state, status: 'JUMP_START', jumpPenalty: action.payload, litCount: 0, streak: 0 };
    case 'FINISH':
      // Practice mode does not increment your global competitive streak
      return { ...state, status: 'FINISHED', reactionTime: action.payload.time, streak: action.payload.isPractice ? 0 : state.streak + 1 };
    case 'RESET':
      return { ...initialGameState, streak: state.streak }; 
    default:
      return state;
  }
}


// ==========================================
// 3. SUB-COMPONENTS
// ==========================================

/* Simple SVG Path for the GitHub repository link in the header */
const GithubIcon = ({className}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
);

/* Vector graphic of a Formula 1 car, dynamically colored based on the user's Constructor choice */
const F1CarIcon = ({ className, color = "currentColor" }) => (
  <svg className={className} viewBox="0 0 100 40" fill="currentColor" style={{ color }} xmlns="http://www.w3.org/2000/svg">
    <path d="M 5 8 H 13 V 23 H 5 Z" />
    <path d="M 11 23 L 15 11 Q 25 9 35 15 L 42 9 H 48 Q 53 17 63 20 L 89 23 Q 94 24 97 27 V 31 H 11 Z" />
    <circle cx="26" cy="28" r="9" />
    <circle cx="78" cy="28" r="9" />
  </svg>
);

/* STREAMING_CHUNK:Rendering the Theme Dropdown Component... */
/* 
 * Dropdown Menu for toggling between Light Mode, Dark Mode, and System Default.
 * Memoized to prevent unnecessary re-renders during high-frequency racing updates.
 */
const ThemeToggleMenu = React.memo(({ themePref, isDark, showThemeMenu, setShowThemeMenu, handleThemeSelect }) => (
  <div className="relative">
    <button onClick={() => setShowThemeMenu(!showThemeMenu)} aria-expanded={showThemeMenu} aria-label="Toggle theme menu" className={`p-2.5 sm:p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} title="Theme Settings">
      {themePref === 'dark' ? <Moon className="w-5 h-5" /> : themePref === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
    </button>
    {showThemeMenu && (
      <>
        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowThemeMenu(false)}></div>
        <div className={`absolute right-0 mt-2 w-52 rounded-xl shadow-lg border overflow-hidden z-50 transition-all ${isDark ? 'bg-gray-900 border-gray-700 shadow-black' : 'bg-white border-gray-200'} animate-in fade-in zoom-in-95 duration-100`}>
          <div className={`px-4 py-2 border-b text-xs font-semibold uppercase tracking-wider ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>Theme</div>
          <button onClick={() => handleThemeSelect('system')} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${themePref === 'system' ? (isDark ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700')}`}><Monitor className="w-4 h-4" /> Match System</button>
          <button onClick={() => handleThemeSelect('light')} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${themePref === 'light' ? (isDark ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700')}`}><Sun className="w-4 h-4" /> Light</button>
          <button onClick={() => handleThemeSelect('dark')} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors ${themePref === 'dark' ? (isDark ? 'bg-gray-800 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-100 text-gray-700')}`}><Moon className="w-4 h-4" /> Dark</button>
        </div>
      </>
    )}
  </div>
));

/* 
 * Celebratory particle generator. 
 * Fires briefly when the user breaks their personal best time.
 */
const Confetti = React.memo(({ active }) => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (active) {
      setParticles(Array.from({ length: 40 }).map((_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, angle: Math.random() * 360, delay: Math.random() * 0.2 })));
      const timer = setTimeout(() => setParticles([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [active]);
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div key={p.id} className="absolute top-1/2 left-1/2 text-2xl animate-confetti" style={{ '--tx': `${Math.cos(p.angle) * 200}px`, '--ty': `${Math.sin(p.angle) * 200 - 100}px`, animationDelay: `${p.delay}s`, transform: `translate(-50%, -50%)` }}>🎉</div>
      ))}
    </div>
  );
});

/* STREAMING_CHUNK:Styling the Grid Lights component... */
/* 
 * The visual representation of the starting grid lights.
 * Scales dynamically based on the viewport using specialized Tailwind queries.
 */
const Gantry = React.memo(({ litCount, isDark }) => {
  const housingDark = 'bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#0a0a0a] border-[#333] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.8)]';
  const housingLight = 'bg-gradient-to-b from-[#3a3a3a] via-[#2a2a2a] to-[#1a1a1a] border-[#444] shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.4)]';
  const pillarDark = 'bg-gradient-to-r from-[#1a1a1a] via-[#2a2a2a] to-[#111] border-[#333] shadow-inner';
  const pillarLight = 'bg-gradient-to-r from-[#2a2a2a] via-[#3a3a3a] to-[#1a1a1a] border-[#444] shadow-inner';

  return (
    <div className={`foldable-gantry relative p-2 min-[350px]:p-3 sm:p-5 rounded-2xl md:rounded-3xl flex gap-1 min-[350px]:gap-2 sm:gap-5 border-[3px] sm:border-4 transition-colors duration-300 ${isDark ? housingDark : housingLight}`}>
      <div className="absolute top-1/2 left-0 w-full h-2 sm:h-3 bg-black/90 -translate-y-1/2 z-0 shadow-inner"></div>
      {[1, 2, 3, 4, 5].map((col) => {
        const isOn = litCount >= col;
        return (
          <div key={col} className={`flex flex-col gap-1 min-[350px]:gap-2 sm:gap-3 z-10 p-1.5 min-[350px]:p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-colors ${isDark ? pillarDark : pillarLight}`}>
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className={`w-6 h-6 min-[350px]:w-8 min-[350px]:h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full transition-all duration-75 ${isOn ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,1),inset_0_0_10px_rgba(255,255,255,0.4)] sm:shadow-[0_0_25px_rgba(220,38,38,1),inset_0_0_15px_rgba(255,255,255,0.4)]' : 'bg-[#111] shadow-[inset_0_3px_5px_rgba(0,0,0,0.8)] border-[1.5px] sm:border-2 border-black/80'}`}></div>
            ))}
          </div>
        );
      })}
    </div>
  );
});

/* STREAMING_CHUNK:Building the massive Dashboard modal with deep analytics... */
/* 
 * Dashboard Component
 * An expanded analytical view providing the user with detailed statistics about their play history.
 * Aggregates all lifetime history arrays to display metrics like win rate and consistency.
 */
const DashboardModal = React.memo(({ isOpen, onClose, isDark, fullHistory, falseStarts }) => {
  if (!isOpen) return null;
  
  // Filter out any negative times representing false starts to ensure averages are strictly mathematically sound
  const validHistory = fullHistory.filter(t => t > 0);
  
  // Mathematical derivations for the expanded stat grid
  const pb = validHistory.length ? Math.min(...validHistory) : null;
  const worst = validHistory.length ? Math.max(...validHistory) : null;
  const avg = validHistory.length ? validHistory.reduce((a, b) => a + b, 0) / validHistory.length : 0;
  
  const sorted = [...validHistory].sort((a, b) => a - b);
  const median = sorted.length ? (sorted.length % 2 === 0 ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 : sorted[Math.floor(sorted.length/2)]) : 0;
  const best5 = sorted.slice(0, 5);
  const recent5 = [...validHistory].reverse().slice(0, 5); // Grabs the 5 most recent runs
  const winRate = fullHistory.length ? ((validHistory.length / (fullHistory.length + falseStarts)) * 100).toFixed(1) : 0;
  const stdDev = validHistory.length > 1 ? calculateStdDev(validHistory) : null;

  // Sorting valid reactions into buckets for the CSS-based dynamic histogram graphic
  const buckets = { '<200ms': 0, '200-250ms': 0, '250-300ms': 0, '300-350ms': 0, '>350ms': 0 };
  validHistory.forEach(t => {
    if (t < 0.2) buckets['<200ms']++;
    else if (t < 0.25) buckets['200-250ms']++;
    else if (t < 0.3) buckets['250-300ms']++;
    else if (t < 0.35) buckets['300-350ms']++;
    else buckets['>350ms']++;
  });
  
  // Calculates the highest density bucket to perfectly scale the CSS width percentages relative to 100%
  const maxBucket = Math.max(...Object.values(buckets), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in no-game-click">
      <div className={`w-full max-w-3xl p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-3 sm:p-2 hover:bg-gray-500/20 rounded-full transition-colors z-10"><X className="w-5 h-5" /></button>
        
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b pb-4 border-gray-500/20"><BarChart2 className="text-blue-500" /> Career Dashboard</h2>
        
        {/* Expanded 8-Stat Grid showing deep analytics now that achievements have their own page */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Personal Best</span>
            <span className={`text-lg sm:text-xl font-mono font-bold ${pb ? 'text-yellow-500' : ''}`}>{formatTime(pb)}</span>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Average</span>
            <span className="text-lg sm:text-xl font-mono font-bold">{formatTime(avg)}</span>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Median</span>
            <span className="text-lg sm:text-xl font-mono font-bold">{formatTime(median)}</span>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Win Rate</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-green-500">{winRate}%</span>
          </div>
          
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Total Races</span>
            <span className="text-lg sm:text-xl font-mono font-bold">{validHistory.length}</span>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">False Starts</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-red-500">{falseStarts}</span>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Consistency</span>
            <span className="text-lg sm:text-xl font-mono font-bold">{stdDev !== null ? `±${stdDev.toFixed(3)}s` : '--.---'}</span>
          </div>
          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1">Worst Time</span>
            <span className="text-lg sm:text-xl font-mono font-bold">{formatTime(worst)}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 mb-4">
          {/* Reaction Distribution Graph */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Activity className="w-4 h-4"/> Reaction Distribution</h3>
            <div className="flex flex-col gap-2">
              {Object.entries(buckets).map(([label, count]) => (
                <div key={label} className="flex items-center gap-3 text-xs font-mono">
                  <div className="w-20 text-right text-gray-500">{label}</div>
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    {/* The bar width dynamically scales relative to the most populated bucket */}
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(count/maxBucket)*100}%` }}></div>
                  </div>
                  <div className="w-8 font-bold">{count}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
             <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Flame className="w-4 h-4"/> Fastest 5</h3>
             <div className="flex flex-wrap gap-2 mb-6">
                {best5.length ? best5.map((t, i) => <span key={`best-${i}`} className={`px-2 py-1 rounded border shadow-sm font-mono text-sm ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>{formatTime(t)}</span>) : <span className="text-sm text-gray-500">No races yet.</span>}
             </div>

             <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><History className="w-4 h-4"/> Recent Form</h3>
             <div className="flex flex-wrap gap-2">
                {recent5.length ? recent5.map((t, i) => <span key={`recent-${i}`} className={`px-2 py-1 rounded border shadow-sm font-mono text-sm ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>{formatTime(t)}</span>) : <span className="text-sm text-gray-500">No races yet.</span>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/* STREAMING_CHUNK:Constructing the Dedicated Achievements Modal... */
/* 
 * Dedicated Achievements Page.
 * Renders the massive 30-item badge collection in a scrollable, responsive grid.
 * Badges that the user has unlocked are brightly lit, while locked badges remain grayscaled.
 */
const AchievementsModal = React.memo(({ isOpen, onClose, isDark, achievements }) => {
  if (!isOpen) return null;
  
  const unlockedCount = achievements.length;
  const totalCount = ACHIEVEMENT_DEFS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in no-game-click">
      <div className={`w-full max-w-4xl p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-3 sm:p-2 hover:bg-gray-500/20 rounded-full transition-colors z-10"><X className="w-5 h-5" /></button>
        
        <div className="flex items-center justify-between border-b pb-4 border-gray-500/20 mb-6 pr-10">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Award className="text-yellow-500 w-7 h-7" /> Achievements</h2>
          <span className="font-mono text-sm font-bold bg-gray-500/10 px-3 py-1 rounded-full border border-gray-500/20 shadow-inner">{unlockedCount} / {totalCount}</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACHIEVEMENT_DEFS.map(a => {
            const unlocked = achievements.includes(a.id);
            return (
              <div key={a.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${unlocked ? (isDark ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]' : 'bg-yellow-50 border-yellow-200 text-yellow-800 shadow-sm') : (isDark ? 'bg-gray-800/30 border-gray-800 text-gray-600 grayscale opacity-60' : 'bg-gray-50 border-gray-200 text-gray-400 grayscale opacity-60')}`}>
                 {/* The icon is guaranteed to be a string emoji, avoiding any Object rendering errors */}
                 <span className="text-3xl drop-shadow-sm flex-shrink-0 w-10 text-center">{a.icon}</span>
                 <div className="flex flex-col min-w-0">
                   <span className="text-sm font-bold leading-none mb-1.5 truncate">{a.name}</span>
                   <span className="text-[10px] sm:text-xs opacity-90 leading-snug">{a.desc}</span>
                 </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
});

/* STREAMING_CHUNK:Preparing the Leaderboard and About components... */
/* Modal component displaying the global top 10 leaderboard, user ranking, and account name editing functionality. */
const LeaderboardModal = React.memo(({ isOpen, onClose, user, currentUsername, onUpdateUsername, isDark, allScores }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUsername);
  const [filter, setFilter] = useState('all');

  useEffect(() => { setEditName(currentUsername); }, [currentUsername]);

  const handleSaveName = useCallback(() => {
    if (editName.trim()) {
      onUpdateUsername(editName.trim());
      setIsEditing(false);
    }
  }, [editName, onUpdateUsername]);

  // Derives the displayed array by optionally filtering off timestamps older than midnight today.
  const filteredScores = useMemo(() => {
    let scores = allScores;
    if (filter === 'today') {
      const today = new Date().setHours(0,0,0,0);
      scores = scores.filter(s => s.updatedAt != null && s.updatedAt >= today);
    }
    return scores.slice(0, 10);
  }, [allScores, filter]);

  const userRank = allScores.findIndex(s => s.id === user?.uid) + 1;

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity no-game-click">
      <div className={`w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-in-right ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold tracking-tight">Global Top 10</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-3 sm:p-2 hover:bg-gray-500/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
          
          {user && (
            <div className={`flex flex-col gap-3 p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Your Rank</span>
                <span className="font-bold text-red-500">#{userRank > 0 ? userRank : '-'} <span className="text-gray-500 text-sm font-normal">of {allScores.length}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {isEditing ? (
                  <div className="flex items-center flex-1 gap-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} 
                           className={`flex-1 border rounded px-2 py-1 outline-none focus:border-red-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'}`} 
                           maxLength={15} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} />
                    <button onClick={handleSaveName} aria-label="Save name" className="p-2 sm:p-1 hover:bg-gray-500/20 rounded text-green-500"><Check className="w-5 h-5 sm:w-4 sm:h-4" /></button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold flex-1 truncate">{currentUsername}</span>
                    <button onClick={() => setIsEditing(true)} aria-label="Edit name" className="p-2 sm:p-1 hover:bg-gray-500/20 rounded text-gray-500"><Edit2 className="w-5 h-5 sm:w-4 sm:h-4" /></button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button onClick={() => setFilter('all')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-black shadow') : 'text-gray-500'}`}>All Time</button>
            <button onClick={() => setFilter('today')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'today' ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-black shadow') : 'text-gray-500'}`}>Today</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-10">
          {filteredScores.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">No times found.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredScores.map((score, index) => {
                const tier = getLevel(score.bestTime);
                const isMe = score.id === user?.uid; 
                return (
                  <div key={score.id} className={`flex items-center p-3 rounded-xl border transition-all ${isMe ? (isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')} hover:shadow-md`}>
                    <div className={`w-8 text-center font-bold flex justify-center items-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {index < 3 ? <Medal className="w-4 h-4" /> : index + 1}
                    </div>
                    <div className="flex-1 flex flex-col min-w-0 px-3">
                      <div className="font-medium truncate">{score.username}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={tier.color}>{tier.name}</span>
                        <span>•</span>
                        <span>{score.attempts || 1} attempts</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-lg">{formatTime(score.bestTime)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* Modal component detailing application instructions, technical stack information, and asset attributions. */
const AboutModal = ({ isOpen, onClose, isDark }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in no-game-click">
      <div className={`w-full max-w-lg p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}`}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-3 sm:p-2 hover:bg-gray-500/20 rounded-full transition-colors z-10"><X className="w-5 h-5" /></button>
        
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 pr-8"><Target className="text-red-500" /> How to Play</h2>
        <ul className="space-y-3 mb-6 list-disc pl-5">
          <li><strong>1. Start the sequence:</strong> Click, tap, or press Space to initiate the starting lights.</li>
          <li><strong>2. Watch the lights:</strong> The 5 red lights will illuminate one by one.</li>
          <li><strong>3. Hold steady:</strong> Once all 5 are lit, wait for the random delay (0.2s - 3.0s).</li>
          <li><strong>4. Lights out:</strong> The instant all the lights go dark, tap or click as fast as you can!</li>
          <li><strong>5. Don't jump:</strong> Clicking at <em>any time</em> before the lights go out results in a False Start penalty.</li>
        </ul>
        
        <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h3 className="text-lg font-bold mb-2">Tech Stack & Portfolio</h3>
          <p className="text-sm mb-3">Built as a portfolio showcase using React, Tailwind CSS, and Firebase. It features sub-millisecond precision timing, optimized Firestore batching, local storage caching, and real-time global leaderboards.</p>
        </div>
        
        <div className={`p-5 rounded-xl text-xs space-y-3 ${isDark ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-50 border text-gray-600'}`}>
          <h3 className="text-sm font-bold border-b pb-2 mb-2 border-gray-500/20">Image Credits & Professional Attributions</h3>
          <p>All media assets remain the property of their respective creators and organizations. They are utilized here strictly for non-commercial, portfolio demonstration purposes.</p>
          <ul className="list-disc pl-4 space-y-2">
            <li><strong>Application Logo:</strong> Iconography sourced from <a href="https://f1starttimer.blog/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">F1 Start Timer Blog</a>.</li>
            <li><strong>Formula 1 Tier:</strong> Image provided by <a href="https://www.performanceracing.com/magazine/industry-news/09-16-2025/formula-1-fia-announce-2026-sprint-calendar" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">Performance Racing & the FIA</a>.</li>
            <li><strong>Formula 2 Tier:</strong> Logo retrieved from <a href="https://www.brandsoftheworld.com/logo/f2-2026" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">Brands of the World & the FIA</a>.</li>
            <li><strong>Formula 3 Tier:</strong> Logo retrieved from <a href="https://www.brandsoftheworld.com/logo/f3-2026" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">Brands of the World & the FIA</a>.</li>
            <li><strong>Karting Star Tier:</strong> Asset licensed via <a href="https://stock.adobe.com/search?k=karting+logo" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">Adobe Stock</a>.</li>
            <li><strong>Safety Car Tier:</strong> Photography credited to <a href="https://www.gpfans.com/en/f1-news/102658/f1-safety-car/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">GPFans</a>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 4. MAIN APPLICATION (App.jsx)
// ==========================================

export default function App() {
  /* --- IDENTITY & AUTHENTICATION STATE --- */
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("Racer");
  const [authReady, setAuthReady] = useState(false);
  
  /* UseReducer State Machine: Maintains absolute atomic consistency during high-speed races */
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  
  /* --- PERSISTENT STORAGE: Loading complex stats from LocalStorage safely --- */
  const [bestTime, setBestTime] = useState(() => { try { const c = localStorage.getItem('f1_pb'); return c ? parseFloat(c) : null; } catch { return null; } });
  const [history, setHistory] = useState([]); // Rolling window for the active 10 sessions to calculate StdDev
  const [fullHistory, setFullHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('f1_full_history')) || []; } catch { return []; } });
  const [falseStarts, setFalseStarts] = useState(() => { try { return parseInt(localStorage.getItem('f1_false_starts')) || 0; } catch { return 0; } });
  
  /* Safely loads the player's unlocked achievements from local disk cache */
  const [achievements, setAchievements] = useState(() => { try { return JSON.parse(localStorage.getItem('f1_achievements')) || []; } catch { return []; } });
  
  /* Tracks the number of races completed purely in this active page session for the 'In the Zone' achievement. */
  const [sessionRaces, setSessionRaces] = useState(0); 

  const [isPracticeMode, setIsPracticeMode] = useState(() => { try { return localStorage.getItem('f1_practice') === 'true'; } catch { return false; } });
  const [themePref, setThemePref] = useState(() => { try { return localStorage.getItem('f1_theme') || 'system'; } catch { return 'system'; } });
  
  // Guard against invalid/corrupted localStorage values when loading the car preference
  const [selectedCar, setSelectedCar] = useState(() => { 
    try { 
      const car = localStorage.getItem('f1_car');
      return CONSTRUCTORS[car] ? car : 'Ferrari'; 
    } catch { return 'Ferrari'; } 
  });
  
  const [isDark, setIsDark] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLanding, setShowLanding] = useState(true); // Manages the initial Landing Page layout
  
  /* Modal Visibility Flags */
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showPracticeTutorial, setShowPracticeTutorial] = useState(() => { try { return localStorage.getItem('f1_tut_dismissed') !== 'true'; } catch { return true; } });
  
  const [allScores, setAllScores] = useState([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  /* 
   * HIGH-FREQUENCY TIMING REFS 
   * Using refs here ensures sub-millisecond timestamps are stored immediately, 
   * skipping the asynchronous rendering queue inherent to standard React State.
   */
  const holdDelayRef = useRef(0);
  const timeoutsRef = useRef([]);
  const startTimeRef = useRef(0);
  const sequenceStartTimeRef = useRef(0);
  
  /* 
   * State synchronization ref. Guarantees event listeners (like keydown) evaluate against 
   * the absolute latest game state, preventing closure-staleness bugs. 
   */
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  /* Prevents duplicated interactions when mobile browsers fire both pointerdown and click */
  const ignoreNextClickRef = useRef(false);

  /* Memoize the standard deviation so it doesn't recalculate heavily on every frame render. */
  const historyStdDev = useMemo(() => calculateStdDev(history), [history]);

  /* STREAMING_CHUNK:Registering Effects and Hardware integrations... */
  /* EFFECT: OS Theme Synchronization */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => setIsDark(themePref === 'dark' ? true : themePref === 'light' ? false : mediaQuery.matches);
    updateTheme(); 
    const handleSystemChange = (e) => { if (themePref === 'system') setIsDark(e.matches); };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themePref]);

  /* Persists the selected application theme to localStorage. */
  const handleThemeSelect = (newTheme) => { setThemePref(newTheme); setShowThemeMenu(false); try { localStorage.setItem('f1_theme', newTheme); } catch {} };
  /* Persists the selected Constructor identity to localStorage. */
  const handleCarSelect = (car) => { setSelectedCar(car); try { localStorage.setItem('f1_car', car); } catch {} };

  /* EFFECT: Anonymous Authentication Initializer */
  useEffect(() => {
    // If the top-level firebase `auth` object is null (failed load), we safely bypass DB syncs
    if (!auth) { setUser({ uid: 'local_user_' + Math.random().toString(36).substring(2, 8) }); setUsername('LocalRacer'); setAuthReady(true); return; }
    const initAuth = async () => { try { await setPersistence(auth, browserLocalPersistence); await signInAnonymously(auth); } catch (err) { setUser({ uid: 'local_user_' + Math.random().toString(36).substring(2, 8) }); setUsername('LocalRacer'); setAuthReady(true); } };
    const unsubscribeAuth = auth.onAuthStateChanged((u) => { if (u) { setUser(u); setUsername(`Racer_${u.uid.substring(0, 5)}`); } setAuthReady(true); });
    initAuth(); return () => unsubscribeAuth();
  }, []);

  /* 
   * EFFECT: Firestore Real-Time Sync & Offline Fallback 
   * Establishes a bounded listener to pull only the top 10 fastest times globally.
   */
  useEffect(() => {
    if (!user) return;
    let timeout;
    const fallbackScores = [ { id: 'm1', username: 'Max V.', bestTime: 0.185, attempts: 42, updatedAt: Date.now() }, { id: 'm2', username: 'Lewis H.', bestTime: 0.192, attempts: 38, updatedAt: Date.now() }, { id: 'm3', username: 'Charles L.', bestTime: 0.198, attempts: 25, updatedAt: Date.now() } ];
    if (!db) { setIsOfflineMode(true); setAllScores(fallbackScores); return; }
    try {
      // Bounded Query: Enforce a strict limit(10) constraint here to ensure horizontal scaling.
      const q = query(collection(db, 'f1_leaderboard'), orderBy('bestTime', 'asc'), limit(10));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsOfflineMode(false); clearTimeout(timeout);
        // Introduces a nominal delay to batch incoming rapid state updates (debouncing).
        timeout = setTimeout(() => {
          const data = []; snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() })); setAllScores(data);
        }, 300);
      }, () => { setIsOfflineMode(true); setAllScores(fallbackScores); });
      return () => { unsubscribe(); clearTimeout(timeout); };
    } catch (error) { setIsOfflineMode(true); setAllScores(fallbackScores); }
  }, [user]);

  /* Aggregates global performance statistics across the current dataset. */
  const globalStats = useMemo(() => {
    let totalTime = 0, count = 0; allScores.forEach(s => { if (s.bestTime != null) { totalTime += s.bestTime; count++; } });
    return { total: allScores.length, avg: count > 0 ? totalTime / count : 0 };
  }, [allScores]);

  /* Purges all pending light sequence timeouts to cleanly abort active progressions. */
  const clearAllTimeouts = useCallback(() => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; }, []);

  /* 
   * OFFLINE & FALLBACK MERGE LOGIC
   * Safely posts new best times to Firestore. If offline, it fails silently, allowing the 
   * local persistent storage system to act as the primary truth layer.
   */
  const saveScoreToLeaderboard = useCallback(async (time, currentName = username, isNewBest = false) => {
    if (!user || isPracticeMode) return;
    try {
      const docRef = doc(db, 'f1_leaderboard', user.uid);
      const updateData = { userId: user.uid, username: currentName, updatedAt: Date.now(), attempts: increment(1) };
      if (isNewBest && time !== null) updateData.bestTime = time;
      if (db) await setDoc(docRef, updateData, { merge: true });
    } catch (err) { setIsOfflineMode(true); } 
  }, [user, username, isPracticeMode]);


  /* STREAMING_CHUNK:Building the dynamic Achievement Evaluation Engine... */
  /* 
   * THE ACHIEVEMENT ENGINE
   * Evaluates a holistic set of user metrics against all 30 milestone thresholds.
   * Runs dynamically at the conclusion of every single race input (valid or jump-start).
   * It takes in an object payload to keep the parameter signature clean and extensible.
   */
  const evaluateAchievements = useCallback((metrics) => {
    const { time, isPractice, isJumpStart, currentStreak, holdTime, sessionRacesCount, totalRaces, totalFails, recentHistory } = metrics;
    
    // Utilize a Set to enforce unique values while processing additions cleanly
    const newAchs = new Set(achievements);
    const initialSize = newAchs.size;

    const date = new Date();
    const hour = date.getHours();

    // 1. Practice Specific Achievements
    if (isPractice) {
        newAchs.add('practice_1');
        if (sessionRacesCount >= 10) newAchs.add('practice_10');
    }

    // 2. Failure & Mistakes Achievements
    if (isJumpStart) {
        if (totalFails >= 1) newAchs.add('fail_1');
        if (totalFails >= 10) newAchs.add('fail_10');
        if (totalFails >= 50) newAchs.add('fail_50');
    }

    // 3. Core Valid Race Achievements
    if (!isPractice && !isJumpStart && time > 0) {
        // Milestone Volume Constraints
        if (totalRaces >= 1) newAchs.add('first_race');
        if (totalRaces >= 10) newAchs.add('races_10');
        if (totalRaces >= 50) newAchs.add('races_50');
        if (totalRaces >= 100) newAchs.add('races_100');
        if (totalRaces >= 250) newAchs.add('races_250');
        if (totalRaces >= 500) newAchs.add('races_500');
        if (totalRaces >= 1000) newAchs.add('races_1000');

        // Reflex Speed Constraints
        if (time < 0.350) newAchs.add('speed_350');
        if (time < 0.300) newAchs.add('speed_300');
        if (time < 0.250) newAchs.add('speed_250');
        if (time < 0.200) newAchs.add('speed_200');
        if (time < 0.180) newAchs.add('speed_180');
        if (time < 0.150) newAchs.add('speed_150');

        // Sequential Consistency Constraints
        if (currentStreak >= 5) newAchs.add('streak_5');
        if (currentStreak >= 10) newAchs.add('streak_10');
        if (currentStreak >= 25) newAchs.add('streak_25');
        if (currentStreak >= 50) newAchs.add('streak_50');

        // Edge Cases & Anomalous Timing
        if (time >= 1.000) newAchs.add('slow_1000');
        if (time <= 0.050) newAchs.add('close_call');
        
        // Holding under pressure (Wait 2.5 seconds, still get alien speed)
        if (holdTime > 2500 && time < 0.250) newAchs.add('patience_2500');

        // Environmental Conditions (Time of Day Checks)
        if (hour >= 0 && hour < 4) newAchs.add('night_owl');
        if (hour >= 4 && hour < 8) newAchs.add('early_bird');

        // Complex Statistical Consistency (Requires at least 10 valid recent races)
        if (recentHistory.length >= 10) {
            const stdDev = calculateStdDev(recentHistory.slice(-10));
            if (stdDev < 0.050) newAchs.add('consistency_50');
            if (stdDev < 0.020) newAchs.add('consistency_20');
        }
    }

    // 4. Session Intensity Checks
    if (sessionRacesCount >= 20) newAchs.add('session_20');

    // Only update state & local storage if a new achievement was actually unlocked during this frame.
    if (newAchs.size > initialSize) {
        const updatedArray = Array.from(newAchs);
        setAchievements(updatedArray);
        try { localStorage.setItem('f1_achievements', JSON.stringify(updatedArray)); } catch {}
    }
  }, [achievements]);


  /* Initializes the racing light sequence and schedules asynchronous state transitions. */
  const startSequence = useCallback(() => {
    clearAllTimeouts();
    setShowConfetti(false);
    
    // The infamous random hold: 0.2 to 3.0 seconds to prevent users from predicting the start.
    const randomHold = Math.random() * 2800 + 200;
    holdDelayRef.current = randomHold; 
    
    // Record the exact high-resolution timestamp for sequence initiation.
    sequenceStartTimeRef.current = performance.now(); 
    dispatch({ type: 'START_SEQUENCE', payload: randomHold });

    // Schedule the sequential illumination of the 5 starting lights at precise 1-second intervals.
    [1000, 2000, 3000, 4000, 5000].forEach((delay, index) => {
      timeoutsRef.current.push(setTimeout(() => {
        dispatch({ type: 'SET_LIT_COUNT', payload: index + 1 });
        playBeep('light'); 
        
        if (index === 4) {
          timeoutsRef.current.push(setTimeout(() => {
            dispatch({ type: 'LIGHTS_OUT' });
            // Record the exact moment the lights go out for subsequent reaction delta calculation.
            startTimeRef.current = performance.now(); 
          }, randomHold)); 
        }
      }, delay));
    });
  }, [clearAllTimeouts]);

  /* STREAMING_CHUNK:Defining precise user interaction handlers... */
  /* Primary input handler for advancing the state machine. Evaluates raw interaction timing. */
  const handleInteraction = useCallback((e) => {
    initAudio(); // Required interaction primer for mobile devices to allow audio later.
    const current = stateRef.current;
    
    // Increment the localized session counter for every valid engagement
    const nextSessionCount = sessionRaces + 1;
    setSessionRaces(nextSessionCount);

    // 1. Idle -> Restart Sequence
    if (current.status === 'IDLE' || current.status === 'FINISHED' || current.status === 'JUMP_START') {
      startSequence();
    } 
    // 2. Sequence Active -> Early Click Penalty (Jump Start)
    else if (current.status === 'SEQUENCE') {
      clearAllTimeouts(); 
      const timeElapsed = performance.now() - sequenceStartTimeRef.current;
      
      // Trigger haptic feedback for mobile devices to indicate a sequence interruption.
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 

      if (isPracticeMode) {
        // In practice mode, calculate the exact negative offset rather than issuing a standard penalty.
        const earlyBy = (timeElapsed - (5000 + holdDelayRef.current)) / 1000;
        dispatch({ type: 'FINISH', payload: { time: earlyBy, isPractice: true } });
        setHistory(prev => [...prev, earlyBy].slice(-10)); 
        
        // Evaluate practice specific achievements
        evaluateAchievements({ isPractice: true, isJumpStart: true, sessionRacesCount: nextSessionCount });
      } else {
        // Assess a time penalty relative to the remaining expected sequence duration.
        const penalty = Math.max(0, 5000 - timeElapsed) / 1000;
        dispatch({ type: 'FALSE_START', payload: penalty });
        
        const newFS = falseStarts + 1;
        setFalseStarts(newFS);
        try { localStorage.setItem('f1_false_starts', newFS.toString()); } catch {}
        saveScoreToLeaderboard(null, username, false); 
        
        // Evaluate failure specific achievements
        evaluateAchievements({ isJumpStart: true, isPractice: false, totalFails: newFS, sessionRacesCount: nextSessionCount });
      }
    } 
    // 3. Ready State -> Valid Reaction Measurement
    else if (current.status === 'READY') {
      const timeInSeconds = (performance.now() - startTimeRef.current) / 1000;
      if (navigator.vibrate) navigator.vibrate(50); 
      
      dispatch({ type: 'FINISH', payload: { time: timeInSeconds, isPractice: isPracticeMode } });
      const newHistory = [...history, timeInSeconds].slice(-10);
      setHistory(newHistory); 
      
      let newFull = fullHistory;
      if (!isPracticeMode) {
        newFull = [...fullHistory, timeInSeconds];
        setFullHistory(newFull);
        try { localStorage.setItem('f1_full_history', JSON.stringify(newFull)); } catch {}
        
        // Trigger the unified achievement engine with the comprehensive suite of metrics
        evaluateAchievements({ 
            time: timeInSeconds, 
            isPractice: false, 
            isJumpStart: false, 
            currentStreak: current.streak + 1, 
            holdTime: current.holdTime, 
            sessionRacesCount: nextSessionCount, 
            totalRaces: newFull.length, 
            totalFails: falseStarts,
            recentHistory: newFull // Give it the full scope to slice from
        });
      } else {
        // Trigger practice achievements on success
        evaluateAchievements({ isPractice: true, isJumpStart: false, sessionRacesCount: nextSessionCount });
      }

      // Evaluate if the current reaction time establishes a new personal record.
      const isNewBest = bestTime === null || timeInSeconds < bestTime;
      if (isNewBest && !isPracticeMode) {
        setBestTime(timeInSeconds);
        try { localStorage.setItem('f1_pb', timeInSeconds.toString()); } catch {} 
        setShowConfetti(true); 
      }
      
      saveScoreToLeaderboard(timeInSeconds, username, isNewBest);
    }
  }, [startSequence, clearAllTimeouts, bestTime, username, saveScoreToLeaderboard, isPracticeMode, fullHistory, falseStarts, evaluateAchievements, sessionRaces, history]);


  /*
   * MOBILE INPUT OPTIMIZATION & DE-DUPLICATION
   * Mobile browsers typically fire a `pointerdown` (or `touchstart`) followed by a synthetic `click`
   * ~300ms later. If we only listened to `click`, we'd lose 300ms of reaction time.
   * If we listened to both independently, a single tap would trigger two interactions, immediately
   * causing an unintentional "Jump Start" on the next race.
   * We use `ignoreNextClickRef` to safely consume the ultra-fast pointer event and discard the phantom click.
   */
  const handlePointerDown = useCallback((e) => {
    if (e?.target?.closest?.('.no-game-click')) return;
    const current = stateRef.current;
    if (current.status === 'READY' || current.status === 'SEQUENCE') {
      ignoreNextClickRef.current = true; 
      handleInteraction(e);
    }
  }, [handleInteraction]);

  const handleClick = useCallback((e) => {
    if (e?.target?.closest?.('.no-game-click')) return;
    if (ignoreNextClickRef.current) { ignoreNextClickRef.current = false; return; }
    const current = stateRef.current;
    if (current.status === 'IDLE' || current.status === 'FINISHED' || current.status === 'JUMP_START') {
      handleInteraction(e);
    }
  }, [handleInteraction]);

  /* Keyboard fallback strictly bound to the spacebar. */
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.code === 'Space' && !e.repeat && !showLanding) { e.preventDefault(); handleInteraction(e); } };
    window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInteraction, showLanding]);

  const handleTogglePractice = () => { const newVal = !isPracticeMode; setIsPracticeMode(newVal); try { localStorage.setItem('f1_practice', newVal); } catch {} };
  const dismissTutorial = useCallback(() => { setShowPracticeTutorial(false); try { localStorage.setItem('f1_tut_dismissed', 'true'); } catch {} }, []);

  /* 
   * Social Web Share API integration allowing users to transmit formatted accomplishments.
   * Gracefully degrades to a clipboard copy operation if the native platform is unsupported.
   */
  const handleShare = async (e) => {
    e.stopPropagation();
    const text = `🏎️ Reaction Test\n⏱️ ${formatTime(state.reactionTime)}s\n🏅 ${getLevel(state.reactionTime).name}\nCan you beat my time?`;
    if (navigator.share) {
      try { await navigator.share({ title: 'F1 Reaction Test', text }); } catch (err) {}
    } else {
      navigator.clipboard.writeText(text);
      alert("Result copied to clipboard!");
    }
  };

  /* Pre-flight render state prevention prior to authentication finalization. */
  if (!authReady) {
    return (
      <div className={`flex h-screen flex-col items-center justify-center gap-4 ${isDark ? 'bg-[#0f0f13] text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="font-medium animate-pulse text-sm uppercase tracking-widest">Warming up tires...</p>
      </div>
    );
  }

  /* STREAMING_CHUNK:Rendering the initial user landing page and main layout... */
  /* 
   * LANDING PAGE RENDER LOGIC
   * The initial user interaction gate that handles constructor selection and theming setup.
   */
  if (showLanding) {
    return (
      <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 relative ${isDark ? 'bg-[#0f0f13] text-gray-100' : 'bg-gray-50 text-gray-900'} theme-container`}>
         <div className="absolute inset-0 pattern-grid opacity-5 pointer-events-none"></div>
         
         <div className="absolute top-4 right-4 z-50">
           <ThemeToggleMenu themePref={themePref} isDark={isDark} showThemeMenu={showThemeMenu} setShowThemeMenu={setShowThemeMenu} handleThemeSelect={handleThemeSelect} />
         </div>

         <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative">
            <F1CarIcon color={CONSTRUCTORS[selectedCar].color} className="w-32 h-auto mb-8 drop-shadow-2xl animate-in slide-in-from-left-8 duration-500" />
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-2 text-center leading-none">Reaction<span style={{color: CONSTRUCTORS[selectedCar].color}}>Test</span></h1>
            <p className={`text-lg sm:text-xl font-medium mb-12 text-center max-w-md ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>The premiere motorsport starting light simulator. Test your reflexes against the world.</p>
            
            <div className={`p-6 rounded-3xl w-full max-w-md mb-8 shadow-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
               <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Target className="w-4 h-4"/> Select Constructor</h3>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                 {Object.entries(CONSTRUCTORS).map(([name, data]) => (
                    <button key={name} onClick={() => handleCarSelect(name)} className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-2 ${selectedCar === name ? (isDark ? 'border-gray-500 bg-gray-700' : 'border-gray-400 bg-gray-100 shadow-inner') : (isDark ? 'border-gray-800 bg-gray-900/50 hover:bg-gray-800' : 'border-gray-100 bg-white hover:bg-gray-50')}`}>
                      <div className="w-4 h-4 rounded-full" style={{backgroundColor: data.color}}></div>
                      {name}
                    </button>
                 ))}
               </div>
            </div>

            <button onClick={() => setShowLanding(false)} className={`w-full max-w-md ${CONSTRUCTORS[selectedCar].textClass} font-black text-xl py-5 rounded-full shadow-2xl transition-transform active:scale-95 ${CONSTRUCTORS[selectedCar].class} ${CONSTRUCTORS[selectedCar].hover}`}>
              PULL TO GRID
            </button>
         </div>
      </div>
    );
  }

  /* Compute derived UI statistics based on history arrays for presentation in the final Game View. */
  const currentLevel = state.status === 'FINISHED' && state.reactionTime !== null && state.reactionTime > 0 ? getLevel(state.reactionTime) : null;
  const validHistory = history.filter(t => t > 0);
  const rollingAvg = validHistory.length > 0 ? validHistory.reduce((a, b) => a + b, 0) / validHistory.length : null;
  const historyMin = validHistory.length > 0 ? Math.min(...validHistory) : 0;
  const historyRange = (validHistory.length > 0 ? Math.max(...validHistory) : 0) - historyMin || 0.1;
  
  let percentileText = null;
  if (state.status === 'FINISHED' && state.reactionTime !== null && state.reactionTime > 0 && allScores.length >= 5) {
    const pct = Math.round((allScores.filter(s => s.bestTime > state.reactionTime).length / allScores.length) * 100);
    if (pct > 0) percentileText = `Faster than ${pct}% of players`;
  }

  return (
    <div
      className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 relative ${isDark ? 'bg-[#0f0f13] text-gray-100' : 'bg-gray-50 text-gray-900'} theme-container ${state.status === 'JUMP_START' ? 'animate-shake' : ''}`}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{ touchAction: state.status === 'FINISHED' ? 'auto' : 'none' }}
    >
      {/* 
        SCREEN READER ACCESSIBILITY (ARIA)
        Assertive live region to announce real-time light sequence changes to visually impaired users 
        as they navigate the interactive game cycle.
      */}
      <div aria-live="assertive" className="sr-only">
        {state.status === 'SEQUENCE' ? 'Starting light sequence. Wait for lights out...' : ''}
        {state.status === 'READY' ? 'Lights out! React now!' : ''}
        {state.status === 'JUMP_START' ? 'False start! You reacted before the lights went out.' : ''}
      </div>

      <div className={`absolute inset-0 pointer-events-none transition-colors duration-200 z-0 ${state.status === 'JUMP_START' ? 'bg-red-500/20' : ''}`} />

      {/* --- APPLICATION NAVBAR --- */}
      <div className={`w-full p-4 flex justify-between items-center z-20 no-game-click relative ${isDark ? 'bg-[#1a1a20]/80 border-gray-800' : 'bg-white/80 border-gray-200'} border-b backdrop-blur-md`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowLanding(true)}>
          <div className={`${CONSTRUCTORS[selectedCar].class} p-2 sm:p-2.5 rounded-xl shadow-lg flex items-center justify-center transition-colors`}>
            <F1CarIcon className={`w-7 sm:w-8 h-auto transition-colors ${CONSTRUCTORS[selectedCar].textClass}`} />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none pl-1 hidden sm:block">Reaction<span style={{color: CONSTRUCTORS[selectedCar].color}}>Test</span></h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-4">
          {isOfflineMode && <span className="hidden sm:inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Offline</span>}
          
          <button onClick={handleTogglePractice} className={`px-2 py-1.5 sm:px-3 text-[10px] sm:text-xs font-bold rounded-full transition-colors border ${isPracticeMode ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : (isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200')}`}>
            <span className="hidden sm:inline">Practice: </span>{isPracticeMode ? 'ON' : 'OFF'}
          </button>
          
          <button onClick={() => setShowStats(true)} aria-label="Career Dashboard" className={`p-2.5 sm:p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} title="Dashboard">
            <BarChart2 className="w-5 h-5" />
          </button>

          <button onClick={() => setShowAchievements(true)} aria-label="Achievements" className={`p-2.5 sm:p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} title="Achievements">
            <Award className="w-5 h-5" />
          </button>
          
          <a href="https://github.com/SVerma2696/f1-timer" target="_blank" rel="noopener noreferrer" className={`p-2.5 sm:p-2 rounded-full transition-colors hidden sm:block ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} title="GitHub Repo">
            <GithubIcon className="w-5 h-5" />
          </a>
          
          <button onClick={() => setShowAbout(true)} aria-label="How to play" className={`p-2.5 sm:p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`} title="How to play">
            <Info className="w-5 h-5" />
          </button>
          
          {/* DRY Integration of the Theme Dropdown Component within the Navbar */}
          <ThemeToggleMenu themePref={themePref} isDark={isDark} showThemeMenu={showThemeMenu} setShowThemeMenu={setShowThemeMenu} handleThemeSelect={handleThemeSelect} />
          
          <button onClick={() => setShowLeaderboard(true)} aria-label="Global Leaderboard" className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500 text-yellow-900 hover:bg-yellow-400 transition-colors shadow-lg ml-1">
            <Trophy className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- PRIMARY GAMEPLAY AREA --- */}
      <div className="flex-1 flex flex-col items-center justify-start pt-[2vh] sm:pt-[5vh] relative px-4 overflow-hidden z-[5]">
        <div className="mb-4 sm:mb-8 transition-transform shrink-0"><Gantry litCount={state.litCount} isDark={isDark} /></div>

        <div className="text-center flex flex-col items-center justify-start w-full max-w-2xl flex-1 min-h-0 pb-28 sm:pb-32 overflow-y-auto custom-scrollbar">
          
          {state.status === 'IDLE' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 mt-4 sm:mt-8 pointer-events-none px-4 flex flex-col items-center w-full">
              <p className="text-xl sm:text-2xl md:text-3xl font-medium mb-4">Click or tap <span className="hidden sm:inline">or press <kbd className={`px-3 py-1 rounded-lg text-sm border font-mono shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>Space</kbd></span> to race.</p>
              {state.streak > 0 && <p className="text-orange-500 font-bold flex items-center justify-center gap-1 mb-4"><Flame className="w-4 h-4"/> Streak: {state.streak}</p>}
              
              {isPracticeMode && showPracticeTutorial ? (
                <div className={`mt-2 p-5 sm:p-6 rounded-2xl border w-full max-w-md text-left relative pointer-events-auto shadow-lg animate-in slide-in-from-bottom-4 ${isDark ? 'bg-blue-900/10 border-blue-800/50' : 'bg-white border-blue-200'}`}>
                  <button onClick={(e) => { e.stopPropagation(); dismissTutorial(); }} className="no-game-click absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-500/20 transition-colors"><X className="w-4 h-4" /></button>
                  <h3 className="text-blue-500 font-bold uppercase tracking-wider text-xs mb-5 flex items-center gap-2"><Activity className="w-4 h-4" /> Practice Mode Tutorial</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3"><div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div><p className="text-sm leading-snug"><strong className={isDark ? "text-gray-200" : "text-gray-800"}>Start:</strong> Tap anywhere to begin.</p></div>
                    <div className="flex items-start gap-3"><div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div><p className="text-sm leading-snug"><strong className={isDark ? "text-gray-200" : "text-gray-800"}>Anticipate:</strong> Watch the 5 red lights turn on, then wait for a random delay.</p></div>
                    <div className="flex items-start gap-3"><div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div><p className="text-sm leading-snug"><strong className={isDark ? "text-gray-200" : "text-gray-800"}>React:</strong> The instant the lights go dark, tap fast!</p></div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismissTutorial(); }} className="no-game-click w-full mt-6 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm shadow-md active:scale-95">Got it, let's practice!</button>
                </div>
              ) : (
                <button onClick={() => setShowAbout(true)} className={`pointer-events-auto no-game-click flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-transform active:scale-95 border shadow-sm ${isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}><Info className="w-4 h-4 text-blue-500" /> How to Play</button>
              )}
            </div>
          )}

          {state.status === 'SEQUENCE' && <p className="text-2xl sm:text-3xl font-medium opacity-50 animate-pulse mt-8 pointer-events-none">Wait for lights out...</p>}
          
          {state.status === 'JUMP_START' && (
            <div className="animate-in zoom-in duration-200 mt-4 pointer-events-none">
              <h2 className="text-4xl sm:text-6xl font-black text-red-500 tracking-tighter mb-3 uppercase drop-shadow-lg">Jump Start!</h2>
              {state.jumpPenalty && <span className="inline-block px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm font-bold border border-red-500/20">Penalty: +{state.jumpPenalty.toFixed(2)}s</span>}
            </div>
          )}

          {state.status === 'FINISHED' && (
            <div aria-live="polite" className="animate-in fade-in zoom-in-95 duration-300 w-full flex flex-col items-center">
              {state.reactionTime < 0 && <h2 className="text-3xl sm:text-4xl font-black text-red-500 tracking-tighter mb-2 uppercase drop-shadow-lg">Jump Start!</h2>}
              
              <div className={`foldable-timer-text text-[4rem] min-[350px]:text-[5rem] sm:text-[7rem] md:text-[9rem] font-medium tabular-nums tracking-tighter leading-none mb-4 sm:mb-6 text-transparent bg-clip-text ${state.reactionTime < 0 ? 'bg-gradient-to-b from-red-500 to-red-800' : (isDark ? 'bg-gradient-to-b from-white to-gray-500' : 'bg-gradient-to-b from-gray-900 to-gray-600')} drop-shadow-sm pointer-events-none`}>
                {formatTime(state.reactionTime)}
              </div>

              <div className={`grid gap-2 sm:gap-4 mb-6 sm:mb-8 pointer-events-none w-full max-w-sm ${isPracticeMode ? 'grid-cols-2' : 'grid-cols-2 flex max-w-[300px]'}`}>
                {bestTime && (
                  <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                    <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Medal className="w-3 h-3"/> PB</span>
                    <span className="font-mono font-bold text-base sm:text-lg">{formatTime(bestTime)}</span>
                  </div>
                )}
                
                {rollingAvg && validHistory.length > 1 && (
                  <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'} shadow-sm relative overflow-hidden`}>
                    <span className="text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> Avg ({validHistory.length})</span>
                    <span className="font-mono font-bold text-base sm:text-lg">{formatTime(rollingAvg)}</span>
                    <div className="absolute bottom-0 left-0 w-full flex items-end gap-[1px] h-3 opacity-30 px-2 pb-1">
                      {validHistory.map((t, i) => {
                        const heightPct = Math.max(10, 100 - ((t - historyMin) / historyRange) * 90);
                        return <div key={i} className="flex-1 bg-red-500 rounded-t-[1px] transition-all" style={{height: `${heightPct}%`}}/>
                      })}
                    </div>
                  </div>
                )}
                
                {isPracticeMode && (
                  <>
                    <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'} shadow-sm`}>
                      <span className="text-[10px] sm:text-xs uppercase font-bold text-blue-500 mb-1">Hold</span>
                      <span className="font-mono font-bold text-base sm:text-lg">{state.holdTime ? (state.holdTime / 1000).toFixed(3) : '-.---'}s</span>
                    </div>
                    <div className={`flex flex-col items-center justify-center p-3 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'} shadow-sm`}>
                      <span className="text-[10px] sm:text-xs uppercase font-bold text-blue-500 mb-1">Consistency</span>
                      <span className="font-mono font-bold text-base sm:text-lg">{historyStdDev.toFixed(3)}s</span>
                    </div>
                  </>
                )}
              </div>

              {isPracticeMode && (
                 <div className={`w-full max-w-sm mb-6 px-4 py-3 rounded-xl border flex gap-3 text-left pointer-events-none ${isDark ? 'bg-blue-900/20 border-blue-800/50 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                   <Activity className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                   <div className="flex flex-col">
                     <span className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">Coach's Tip</span>
                     <span className="text-sm leading-snug">{getPracticeTip(state.reactionTime, historyStdDev)}</span>
                   </div>
                 </div>
              )}

              {!isPracticeMode && currentLevel && (
                <div className={`w-full max-w-sm border rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center text-center transition-colors pointer-events-none ${isDark ? 'bg-gray-800 border-gray-700 shadow-black/50' : 'bg-white border-gray-200'} mx-4 mb-4 relative overflow-hidden group`}>
                  
                  <button onClick={handleShare} className={`absolute top-3 right-3 p-2 rounded-full pointer-events-auto no-game-click transition-all opacity-0 group-hover:opacity-100 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`} title="Share Result">
                     <Share2 className="w-4 h-4"/>
                  </button>

                  <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-widest mb-1 ${currentLevel.color}`}>{currentLevel.name}</h3>
                  {percentileText && <span className="text-[10px] sm:text-xs font-bold text-green-500 mb-2 sm:mb-3 bg-green-500/10 px-2 py-1 rounded-full">{percentileText}</span>}
                  <p className={`mb-3 sm:mb-4 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{currentLevel.desc}</p>
                  <div className="relative w-full h-32 sm:h-40 overflow-hidden rounded-xl bg-black">
                    <img src={currentLevel.img} alt={currentLevel.name} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {state.status === 'FINISHED' && (
        <div className="absolute bottom-12 sm:bottom-16 left-0 right-0 flex justify-center z-30 pointer-events-none pb-[env(safe-area-inset-bottom)]">
          <button onClick={() => startSequence()} className={`flex items-center gap-2 ${CONSTRUCTORS[selectedCar].textClass} font-bold py-3 px-8 rounded-full shadow-2xl pointer-events-auto transition-transform active:scale-95 animate-bounce no-game-click border-[3px] border-white dark:border-gray-900 ${CONSTRUCTORS[selectedCar].class} ${CONSTRUCTORS[selectedCar].hover}`}>
            <Play className="w-5 h-5 fill-current" /> Race Again
          </button>
        </div>
      )}

      {/* Global Real-Time Statistics Ticker at the bottom of the screen */}
      <div className="absolute bottom-0 w-full p-2 flex justify-center items-center gap-2 text-[10px] sm:text-xs font-medium bg-black/5 text-gray-500 dark:bg-white/5 dark:text-gray-400 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none backdrop-blur-sm">
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse"></div><span>Live</span></div>
        <span>•</span><span>{globalStats.total.toLocaleString()} Racers</span>
        <span>•</span><span>Global Avg: {formatTime(globalStats.avg)}s</span>
      </div>

      {/* --- MOUNTED OVERLAYS & MODALS --- */}
      {/* We mount modals outside the primary layout flow to prevent z-index collision issues */}
      <Confetti active={showConfetti} />
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} user={user} currentUsername={username} onUpdateUsername={(name) => { setUsername(name); if (bestTime !== null) saveScoreToLeaderboard(bestTime, name, true); }} isDark={isDark} allScores={allScores} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} isDark={isDark} />
      <DashboardModal isOpen={showStats} onClose={() => setShowStats(false)} isDark={isDark} fullHistory={fullHistory} falseStarts={falseStarts} />
      <AchievementsModal isOpen={showAchievements} onClose={() => setShowAchievements(false)} isDark={isDark} achievements={achievements} />

      {/* 
        Inline Style Declarations
        Handles application-wide resets, custom scrollbar implementations, keyframe animations,
        and responsive breakpoints specifically engineered for emerging hardware form factors.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        * { -webkit-tap-highlight-color: transparent; } 
        body { overscroll-behavior: none; } 
        
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0;
        }

        /* 
         * Form Factor Layout Optimizations
         * Target: Foldable/Flip Devices (Closed State)
         * Adjusts gantry scale and typography to prevent overflow on narrow external viewports.
         */
        @media (max-width: 320px) { .foldable-gantry { transform: scale(0.85); gap: 0.1rem !important; } .foldable-timer-text { font-size: 3.5rem !important; } }
        
        /* 
         * Target: Foldable/Trifold Devices (Open State)
         * Applies fluid typography and structural scaling for square or ultra-wide aspect ratios 
         * typical of expanded internal displays.
         */
        @media (min-width: 500px) and (max-width: 1200px) and (min-aspect-ratio: 3/4) and (max-aspect-ratio: 4/3) { .foldable-gantry { transform: scale(1.1); margin-bottom: 2rem; } .foldable-timer-text { font-size: clamp(5rem, 15vw, 10rem) !important; } }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .theme-container.bg-\\[\\#0f0f13\\] .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 20px; }
        .theme-container.bg-gray-50 .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 20px; }
        
        .pattern-grid { background-image: radial-gradient(currentColor 1px, transparent 1px); background-size: 20px 20px; }
        
        @keyframes confetti { 0% { opacity: 1; transform: translate(-50%, -50%) scale(0); } 100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(720deg); } }
        .animate-confetti { animation: confetti 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          50% { transform: translateX(10px); }
          75% { transform: translateX(-10px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}} />
    </div>
  );
}