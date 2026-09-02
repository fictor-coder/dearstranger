import React, { useState, useEffect, useRef } from "react";
import {
  Home, MessageCircle, Bell, User, ArrowLeft, Send, UserPlus, Lock, Check,
  CloudRain, Smile, Sparkles, HelpCircle, Moon, Heart, Ear, Feather,
  PenLine, Clock, Settings, LogOut, Trash2, Flag, UserX, Pencil, X,
  SmilePlus, Paperclip, ChevronRight, ShieldCheck, Users, Inbox,
  Award, Quote, StickyNote, Tag, Camera, Pin, EyeOff, Unlock, MessageCircleHeart, RefreshCw, Copy, CheckCheck,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const CREAM = "#FFF8F2";
const CORAL = "#FF6F61";
const AMBER = "#FFC857";
const TEAL = "#2EC4B6";
const PLUM = "#8E5572";
const CHARCOAL = "#3A2E2A";
const MUTED = "#9C8B86";
const SADBLUE = "#5CA9C9";
const TAN = "#C9A66B";

// ---- Connected-profile dark theme (sampled from the logo) ----
const DARKBG = "#0F0A26";
const DARKSURFACE = "#1A1440";
const DARKBORDER = "#332B66";
const DARKTEXT = "#F3F0FF";
const DARKMUTED = "#9E93C4";
const LOGO_BLUE = "#23BEF8";
const LOGO_PURPLE = "#CF85F8";
function logoGradient(angle = 135) {
  return `linear-gradient(${angle}deg, ${LOGO_BLUE}, ${LOGO_PURPLE})`;
}

// Avoid creating duplicate demo accounts when React checks effects in development mode.
let anonymousSignInPromise = null;

// ---- color helpers (drive the mood-gradient system used everywhere) ----
function shade(hex, amt) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function gradient(hex, angle = 135) {
  return `linear-gradient(${angle}deg, ${hex}, ${shade(hex, -36)})`;
}
function glow(hex, alpha = "4D") {
  return `0 6px 16px ${hex}${alpha}`;
}
function notifColor(type) {
  return { connected: TEAL, friend_request: AMBER, access_requested: PLUM, access_granted: TEAL }[type] || CORAL;
}
function expiresAtFor(duration) {
  const hours = { "2h": 2, "4h": 4, "12h": 12 }[duration];
  return hours ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null;
}

const MOODS = {
  sad: { label: "Sad", color: SADBLUE, Icon: CloudRain },
  calm: { label: "Calm", color: TEAL, Icon: Smile },
  happy: { label: "Happy", color: AMBER, Icon: Sparkles },
  loved: { label: "Loved", color: CORAL, Icon: Heart },
  thoughtful: { label: "Thoughtful", color: PLUM, Icon: Moon },
  confused: { label: "Confused", color: TAN, Icon: HelpCircle },
};

const DURATIONS = [
  { key: "2h", label: "2 hours", tag: "2h" },
  { key: "4h", label: "4 hours", tag: "4h" },
  { key: "12h", label: "12 hours", tag: "12h" },
  { key: "forever", label: "Forever", tag: "\u221e" },
];

const GREETINGS = [
  "What's on your heart? \u2764\ufe0f", "What's your story? \ud83c\udf3f", "Want to talk about it? \ud83d\udcac",
  "What are you feeling? \ud83e\udd0d", "How are you feeling today? \ud83c\udf31", "How are you, really?",
  "What's been on your heart?", "Need someone to listen?", "Want to let it out?", "You're safe to share here.",
];

// ---- Opener (conversation-starter) feature ----
const OPENER_VIBES = ["Funny", "Chill", "Confident", "Shy", "Nerdy", "Sporty", "Artsy", "Deep thinker", "Adventurous"];
const OPENER_KNOW_VIA = ["College / school", "Common friend", "Gym", "Cafe / coffee shop", "Instagram / social media", "Dating app", "Work / colleague", "Neighbor", "Abhi bas mile hain", "Other"];
const OPENER_PLATFORMS = ["Instagram DM", "WhatsApp", "Snapchat", "Dating app", "In person", "Other"];
const OPENER_INTENTS = ["Bas dosti karni hai", "Interested hoon, kuch aage badhe", "Pata nahi, dekhte hain"];
const OPENER_STAGES = ["Bilkul pehla message hai (stranger)", "Thodi baat hui hai (2-3 baar)", "Already dost ho", "Bestie ho, ab kuch aur try karna hai"];
const OPENER_FAMILIARITY = ["Bas dekha hai, baat nahi hui", "1-2 baar baat ho chuki hai", "Thodi jaan-pehchaan hai", "Achi tarah jaante ho"];
const OPENER_TONES = ["Funny and playful", "Casual and friendly", "Bold and flirty", "Sweet and genuine", "Respectful and formal"];
const OPENER_FORM_DEFAULTS = {
  yourAge: "", yourVibe: [], theirName: "", theirAge: "", knowThemVia: "",
  howWellKnown: "", noticedSomething: "", platform: OPENER_PLATFORMS[0],
  intent: OPENER_INTENTS[0], stage: OPENER_STAGES[0], familiarity: OPENER_FAMILIARITY[0], tone: OPENER_TONES[1],
};

// Builds 3 tailored opener suggestions entirely on-device — no API key needed.
// Every line is written to avoid gendered verb conjugation (uses "hai"/"tha"/
// "chahiye"/subjunctive forms), since the sender's gender isn't asked here.
// Only opener #1 leans on the "something noticed" detail — #2 and #3
// deliberately ignore it and instead blend every other field equally
// (how you know them, familiarity, intent, stage, platform, tone, vibe),
// so all 3 results don't converge on the same one detail.
function buildOpeners(form) {
  const name = (form.theirName || "").trim();
  const namePart = name ? `${name}, ` : "";
  const ctx = (form.noticedSomething || "").trim() || (form.howWellKnown || "").trim();
  const stage = form.stage || OPENER_STAGES[0];
  const stranger = stage.startsWith("Bilkul pehla");
  const friendsAlready = stage.includes("Already dost") || stage.includes("Bestie");
  const tone = form.tone || OPENER_TONES[1];
  const intent = form.intent || OPENER_INTENTS[0];
  const friendlyIntent = intent === OPENER_INTENTS[0];
  const openIntent = intent === OPENER_INTENTS[2];
  const familiarity = form.familiarity || OPENER_FAMILIARITY[0];
  const knowVia = (form.knowThemVia || "").trim();
  const g = tone === "Sweet and genuine" ? "Hii" : tone === "Respectful and formal" ? "Hi" : "Hey";
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const openers = [];

  // --- #1: anchored on the specific detail (only this one uses ctx) ---
  if (ctx) {
    const hookLine = pick([`${g} ${namePart}ek cheez batani thi.`, `${g} ${namePart}kuch din se ye baat dimaag mein thi.`]);
    const ctxSentence = ctx.charAt(0).toUpperCase() + ctx.slice(1);
    const ctxLine = ctxSentence + (/[.?!]$/.test(ctxSentence) ? "" : ".");
    const reactLine = pick(["Aisi cheezein kam hi milti hain jo genuinely interesting lagti hain.", "Bas isi wajah se text karne ka mann bana."]);
    const question = stranger ? "Thoda aur bata sakte ho iske baare mein?" : "Abhi bhi wahi chal raha hai ya kuch naya hua?";
    openers.push({
      style: "Unki baat pe based",
      message: [hookLine, ctxLine, reactLine, question].join("\n"),
      why: "Kisi specific cheez ka reference generic 'hi' se zyada asar karta hai — pata chalta hai tumne dhyan diya.",
    });
  } else {
    const l1 = stranger ? `${g} ${namePart}kaise ho?` : `${g} ${namePart}kaise chal raha hai sab?`;
    const l2 = "Bas soch raha tha hello kehna chahiye, formal introduction ki zaroorat nahi.";
    const l3 = knowVia && knowVia !== "Abhi bas mile hain" ? `Waise ${knowVia.toLowerCase()} ke through hi pehchaan hui thi humari, na?` : "Bas ek simple hello se shuru karte hain.";
    openers.push({
      style: "Simple aur seedha",
      message: [l1, l2, l3].join("\n"),
      why: "Low-pressure aur simple — koi expectation nahi banata, bas baat shuru karta hai.",
    });
  }

  // --- #2: equal blend of every other field, ctx intentionally skipped ---
  const familiarityLine = {
    "Bas dekha hai, baat nahi hui": "Abhi tak humari seedhi baat nahi hui hai, so soch raha tha chance le loon.",
    "1-2 baar baat ho chuki hai": "Pehle bhi thodi baat hui thi hum dono ki, socha continue kar lete hain.",
    "Thodi jaan-pehchaan hai": "Thodi jaan-pehchaan toh hai already, bas thoda aur jaanna chahta hoon.",
    "Achi tarah jaante ho": "Kaafi time se jaante hain ek dusre ko, phir bhi kabhi seedha pucha nahi tha.",
  }[familiarity] || "Socha ek baar seedha pooch hi loon.";
  const viaLine = knowVia && knowVia !== "Abhi bas mile hain" ? `${knowVia} ke through pata chala tha tumhare baare mein.` : "";
  const intentLine = friendlyIntent
    ? "Bas ek achi dosti banti dikh rahi hai, isliye baat kar raha hoon."
    : openIntent
      ? "Pata nahi kahan jayega ye baat, but shuru karne mein kya harj hai."
      : "Thoda aur jaanna chahta hoon tumhare baare mein.";
  const questionLine2 = pick(["Aajkal kya chal raha hai zindagi mein?", "Free time mein kya karna pasand hai?", "Weekend ka koi plan hai?"]);
  openers.push({
    style: "Sab kuch barabar weight",
    message: [`${g} ${namePart}${familiarityLine}`, viaLine, intentLine, questionLine2].filter(Boolean).join("\n"),
    why: "Ye tumhari saari details (kaise jaante ho, kitna jaante ho, kya chahte ho) ko barabar weight deta hai, kisi ek cheez pe zyada depend nahi karta.",
  });

  // --- #3: tone is the main driver, ctx intentionally skipped again ---
  const toneOpeners = {
    "Funny and playful": [`${namePart}okay ye thoda random lag sakta hai but hi.`, "Bas socha life mein thoda spontaneous banna chahiye.", friendsAlready ? "Kaafi din ho gaye proper baat kiye." : "Umeed hai ye awkward nahi lagega.", "Batao, kaisa chal raha hai sab?"],
    "Casual and friendly": [`${namePart}${g}, kaise ho?`, stranger ? "Socha ekdum casually hello bol doon." : "Bas yun hi text karne ka mann kar gaya.", "Koi badi baat nahi, bas check-in karna tha.", "Sab theek chal raha hai na aajkal?"],
    "Bold and flirty": [`${namePart}seedhe point pe aata hoon.`, "Tumse baat karne ka mann kaafi time se tha.", "Aakhir mein socha, try karne mein kya jaata hai.", "Baat karoge thodi?"],
    "Sweet and genuine": [`${namePart}ye thoda vulnerable lag sakta hai but keh raha hoon.`, "Tumhara energy genuinely accha lagta hai.", "Bas itna batana tha ki tumse baat karna accha lagega.", "Kaisa chal raha hai sab tumhara?"],
    "Respectful and formal": [`${g} ${namePart}umeed hai sab theek hoga.`, "Socha ek baar formally hello keh loon.", friendsAlready ? "Kaafi time se baat nahi hui hai." : "Agar sahi lage toh baat kar sakte hain.", "Kaisa chal raha hai sab aapka?"],
  };
  const toneLines = toneOpeners[tone] || toneOpeners["Casual and friendly"];
  openers.push({
    style: tone.replace(" and ", " & "),
    message: toneLines.filter(Boolean).join("\n"),
    why: `Tumne jo tone chuna (${tone.toLowerCase()}), usi awaaz mein poori tarah likha gaya hai.`,
  });

  return openers;
}

const NAME_POOL = ["Priya", "Rahul", "Ananya", "Karan", "Isha", "Vivaan", "Meera", "Aditya", "Nisha", "Rohan"];

// #6 (anonymous) — one auto-suggested question, picked from the mood of the post that started the thread
const ICEBREAKERS = {
  sad: "What's been the hardest part lately?",
  calm: "What's been keeping you grounded?",
  happy: "What sparked that feeling?",
  loved: "Who or what made you feel that way?",
  thoughtful: "What's been on your mind the most?",
  confused: "What would help make it clearer?",
};

// #1 (anonymous) — light auto-generated vibe line for a new (non-seed) thread
const VIBE_LINES = [
  "Mostly shares Thoughtful & Calm moods, usually late at night.",
  "Tends to post when things feel Happy, often in the mornings.",
  "Leans Sad & Confused lately, mostly after midnight.",
  "A mix of moods, but always thoughtful about it.",
];
function randomVibe() {
  return VIBE_LINES[Math.floor(Math.random() * VIBE_LINES.length)];
}

const EMOJIS = ["\u2764\ufe0f", "\ud83d\ude02", "\ud83e\udd79", "\ud83d\udd25", "\ud83d\ude22", "\ud83d\ude4f", "\ud83d\ude0d", "\ud83d\udc40", "\ud83d\ude29", "\ud83d\udc80", "\u2728", "\ud83d\ude05", "\ud83e\udee2", "\ud83d\ude2d", "\ud83e\udd72", "\ud83d\ude0c", "\ud83d\ude48", "\ud83d\udcaf", "\ud83e\udd0d", "\ud83c\udf19"];

// Demo-only placeholder list — swap for a real moderation API before shipping.
const BANNED_WORDS = ["idiot", "stupid", "worthless", "kill yourself", "hate you", "loser"];
function hasBannedWord(text) {
  const t = text.toLowerCase();
  return BANNED_WORDS.some((w) => t.includes(w));
}
function wordCount(str) {
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}
const BIO_WORD_LIMIT = 300;

// Keywords are comma-separated, capped at 10, and matched case-insensitively —
// so "SVVV", "svvv", and "SvVv" are all the same keyword to the matcher.
const MAX_KEYWORDS = 10;
function normalizeKeywords(raw) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, MAX_KEYWORDS);
}

const seedPosts = [
  // #1 (anonymous) — pinned, permanent post; always stays up and is separately editable from the Anonymous profile
  { id: 0, author: "you", mood: "thoughtful", text: "This is the one thing I always want people to know about me: I'm trying, even on the days it doesn't look like it.", time: "Pinned", isMine: true, duration: "forever", isPermanent: true },
  { id: 1, author: "anon_4821", mood: "sad", text: "Sitting in my hostel room at 2am wondering if I made the right call moving cities for this degree.", time: "2h ago", duration: "12h" },
  { id: 2, author: "anon_1190", mood: "happy", text: "Got my first freelance payment today. Nobody in my family knows I've been doing this on the side.", time: "4h ago", duration: "forever" },
  { id: 3, author: "you", mood: "thoughtful", text: "Some nights the group chat is loud and I still feel like the only one actually awake.", time: "6h ago", isMine: true, duration: "4h" },
  { id: 4, author: "anon_7734", mood: "confused", text: "Results tomorrow. I've rewritten this line five times because I don't know what I'm actually scared of.", time: "9h ago", duration: "2h" },
  // #3 — anon posts from a connected friend, visible on their profile once connected
  { id: 5, author: "anon_5502", mood: "calm", text: "Made chai for the whole floor at 1am and somehow that fixed my whole week.", time: "1d ago", duration: "forever" },
  { id: 6, author: "anon_5502", mood: "loved", text: "Found my old vinyl player in a box today. Playing the same record on repeat since.", time: "3d ago", duration: "forever" },
];

// friendStatus: "none" | "requested" (you asked) | "received" (they asked) | "connected" (mutual)
const seedThreads = [
  {
    id: "t1", postId: 3, otherUser: "anon_5502", realName: "Meera", friendStatus: "connected",
    bio: "I collect vinyl records and I'm weirdly proud of my mediocre pasta. Rainy days are my favorite kind of day, and I will always stop for street dogs.",
    vibeSummary: "Mostly shares Thoughtful & Calm moods, usually late at night.",
    connectedAt: Date.now() - 3 * 86400000, nickname: "", privateNote: "",
    messages: [
      { id: "m1", from: "them", text: "i felt this way too much. some nights i just sit with my phone on silent, scrolling nothing.", seen: true },
      { id: "m2", from: "you", text: "exactly that. glad it's not just me.", seen: true },
      { id: "m2b", from: "them", text: "yeah. it's weird how loneliness can happen even in a full chat.", seen: true },
    ],
  },
  {
    id: "t2", postId: 4, otherUser: "anon_7734", realName: "Rohan", friendStatus: "received",
    bio: "Big fan of late-night cricket highlights and overly spicy chai. Learning guitar, badly, and not ashamed of it.",
    vibeSummary: "Leans Confused before results, Happy right after.",
    connectedAt: null, nickname: "", privateNote: "",
    messages: [
      { id: "m3", from: "you", text: "hey, results anxiety hits hard. you're not alone in this.", seen: true },
      { id: "m4", from: "them", text: "thank you, that actually means a lot right now.", seen: true },
    ],
  },
  {
    id: "t3", postId: 3, otherUser: "anon_2290", realName: "Karan", friendStatus: "none",
    bio: "", vibeSummary: "Posts mostly around 2-3am, usually Sad or Thoughtful.",
    connectedAt: null, nickname: "", privateNote: "",
    messages: [
      { id: "m5", from: "them", text: "i get this so much, the group chat thing hits different when everyone's \"here\" but not really.", seen: true },
    ],
  },
];

const PAGE_INTRO = {
  home: "See what people are feeling right now, and reach out anonymously.",
  messages: "Your private conversations — visible only to the two people in them.",
  notifications: "What's happened since you last checked.",
  opener: "Fill in a few details, get tailored lines to start the conversation.",
  profile: "Your two profiles — anonymous and connected.",
};

const FRIEND_STATUS_META = {
  connected: { bg: TEAL, text: "#0E6E63", label: "Connected", Icon: Check },
  requested: { bg: AMBER, text: "#8A6512", label: "Request sent", Icon: Clock },
  received: { bg: CORAL, text: "#B23B2E", label: "Wants to connect", Icon: UserPlus },
  none: { bg: PLUM, text: PLUM, label: "Anonymous chat", Icon: Lock },
};

function Logo({ height = 26 }) {
  const gradId = React.useId();
  return (
    <svg height={height} viewBox="0 0 260 360" style={{ width: "auto", display: "block" }} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DearStrangers">
      <defs>
        <linearGradient id={gradId} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#E0447F" />
          <stop offset="100%" stopColor="#8A1150" />
        </linearGradient>
      </defs>
      {/* heart */}
      <path d="M130,213.5 L115.5,200.3 C64,153.6 30,122.8 30,85 C30,54.2 54.2,30 85,30 C102.4,30 119.1,38.1 130,50.9 C140.9,38.1 157.6,30 175,30 C205.8,30 230,54.2 230,85 C230,122.8 196,153.6 144.5,200.3 Z" fill={`url(#${gradId})`} />
      {/* nib, blending into the heart's bottom point */}
      <path d="M130,205 C100,225 95,250 100,270 C103,285 112,300 130,340 C148,300 157,285 160,270 C165,250 160,225 130,205 Z" fill={`url(#${gradId})`} />
      <line x1="130" y1="238" x2="130" y2="318" stroke="#6B0C3E" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <circle cx="130" cy="250" r="6" fill="#6B0C3E" opacity="0.35" />
    </svg>
  );
}

// #8 — connection-length tags for connected threads (highest threshold reached wins)
const CONNECTION_TAGS = [
  { day: 100, label: "Day Ones", emoji: "\u{1F91D}" },
  { day: 60, label: "Trusted Friends", emoji: "\u{1F517}" },
  { day: 30, label: "Good Friends", emoji: "\u2728" },
  { day: 14, label: "Close Friends", emoji: "\ud83d\udc9c" },
  { day: 7, label: "Friends", emoji: "\ud83d\udc99" },
  { day: 3, label: "Acquaintance", emoji: "" },
  { day: 0, label: "New Connection", emoji: "" },
];
function getConnectionTag(days) {
  return CONNECTION_TAGS.find((t) => days >= t.day) || CONNECTION_TAGS[CONNECTION_TAGS.length - 1];
}
function daysConnected(connectedAt) {
  return connectedAt ? Math.max(0, Math.floor((Date.now() - connectedAt) / 86400000)) : 0;
}

// avatar shown for connected people (#5) — falls back to a color+initial
// when no photo is on file; swap avatarColorFor for real photo URLs in production.
const AVATAR_COLORS = [CORAL, TEAL, PLUM, SADBLUE, TAN];
function avatarColorFor(name) {
  let sum = 0;
  for (const c of (name || "?")) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
function Avatar({ name, pic, size = 40 }) {
  if (pic) return <img src={pic} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  const c = avatarColorFor(name);
  return (
    <div className="flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: "50%", background: gradient(c), color: "#fff", fontWeight: 700, fontSize: size * 0.4 }}>
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

// A friendly, stable label for an anonymous account. It never reveals part of
// the Supabase user ID, and the same account gets the same label everywhere.
// Two independent hashes pick the adjective/noun so a 24x24 pool (576 combos)
// stays well spread out instead of clustering the way a single shifted hash did.
const ANON_ADJECTIVES = [
  "Calm", "Gentle", "Quiet", "Kind", "Soft", "Brave", "Warm", "Thoughtful",
  "Curious", "Steady", "Bright", "Patient", "Honest", "Mellow", "Cheerful", "Wistful",
  "Serene", "Playful", "Earnest", "Tender", "Bold", "Dreamy", "Loyal", "Hopeful",
];
const ANON_NOUNS = [
  "Willow", "Lantern", "Cloud", "River", "Sparrow", "Moon", "Pebble", "Dawn",
  "Harbor", "Meadow", "Ember", "Comet", "Thistle", "Brook", "Falcon", "Aspen",
  "Tide", "Grove", "Sundial", "Wren", "Canyon", "Prairie", "Nebula", "Fern",
];
function anonymousHandleFor(id, suffix = 0) {
  const compact = String(id || "anonymous").replaceAll("-", "");
  let h1 = 0;
  let h2 = 0;
  for (const char of compact) {
    const code = char.charCodeAt(0);
    h1 = (h1 * 31 + code) >>> 0;
    h2 = (h2 * 131 + code) >>> 0;
  }
  const label = `${ANON_ADJECTIVES[h1 % ANON_ADJECTIVES.length]} ${ANON_NOUNS[h2 % ANON_NOUNS.length]}`;
  // suffix only kicks in if a caller explicitly needs to disambiguate a repeat.
  return suffix ? `${label} ${suffix}` : label;
}

function Badge({ status }) {
  const s = FRIEND_STATUS_META[status] || FRIEND_STATUS_META.none;
  const Icon = s.Icon;
  return (
    <span className="text-[11px] font-medium px-2 py-1 rounded-full flex items-center gap-1 shrink-0" style={{ backgroundColor: s.bg + "22", color: s.text }}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

export default function HeartLeakPrototype() {
  const [view, setView] = useState("home");
  const [posts, setPosts] = useState(seedPosts);
  const [authUserId, setAuthUserId] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [threads, setThreads] = useState(seedThreads);
  const [notifications, setNotifications] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activePostId, setActivePostId] = useState(null);
  const [composeText, setComposeText] = useState("");
  const [composeMood, setComposeMood] = useState("thoughtful");
  const [composeDuration, setComposeDuration] = useState("12h");
  const [openerForm, setOpenerForm] = useState(OPENER_FORM_DEFAULTS);
  const [openerResults, setOpenerResults] = useState(null);
  const [isGeneratingOpeners, setIsGeneratingOpeners] = useState(false);
  const [copiedOpenerIndex, setCopiedOpenerIndex] = useState(null);
  const [msgDraft, setMsgDraft] = useState("");
  const [toast, setToast] = useState("");
  const bottomRef = useRef(null);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  // #2 — emoji picker + lightweight extras in the chat composer
  const [showEmoji, setShowEmoji] = useState(false);

  // #7 — edit / delete (delete unlocks only once the message has been seen)
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [openMsgMenu, setOpenMsgMenu] = useState(null);

  // #3 — your personal "things I like" bio (shown on your connector profile)
  const [myBio, setMyBio] = useState("");
  const [editingBio, setEditingBio] = useState(false);

  // keyword matching — up to 10 tags on the anonymous profile; strangers who
  // share a keyword see this account's posts boosted in their feed.
  const [myKeywords, setMyKeywords] = useState([]);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [keywordsDraft, setKeywordsDraft] = useState("");

  // #5 — "how DearStrangers works" disappears 2 days after account creation.
  // Loaded from profiles.created_at (see the keywords/created_at effect below).
  // null until it loads, which keeps the tip hidden rather than flashing on
  // for returning users while the real value is still in flight.
  const [accountCreatedAt, setAccountCreatedAt] = useState(null);
  const daysSinceSignup = accountCreatedAt === null ? null : (Date.now() - accountCreatedAt) / (1000 * 60 * 60 * 24);

  // #6 — settings
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [notifPrefOn, setNotifPrefOn] = useState(true);
  const [settingsPanel, setSettingsPanel] = useState(null); // "blocked" | "report" | "logout" | "delete" | null
  const [reportText, setReportText] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [loggedOut, setLoggedOut] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);

  // #10 / view-profile page for the other person in a thread
  const [viewProfileConfirm, setViewProfileConfirm] = useState(null); // "block" | "report" | null

  // where a thread was opened from, so the back arrow returns to the right place
  const [threadOrigin, setThreadOrigin] = useState("messages"); // "messages" | "postInbox" | "notifications"

  // #6 — Messages tab: icon switch between Anonymous / Connected inboxes (like Insta)
  const [msgTab, setMsgTab] = useState("anon"); // "anon" | "connected"

  // #1 — first-login onboarding + the connected (real-identity) profile people fill in.
  const emptyProfile = { username: "", age: "", gender: "", pic: null, bio: "", privateBio: "" };
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [connectedProfile, setConnectedProfile] = useState(emptyProfile);
  const [onboardDraft, setOnboardDraft] = useState(emptyProfile);

  // Optional email recovery: lets someone get back to this exact anonymous
  // account from a new device/browser. Nothing here replaces the anonymous
  // identity — it just links an email to it via Supabase's
  // anonymous-user-to-permanent-user upgrade path.
  const [linkedEmail, setLinkedEmail] = useState(null);
  const [recoveryEmailDraft, setRecoveryEmailDraft] = useState("");
  const [isSendingRecoveryLink, setIsSendingRecoveryLink] = useState(false);
  const [recoveryLinkSent, setRecoveryLinkSent] = useState(false);
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [signInEmailDraft, setSignInEmailDraft] = useState("");
  const [isSendingSignInLink, setIsSendingSignInLink] = useState(false);
  const [signInLinkSent, setSignInLinkSent] = useState(false);

  // #2/#4 — Profile tab: switch between the Anonymous and Connected profile pages
  // (each with its own background theme — connected is dark, anonymous is untouched)
  const [profileTab, setProfileTab] = useState("anon"); // "anon" | "connected"
  const [editingConnectedProfile, setEditingConnectedProfile] = useState(false);
  const [connectedDraft, setConnectedDraft] = useState(emptyProfile);

  // "Only For People I Care About" — approval-gated section of the connected profile.
  // Per-thread fields (myThoughtAccessStatus / theirThought / incomingThoughtRequestStatus)
  // are attached to each thread alongside nickname/privateNote below.

  // #1 (anonymous) — the one pinned, permanent post is edited in place from the profile
  const [editingPermanentPost, setEditingPermanentPost] = useState(false);
  const [permanentDraft, setPermanentDraft] = useState("");

  // connector profile: nickname + private note editing
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // Every visitor receives one private Supabase identity. It is never shown in the UI.
  useEffect(() => {
    let active = true;

    async function ensureAnonymousIdentity() {
      // Reuse the browser's existing session first so returning visitors do not
      // wait for an unnecessary extra auth round trip before seeing the site.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const user = sessionData.session.user;
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          anonymous_handle: anonymousHandleFor(user.id),
        });
        if (profileError) {
          if (active) setToast(`Profile setup issue: ${profileError.message}`);
          if (active) setIsProfileLoading(false);
          return;
        }
        if (active) setLinkedEmail(user.email || null);
        setAuthUserId(user.id);
        return;
      }

      // A browser can keep an old local session after a project or account has changed.
      await supabase.auth.signOut({ scope: "local" });

      if (!anonymousSignInPromise) {
        anonymousSignInPromise = supabase.auth.signInAnonymously();
      }

      const { data: signInData, error } = await anonymousSignInPromise;
      if (error) anonymousSignInPromise = null;
      if (active && error) {
        console.error("Could not create an anonymous HeartLeak account:", error.message);
        setToast(`Anonymous sign-in issue: ${error.message}`);
        setIsProfileLoading(false);
      } else if (active) {
        const userId = signInData.user.id;
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          anonymous_handle: anonymousHandleFor(userId),
        });
        if (profileError) {
          setToast(`Profile setup issue: ${profileError.message}`);
          setIsProfileLoading(false);
          return;
        }
        setAuthUserId(userId);
        setToast("Private anonymous account created and verified");
      }
    }

    ensureAnonymousIdentity();
    return () => { active = false; };
  }, []);

  // Picks up two things automatically: (1) the linked-email confirmation
  // redirect after "Save this account" in Settings, and (2) a full switch to
  // a different (recovered) account after "Sign in with email" — Supabase
  // swaps the active session in place, so this just follows it.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLinkedEmail(session?.user?.email || null);
      if (session?.user?.id) {
        setAuthUserId((prev) => (prev === session.user.id ? prev : session.user.id));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUserId) return;

    async function loadSavedPosts() {
      // profiles(keywords) rides along on the same query so the feed can
      // boost/badge posts whose author shares a keyword with the viewer.
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, mood, body, expires_at, is_pinned, created_at, profiles(keywords)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Could not load saved posts:", error.message);
        return;
      }

      const now = Date.now();
      const savedPosts = data
        // A post is only meant to stay visible for its chosen duration.
        // Drop anything expired (pinned posts never expire) instead of
        // letting the RLS "you can always see your own row" rule make it
        // look like it's still live in the feed.
        .filter((post) => post.is_pinned || !post.expires_at || new Date(post.expires_at).getTime() > now)
        .map((post) => {
          let duration = "forever";
          if (post.expires_at) {
            const hoursTotal = Math.round((new Date(post.expires_at) - new Date(post.created_at)) / 3600000);
            duration = hoursTotal <= 2 ? "2h" : hoursTotal <= 4 ? "4h" : "12h";
          }
          return {
            id: post.id,
            authorId: post.author_id,
            author: post.author_id === authUserId ? "you" : anonymousHandleFor(post.author_id),
            mood: post.mood,
            text: post.body,
            time: new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            isMine: post.author_id === authUserId,
            duration,
            isPermanent: post.is_pinned,
            expiresAt: post.expires_at,
            authorKeywords: post.profiles?.keywords || [],
          };
        });
      // Demo/sample posts are prototype filler only. Once real posts are loaded,
      // never mix fake demo content back into the feed — except the pinned
      // placeholder, which stays until the account has saved its own pinned post.
      const hasOwnPinnedPost = savedPosts.some((p) => p.isPermanent);
      const pinnedPlaceholder = hasOwnPinnedPost ? [] : seedPosts.filter((p) => p.isPermanent);
      setPosts([...pinnedPlaceholder, ...savedPosts]);
    }

    loadSavedPosts();

    // Also prune anything that expires while the app stays open, so a post
    // doesn't linger past its chosen duration until the next reload.
    const pruneTimer = setInterval(() => {
      setPosts((prev) => prev.filter((p) => p.isPermanent || !p.expiresAt || new Date(p.expiresAt).getTime() > Date.now()));
    }, 60000);
    return () => clearInterval(pruneTimer);
  }, [authUserId]);

  // Conversations are loaded from the existing connections and messages tables.
  // The migration in supabase/2026-08-14-anonymous-conversations.sql enables
  // pending (anonymous) conversations as well as accepted connections.
  useEffect(() => {
    if (!authUserId) return;

    async function loadConversations() {
      const { data: connectionData, error: connectionError } = await supabase
        .from("connections")
        .select("id, requester_id, recipient_id, status, post_id, friend_requested_by, connected_at")
        .or(`requester_id.eq.${authUserId},recipient_id.eq.${authUserId}`)
        .neq("status", "blocked")
        .order("created_at", { ascending: false });

      if (connectionError) {
        console.error("Could not load conversations:", connectionError.message);
        return;
      }
      if (!connectionData?.length) {
        setThreads([]);
        setNotifications([]);
        return;
      }

      const connectionIds = connectionData.map((connection) => connection.id);
      const otherIds = connectionData.map((connection) => connection.requester_id === authUserId ? connection.recipient_id : connection.requester_id);
      const [{ data: messageData, error: messageError }, { data: profileData }, { data: connectedProfileData }, { data: notificationData, error: notificationError }, { data: theirThoughtsData }, { data: myThoughtAccessData }, { data: incomingThoughtAccessData }] = await Promise.all([
        supabase.from("messages").select("id, connection_id, sender_id, body, created_at, edited_at, deleted_at, seen_at").in("connection_id", connectionIds).order("created_at", { ascending: true }),
        supabase.from("profiles").select("id, anonymous_handle").in("id", otherIds),
        // RLS only returns rows for people you're actually mutually connected with.
        supabase.from("connected_profiles").select("id, username, bio").in("id", otherIds),
        supabase.from("notifications").select("id, type, connection_id, created_at").eq("recipient_id", authUserId).order("created_at", { ascending: false }),
        // "Only For People I Care About" — RLS silently returns content only for owners who've approved you (or yourself).
        supabase.from("private_thoughts").select("id, content").in("id", otherIds),
        // Your own outgoing requests to see other people's care-about content.
        supabase.from("private_thought_access").select("owner_id, status").eq("viewer_id", authUserId).in("owner_id", otherIds),
        // Requests other people have sent you, asking to see YOUR care-about content.
        supabase.from("private_thought_access").select("viewer_id, status, requested_at").eq("owner_id", authUserId),
      ]);
      if (messageError) {
        console.error("Could not load messages:", messageError.message);
        return;
      }

      const handles = new Map((profileData || []).map((profile) => [profile.id, profile.anonymous_handle]));
      const connectedProfiles = new Map((connectedProfileData || []).map((p) => [p.id, p]));
      const theirThoughts = new Map((theirThoughtsData || []).map((t) => [t.id, t.content]));
      const myThoughtAccess = new Map((myThoughtAccessData || []).map((a) => [a.owner_id, a.status]));
      const incomingThoughtAccess = new Map((incomingThoughtAccessData || []).map((a) => [a.viewer_id, { status: a.status, requestedAt: a.requested_at }]));
      const messagesByConnection = new Map();
      for (const message of messageData || []) {
        const messages = messagesByConnection.get(message.connection_id) || [];
        messages.push({
          id: message.id,
          from: message.sender_id === authUserId ? "you" : "them",
          text: message.body,
          // Only messages you sent carry a meaningful read receipt — it reflects
          // whether the other person has actually opened the conversation.
          seen: message.sender_id === authUserId ? Boolean(message.seen_at) : true,
          edited: Boolean(message.edited_at),
          deleted: Boolean(message.deleted_at),
        });
        messagesByConnection.set(message.connection_id, messages);
      }

      const loadedThreads = connectionData.map((connection) => {
        const otherUserId = connection.requester_id === authUserId ? connection.recipient_id : connection.requester_id;
        const friendStatus = connection.status === "accepted"
          ? "connected"
          : connection.friend_requested_by
            ? connection.friend_requested_by === authUserId ? "requested" : "received"
            : "none";
        const theirConnectedProfile = connectedProfiles.get(otherUserId);
        const incoming = incomingThoughtAccess.get(otherUserId);
        return {
          id: connection.id,
          postId: connection.post_id,
          otherUserId,
          otherUser: handles.get(otherUserId) || "Anonymous",
          realName: (friendStatus === "connected" && theirConnectedProfile?.username) || handles.get(otherUserId) || "Anonymous",
          friendStatus,
          bio: (friendStatus === "connected" && theirConnectedProfile?.bio) || "",
          vibeSummary: "",
          connectedAt: connection.connected_at ? new Date(connection.connected_at).getTime() : null,
          nickname: "",
          privateNote: "",
          // "Only For People I Care About" — your request status toward them + their content (once approved).
          myThoughtAccessStatus: myThoughtAccess.get(otherUserId) || "none",
          theirThought: theirThoughts.get(otherUserId) || "",
          // their request status toward YOUR content, if they've asked
          incomingThoughtRequestStatus: incoming?.status || "none",
          incomingThoughtRequestedAt: incoming?.requestedAt || null,
          messages: messagesByConnection.get(connection.id) || [],
        };
      });
      setThreads(loadedThreads);

      // Saved notifications keep an Alert available after a request is accepted.
      // Conversation-derived items remain a fallback for older records.
      const threadsById = new Map(loadedThreads.map((thread) => [thread.id, thread]));
      const savedAlertItems = notificationError ? [] : (notificationData || []).flatMap((notification) => {
        const thread = threadsById.get(notification.connection_id);
        if (!thread) return [];
        const notifText = {
          connected: `${thread.otherUser} accepted your friend request`,
          access_requested: `${thread.otherUser} wants to see "Only For People I Care About"`,
          access_granted: `${thread.otherUser} gave you access to "Only For People I Care About"`,
        }[notification.type] || `${thread.otherUser} wants to add you as a friend`;
        return [{
          id: notification.id,
          type: notification.type,
          threadId: thread.id,
          otherUserId: thread.otherUserId,
          text: notifText,
          time: new Date(notification.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        }];
      });
      const savedFriendThreadIds = new Set(savedAlertItems.filter((item) => item.type === "friend_request").map((item) => item.threadId));
      const fallbackAlertItems = loadedThreads.flatMap((thread) => {
        if (thread.friendStatus === "received") {
          if (savedFriendThreadIds.has(thread.id)) return [];
          return [{
            id: `friend-request-${thread.id}`,
            type: "friend_request",
            threadId: thread.id,
            text: `${thread.otherUser} wants to add you as a friend`,
            time: "New",
          }];
        }
        const firstIncoming = thread.messages.find((message) => message.from === "them" && !message.deleted);
        if (firstIncoming) {
          return [{
            id: `reply-${thread.id}`,
            type: "reached_post",
            threadId: thread.id,
            postId: thread.postId,
            text: `${thread.otherUser} reached out in an anonymous chat`,
            time: "New",
          }];
        }
        return [];
      });
      setNotifications([...savedAlertItems, ...fallbackAlertItems]);
    }

    loadConversations();
    // When Realtime is enabled for these tables, a friend request reaches the
    // recipient's Alerts immediately. The focus and interval refreshes below
    // remain as a reliable fallback for existing projects without Realtime.
    const conversationChannel = supabase
      .channel(`heartleak-conversations-${authUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, loadConversations)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadConversations)
      .subscribe();
    const refreshTimer = window.setInterval(loadConversations, 15000);
    window.addEventListener("focus", loadConversations);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", loadConversations);
      supabase.removeChannel(conversationChannel);
    };
  }, [authUserId]);

  // This information stays private to the current anonymous account under RLS.
  useEffect(() => {
    if (!authUserId) return;

    async function fetchPrivateProfile() {
      return Promise.all([
        supabase.from("private_profiles").select("username, age, gender, bio").eq("id", authUserId).maybeSingle(),
        // "Only For People I Care About" content now lives in its own table (access-controlled).
        supabase.from("private_thoughts").select("content").eq("id", authUserId).maybeSingle(),
      ]);
    }

    async function loadPrivateProfile() {
      let [{ data, error }, { data: thoughtData }] = await fetchPrivateProfile();

      // A stale/expired access token on reload can make this select fail even though
      // the row exists. Force a session refresh and retry once before giving up —
      // otherwise the user silently gets dropped back to onboarding.
      if (error) {
        console.error("Could not load private profile, retrying after session refresh:", error.message);
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          [{ data, error }, { data: thoughtData }] = await fetchPrivateProfile();
        }
      }

      if (error) {
        console.error("Could not load private profile after retry:", error.message);
        setToast("Couldn't restore your profile — check your connection and refresh again");
        setIsProfileLoading(false);
        return;
      }
      if (!data) {
        setIsProfileLoading(false);
        return;
      }

      const profile = {
        username: data.username || "",
        age: data.age ? String(data.age) : "",
        gender: data.gender || "",
        pic: null,
        bio: data.bio || "",
        privateBio: thoughtData?.content || "",
      };
      setConnectedProfile(profile);
      setOnboardDraft(profile);
      setHasOnboarded(Boolean(profile.username && profile.age && profile.gender));
      setIsProfileLoading(false);
    }

    loadPrivateProfile();
  }, [authUserId]);

  // Own keyword tags + real signup date — both live on the public "profiles"
  // row (keywords need to be readable by others for matching; created_at is
  // set once by the DB on insert and never touched again).
  useEffect(() => {
    if (!authUserId) return;

    supabase.from("profiles").select("keywords, created_at").eq("id", authUserId).maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not load your profile extras:", error.message);
          return;
        }
        const kws = data?.keywords || [];
        setMyKeywords(kws);
        setKeywordsDraft(kws.join(", "));
        setAccountCreatedAt(data?.created_at ? new Date(data.created_at).getTime() : Date.now());
      });
  }, [authUserId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  // Back-button history sync: every in-app screen change pushes a browser
  // history entry, so the hardware/browser back button steps back through
  // HeartLeak's own screens instead of immediately exiting the app. Only
  // exits once the user is already on "home" and presses back again.
  const viewHistoryRef = useRef(["home"]);
  useEffect(() => {
    const stack = viewHistoryRef.current;
    if (stack[stack.length - 1] !== view) {
      stack.push(view);
      window.history.pushState({ heartleakView: view }, "");
    }
  }, [view]);
  useEffect(() => {
    function handlePopState() {
      const stack = viewHistoryRef.current;
      if (stack.length > 1) {
        stack.pop();
        setView(stack[stack.length - 1]);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (view === "thread") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [view, threads, activeThreadId]);

  // Real read receipts: mark the other person's messages as seen the moment
  // you actually open the thread, no matter how you navigated there.
  useEffect(() => {
    if (view !== "thread" || !activeThreadId || !authUserId) return;
    supabase.rpc("mark_connection_messages_seen", { target_connection_id: activeThreadId })
      .then(({ error }) => {
        if (error) console.error("Could not mark messages seen:", error.message);
      });
  }, [view, activeThreadId, authUserId]);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // #4/#5 fix — safety net. If we ever land on "thread" or "viewProfile"
  // while the thread they point to doesn't exist anymore (blocked, deleted,
  // removed by a realtime update, or replayed via browser back/swipe-back
  // history), those screens have nothing to render and the app goes blank.
  // Bounce back to Messages instead of showing an empty page.
  useEffect(() => {
    if ((view === "thread" || view === "viewProfile") && activeThreadId && !activeThread) {
      setView("messages");
    }
  }, [view, activeThreadId, activeThread]);

  const threadForPost = (postId) => threads.find((t) => t.postId === postId);
  // #1 (new) — every reply thread on one of your own posts, for the owner-only inbox
  const repliesForPost = (postId) => threads.filter((t) => t.postId === postId);
  // nickname (if set) always wins; otherwise real name once connected, else the anon handle
  const displayName = (t) => (t ? t.nickname || (t.friendStatus === "connected" ? t.realName : t.otherUser) : "");

  function openOrStartThread(postId) {
    const existing = threadForPost(postId);
    setThreadOrigin("messages");
    if (existing) { setActiveThreadId(existing.id); setView("thread"); }
    else { setActivePostId(postId); setMsgDraft(""); setView("newReply"); }
  }

  function goBackFromThread() {
    if (threadOrigin === "postInbox") setView("postInbox");
    else if (threadOrigin === "notifications") setView("notifications");
    else setView("messages");
  }

  // #3 — tapping a notification jumps straight into the relevant chat
  function openNotification(n) {
    if (n.type === "access_requested") {
      // The approve/deny control lives on your own profile, not their thread.
      setProfileTab("connected");
      setView("profile");
      return;
    }
    if (!n.threadId || !threads.find((t) => t.id === n.threadId)) return;
    setThreadOrigin("notifications");
    setActiveThreadId(n.threadId);
    setView("thread");
  }

  function openNickname() { setNicknameDraft(activeThread?.nickname || ""); setEditingNickname(true); }
  function saveNickname() {
    setThreads((prev) => prev.map((t) => (t.id === activeThread.id ? { ...t, nickname: nicknameDraft.trim() } : t)));
    setEditingNickname(false);
    setToast(nicknameDraft.trim() ? "Nickname saved" : "Nickname removed");
  }
  function openNote() { setNoteDraft(activeThread?.privateNote || ""); setEditingNote(true); }
  function saveNote() {
    setThreads((prev) => prev.map((t) => (t.id === activeThread.id ? { ...t, privateNote: noteDraft } : t)));
    setEditingNote(false);
    setToast("Note saved");
  }

  async function sendFirstReply() {
    if (!msgDraft.trim()) return;
    const post = posts.find((item) => item.id === activePostId);
    if (!authUserId || !post?.authorId) {
      setToast("This sample post cannot receive a real reply.");
      return;
    }
    if (post.authorId === authUserId) {
      setToast("You cannot reply to your own post.");
      return;
    }
    if (hasBannedWord(msgDraft)) { setToast("Please rephrase to keep DearStrangers kind."); return; }

    const { data: conversation, error: conversationError } = await supabase
      .from("connections")
      .insert({ requester_id: authUserId, recipient_id: post.authorId, post_id: post.id })
      .select("id")
      .single();
    if (conversationError) {
      console.error("Could not start conversation:", conversationError.message);
      setToast(`Couldn't start the conversation: ${conversationError.message}`);
      return;
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({ connection_id: conversation.id, sender_id: authUserId, body: msgDraft.trim() })
      .select("id, body")
      .single();
    if (messageError) {
      console.error("Could not send first reply:", messageError.message);
      setToast(`Couldn't send the reply: ${messageError.message}`);
      return;
    }

    const newThread = {
      id: conversation.id, postId: post.id, otherUserId: post.authorId, otherUser: post.author, realName: post.author,
      friendStatus: "none", bio: "", vibeSummary: "", connectedAt: null, nickname: "", privateNote: "",
      messages: [{ id: message.id, from: "you", text: message.body, seen: true }],
    };
    setThreads((prev) => [...prev, newThread]);
    setThreadOrigin("messages");
    setActiveThreadId(conversation.id);
    setMsgDraft("");
    setToast("Sent — only they can read this");
    setView("thread");
  }

  async function sendInThread() {
    if (!msgDraft.trim() || !activeThread) return;
    if (!authUserId) return;
    if (hasBannedWord(msgDraft)) { setToast("Please rephrase to keep DearStrangers kind."); return; }

    if (editingMsgId) {
      const { error } = await supabase.from("messages")
        .update({ body: msgDraft.trim(), edited_at: new Date().toISOString() })
        .eq("id", editingMsgId)
        .eq("sender_id", authUserId);
      if (error) {
        setToast(`Message couldn't be edited: ${error.message}`);
        return;
      }
      setThreads((prev) => prev.map((thread) => thread.id === activeThread.id
        ? { ...thread, messages: thread.messages.map((message) => message.id === editingMsgId ? { ...message, text: msgDraft.trim(), edited: true } : message) }
        : thread));
      setEditingMsgId(null);
      setMsgDraft("");
      setToast("Message edited");
      return;
    }

    const { data, error } = await supabase.from("messages")
      .insert({ connection_id: activeThread.id, sender_id: authUserId, body: msgDraft.trim() })
      .select("id, body")
      .single();
    if (error) {
      setToast(`Message couldn't be sent: ${error.message}`);
      return;
    }
    setThreads((prev) => prev.map((thread) => thread.id === activeThread.id
      ? { ...thread, messages: [...thread.messages, { id: data.id, from: "you", text: data.body, seen: true }] }
      : thread));
    setMsgDraft("");
    setShowEmoji(false);
  }

  function startEditMessage(m) {
    setEditingMsgId(m.id);
    setMsgDraft(m.text);
    setOpenMsgMenu(null);
  }
  function cancelEdit() {
    setEditingMsgId(null);
    setMsgDraft("");
  }
  async function deleteMessage(m) {
    if (!m.seen) { setToast("You can delete this once they've seen it"); setOpenMsgMenu(null); return; }
    if (!authUserId || !activeThread) return;
    const { error } = await supabase.from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", m.id)
      .eq("sender_id", authUserId);
    if (error) {
      setToast(`Message couldn't be deleted: ${error.message}`);
      return;
    }
    setThreads((prev) => prev.map((thread) => thread.id === activeThread.id
      ? { ...thread, messages: thread.messages.map((message) => message.id === m.id ? { ...message, deleted: true, text: "" } : message) }
      : thread));
    setOpenMsgMenu(null);
    setToast("Message deleted");
    return;
    setThreads((prev) => prev.map((t) => t.id === activeThread.id
      ? { ...t, messages: t.messages.map((x) => (x.id === m.id ? { ...x, deleted: true, text: "" } : x)) }
      : t));
    setOpenMsgMenu(null);
    setToast("Message deleted");
  }
  function insertEmoji(e) {
    setMsgDraft((prev) => prev + e);
  }

  // #4 — add friend is now a two-way request. Pressing it sends a request;
  // the 2nd (real-identity) profile only unlocks once the other side adds back.
  // The setTimeout below simulates that acceptance for the demo — replace with
  // a real request/accept row + realtime listener (e.g. Supabase) in production.
  async function addFriend() {
    if (!activeThread) return;
    if (!authUserId) return;
    const { error } = await supabase.from("connections")
      .update({ friend_requested_by: authUserId })
      .eq("id", activeThread.id);
    if (error) {
      setToast(`Friend request couldn't be sent: ${error.message}`);
      return;
    }
    setThreads((prev) => prev.map((thread) => thread.id === activeThread.id ? { ...thread, friendStatus: "requested" } : thread));
    setToast("Friend request sent");
    return;
    const tid = activeThread.id;
    const rname = activeThread.realName;
    setThreads((prev) => prev.map((t) => (t.id === tid ? { ...t, friendStatus: "requested" } : t)));
    setToast("Friend request sent");
    setTimeout(() => {
      setThreads((prev) => prev.map((t) => (t.id === tid ? { ...t, friendStatus: "connected", connectedAt: Date.now() } : t)));
      setNotifications((prev) => [{ id: Date.now(), type: "connected", threadId: tid, text: `${rname} added you back — you're connected!`, time: "just now" }, ...prev]);
      setToast(`Connected with ${rname}`);
    }, 4500);
  }

  async function addBack(threadId) {
    const t = threads.find((x) => x.id === threadId);
    if (!t) return;
    const connectedAt = new Date().toISOString();
    const { error } = await supabase.from("connections")
      .update({ status: "accepted", connected_at: connectedAt })
      .eq("id", threadId);
    if (error) {
      setToast(`Connection couldn't be accepted: ${error.message}`);
      return;
    }
    setThreads((prev) => prev.map((thread) => thread.id === threadId ? { ...thread, friendStatus: "connected", connectedAt: new Date(connectedAt).getTime() } : thread));
    setToast(`Connected with ${t.otherUser}`);
    return;
    setThreads((prev) => prev.map((x) => (x.id === threadId ? { ...x, friendStatus: "connected", connectedAt: Date.now() } : x)));
    setNotifications((prev) => [{ id: Date.now(), type: "connected", threadId, text: `You and ${t.realName} are now connected`, time: "just now" }, ...prev]);
    setToast(`Connected with ${t.realName}`);
  }

  // "Only For People I Care About" — ask a connected person for access to their care-about content.
  async function requestThoughtAccess(otherUserId) {
    if (!authUserId || !otherUserId) return;
    const { error } = await supabase.from("private_thought_access").insert({ owner_id: otherUserId, viewer_id: authUserId });
    if (error) {
      setToast(`Couldn't send request: ${error.message}`);
      return;
    }
    setThreads((prev) => prev.map((t) => (t.otherUserId === otherUserId ? { ...t, myThoughtAccessStatus: "pending" } : t)));
    setToast("Request sent");
  }
  // Approve or deny someone who's asked to see YOUR care-about content.
  async function respondThoughtAccess(viewerId, decision) {
    if (!authUserId || !viewerId) return;
    const { error } = await supabase.from("private_thought_access")
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq("owner_id", authUserId).eq("viewer_id", viewerId);
    if (error) {
      setToast(`Couldn't update that request: ${error.message}`);
      return;
    }
    setThreads((prev) => prev.map((t) => (t.otherUserId === viewerId ? { ...t, incomingThoughtRequestStatus: decision } : t)));
    setToast(decision === "approved" ? "Access granted" : "Request declined");
  }

  async function blockPerson(name) {
    if (authUserId && activeThread?.otherUserId) {
      const { error } = await supabase.from("blocks").upsert({ blocker_id: authUserId, blocked_id: activeThread.otherUserId });
      if (error) {
        setToast(`Couldn't block this person: ${error.message}`);
        return;
      }
      await supabase.from("connections").update({ status: "blocked" }).eq("id", activeThread.id);
      setThreads((prev) => prev.filter((thread) => thread.id !== activeThread.id));
      // #4/#5 fix — the thread we were just looking at no longer exists.
      // Clear the pointer immediately so `activeThread` can't resolve to a
      // stale/removed thread if the view ever lands back on "thread" or
      // "viewProfile" (e.g. via browser back / swipe-back).
      setActiveThreadId(null);
    }
    setBlockedUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setToast(`Blocked ${name}`);
    setViewProfileConfirm(null);
    setView("messages");
  }
  async function reportPerson(name) {
    if (authUserId && activeThread?.otherUserId) {
      const reason = reportText.trim() || "Reported from the conversation profile";
      const { error } = await supabase.from("reports").insert({
        reporter_id: authUserId,
        target_type: "profile",
        target_id: activeThread.otherUserId,
        reason,
      });
      if (error) {
        setToast(`Couldn't submit the report: ${error.message}`);
        return;
      }
    }
    setToast(`Reported ${name} — our team will review it`);
    setViewProfileConfirm(null);
  }

  function handleBioChange(e) {
    const val = e.target.value;
    if (wordCount(val) <= BIO_WORD_LIMIT) setMyBio(val);
    else setToast(`${BIO_WORD_LIMIT} word limit reached`);
  }

  // keyword matching — comma-separated input, capped + de-duped + lowercased on save
  async function saveKeywords() {
    if (!authUserId) return;
    const cleaned = normalizeKeywords(keywordsDraft);
    const { error } = await supabase.from("profiles").update({ keywords: cleaned }).eq("id", authUserId);
    if (error) {
      console.error("Could not save keywords:", error.message);
      setToast(`Keywords couldn't be saved: ${error.message}`);
      return;
    }
    setMyKeywords(cleaned);
    setKeywordsDraft(cleaned.join(", "));
    setEditingKeywords(false);
    setToast(cleaned.length ? "Keywords updated" : "Keywords cleared");
  }

  // Only the top few overlapping keywords are ever shown on a post, so a
  // stranger sees "why this matched" without their whole tag list leaking.
  function matchedKeywordsFor(post) {
    if (!post.authorKeywords?.length || !myKeywords.length) return [];
    return post.authorKeywords.filter((k) => myKeywords.includes(k)).slice(0, 3);
  }

  // Link an email to the current anonymous account (Settings screen) so it
  // can be recovered on another device later. Supabase upgrades the
  // anonymous user to a permanent one on confirmation — same user id, so
  // every post/connection/keyword already saved stays attached to it.
  async function sendRecoveryLink() {
    const email = recoveryEmailDraft.trim();
    if (!email) { setToast("Enter an email address"); return; }
    setIsSendingRecoveryLink(true);
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: window.location.origin }
    );
    setIsSendingRecoveryLink(false);
    if (error) {
      console.error("Could not send recovery link:", error.message);
      setToast(`Couldn't send that: ${error.message}`);
      return;
    }
    setRecoveryLinkSent(true);
    setToast("Check your inbox to confirm");
  }

  // Sign in on a new device/browser with a previously-linked email — sends a
  // magic link; opening it here swaps this tab's session onto that account.
  async function sendSignInLink() {
    const email = signInEmailDraft.trim();
    if (!email) { setToast("Enter an email address"); return; }
    setIsSendingSignInLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setIsSendingSignInLink(false);
    if (error) {
      console.error("Could not send sign-in link:", error.message);
      setToast(`Couldn't send that: ${error.message}`);
      return;
    }
    setSignInLinkSent(true);
    setToast("Check your inbox for a sign-in link");
  }

  // #1 — onboarding: first-login form filling out the connected profile
  async function completeOnboarding() {
    if (!onboardDraft.username.trim() || !onboardDraft.age || !onboardDraft.gender) {
      setToast("Add your username, age, and gender to continue");
      return;
    }
    if (!authUserId) {
      setToast("Your private account is still connecting. Please try again in a moment.");
      return;
    }
    const { error } = await supabase.from("private_profiles").upsert({
      id: authUserId,
      username: onboardDraft.username.trim(),
      age: Number(onboardDraft.age),
      gender: onboardDraft.gender,
      bio: onboardDraft.bio.trim() || null,
    });
    if (error) {
      console.error("Could not save private profile:", error.message);
      setToast(`Profile couldn't be saved: ${error.message}`);
      return;
    }
    const { error: thoughtError } = await supabase.from("private_thoughts").upsert({ id: authUserId, content: onboardDraft.privateBio.trim() || null });
    if (thoughtError) console.error("Could not save care-about content:", thoughtError.message);
    setConnectedProfile(onboardDraft);
    setHasOnboarded(true);
    setToast("Welcome to DearStrangers");
  }

  // #2 — connected profile: username, age, photo, gender, both bios
  function startEditConnectedProfile() {
    setConnectedDraft(connectedProfile);
    setEditingConnectedProfile(true);
  }
  async function saveConnectedProfile() {
    if (!connectedDraft.username.trim() || !connectedDraft.age || !connectedDraft.gender) {
      setToast("Username, age, and gender can't be empty");
      return;
    }
    if (!authUserId) return;
    const { error } = await supabase.from("private_profiles").upsert({
      id: authUserId,
      username: connectedDraft.username.trim(),
      age: Number(connectedDraft.age),
      gender: connectedDraft.gender,
      bio: connectedDraft.bio.trim() || null,
    });
    if (error) {
      console.error("Could not update private profile:", error.message);
      setToast(`Profile couldn't be updated: ${error.message}`);
      return;
    }
    const { error: thoughtError } = await supabase.from("private_thoughts").upsert({ id: authUserId, content: connectedDraft.privateBio.trim() || null });
    if (thoughtError) console.error("Could not update care-about content:", thoughtError.message);
    setConnectedProfile(connectedDraft);
    setEditingConnectedProfile(false);
    setToast("Profile updated");
  }
  // shared by onboarding + edit-profile forms; targetSetter is whichever draft is active
  function handlePrivateBioChange(e, targetSetter) {
    const val = e.target.value;
    if (wordCount(val) <= BIO_WORD_LIMIT) targetSetter((prev) => ({ ...prev, privateBio: val }));
    else setToast(`${BIO_WORD_LIMIT} word limit reached`);
  }
  function handlePicUpload(e, targetSetter) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => targetSetter((prev) => ({ ...prev, pic: reader.result }));
    reader.readAsDataURL(file);
  }

  // #1 (anonymous) — edit the single pinned permanent post
  function startEditPermanentPost() {
    const p = posts.find((x) => x.isPermanent);
    setPermanentDraft(p ? p.text : "");
    setEditingPermanentPost(true);
  }
  function savePermanentPost() {
    if (!permanentDraft.trim()) { setToast("Your permanent post can't be empty"); return; }
    if (hasBannedWord(permanentDraft)) { setToast("Let's keep DearStrangers kind — please rephrase."); return; }
    setPosts((prev) => prev.map((p) => (p.isPermanent ? { ...p, text: permanentDraft.trim() } : p)));
    setEditingPermanentPost(false);
    setToast("Permanent post updated");
  }

  async function publishPost() {
    if (!composeText.trim()) return;
    if (!authUserId) {
      setToast("Your private account is still connecting. Please try again in a moment.");
      return;
    }
    if (hasBannedWord(composeText)) { setToast("Please rephrase to keep DearStrangers kind."); return; }

    setIsPublishing(true);
    const { data, error } = await supabase.from("posts").insert({
      author_id: authUserId,
      mood: composeMood,
      body: composeText.trim(),
      expires_at: expiresAtFor(composeDuration),
      is_pinned: false,
    }).select("id, mood, body, is_pinned, expires_at").single();
    setIsPublishing(false);
    if (error) {
      console.error("Could not publish post:", error.message);
      setToast(`Post couldn't be shared: ${error.message}`);
      return;
    }
    setPosts((prev) => [{ id: data.id, author: "you", mood: data.mood, text: data.body, time: "just now", isMine: true, duration: composeDuration, isPermanent: data.is_pinned, expiresAt: data.expires_at }, ...prev]);
    setComposeText("");
    setToast("Shared anonymously");
    setView("home");
  }

  const TABS = [
    { key: "home", label: "Home", Icon: Home },
    { key: "messages", label: "Messages", Icon: MessageCircle },
    { key: "notifications", label: "Alerts", Icon: Bell },
    { key: "opener", label: "Opener", Icon: MessageCircleHeart },
    { key: "profile", label: "Profile", Icon: User },
  ];

  function generateOpeners() {
    setIsGeneratingOpeners(true);
    supabase.functions.invoke("generate-opener", { body: openerForm })
      .then(({ data, error }) => {
        if (error || !data?.openers?.length) throw error || new Error("no openers returned");
        setOpenerResults(data.openers);
      })
      .catch(() => {
        // ai call failed or key not set yet, use the local template instead
        setOpenerResults(buildOpeners(openerForm));
      })
      .finally(() => setIsGeneratingOpeners(false));
  }

  function copyOpener(text, index) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOpenerIndex(index);
      setTimeout(() => setCopiedOpenerIndex((cur) => (cur === index ? null : cur)), 1600);
    });
  }

  function toggleOpenerVibe(vibe) {
    setOpenerForm((prev) => {
      const has = prev.yourVibe.includes(vibe);
      if (has) return { ...prev, yourVibe: prev.yourVibe.filter((v) => v !== vibe) };
      if (prev.yourVibe.length >= 3) return prev;
      return { ...prev, yourVibe: [...prev.yourVibe, vibe] };
    });
  }

  const myPosts = posts.filter((p) => p.isMine && !p.isPermanent);
  const permanentPost = posts.find((p) => p.isPermanent);
  const FULLSCREEN_VIEWS = ["newReply", "thread", "compose", "viewProfile", "settings", "postInbox"];
  // #4 — only the Connected profile page goes dark; every other screen (incl. Anonymous profile) is untouched
  const darkMode = view === "profile" && profileTab === "connected";

  // #1 — first-login onboarding: fill out your connected profile before entering the app
  if (isProfileLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: DARKBG }}>
        <div className="flex flex-col items-center gap-3" style={{ color: DARKTEXT }}>
          <Logo height={44} />
          <p className="text-[13px]" style={{ color: DARKMUTED }}>Opening your private space...</p>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen w-full flex justify-center" style={{ backgroundImage: `radial-gradient(circle at 50% 0%, ${LOGO_PURPLE}26, ${DARKBG} 55%)`, backgroundColor: DARKBG }}>
        <div className="w-full max-w-md min-h-screen flex flex-col px-6 py-8" style={{ fontFamily: "ui-sans-serif, system-ui" }}>
          {toast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 max-w-[90%]" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }}>
              <Check size={14} style={{ color: LOGO_PURPLE }} className="shrink-0" /><span>{toast}</span>
            </div>
          )}
          <div className="flex flex-col items-center text-center mb-6">
            <Logo height={44} />
            <p className="font-semibold text-[18px] mt-3" style={{ color: DARKTEXT }}>Welcome to DearStrangers</p>
            <p className="text-[13px] mt-1" style={{ color: DARKMUTED }}>Set up your profile before you dive in. You can edit this any time.</p>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col items-center">
              <label className="relative cursor-pointer active:scale-95 transition">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePicUpload(e, setOnboardDraft)} />
                {onboardDraft.pic ? (
                  <img src={onboardDraft.pic} alt="" className="rounded-full object-cover" style={{ width: 84, height: 84 }} />
                ) : (
                  <div className="rounded-full flex items-center justify-center" style={{ width: 84, height: 84, background: logoGradient(), boxShadow: `0 6px 16px ${LOGO_PURPLE}44` }}>
                    <Camera size={26} color="#fff" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 rounded-full flex items-center justify-center" style={{ width: 26, height: 26, backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                  <Camera size={12} color={DARKTEXT} />
                </div>
              </label>
              <span className="text-[11px] mt-1.5" style={{ color: DARKMUTED }}>Profile picture</span>
            </div>

            <div>
              <label className="text-[12px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Username</label>
              <input value={onboardDraft.username} onChange={(e) => setOnboardDraft((p) => ({ ...p, username: e.target.value }))} placeholder="e.g. adi_writes"
                className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[12px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Age</label>
                <input type="number" min="13" max="100" value={onboardDraft.age} onChange={(e) => setOnboardDraft((p) => ({ ...p, age: e.target.value }))} placeholder="18"
                  className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
              </div>
              <div className="flex-1">
                <label className="text-[12px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Gender</label>
                <select value={onboardDraft.gender} onChange={(e) => setOnboardDraft((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: onboardDraft.gender ? DARKTEXT : DARKMUTED }}>
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="unspecified">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Bio</label>
              <textarea value={onboardDraft.bio} onChange={(e) => setOnboardDraft((p) => ({ ...p, bio: e.target.value }))} rows={3} placeholder="A few lines about you — 5-6 lines works well"
                className="w-full rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
            </div>

            <div>
              <label className="text-[12px] font-medium mb-1 flex items-center gap-1.5" style={{ color: DARKMUTED }}><EyeOff size={12} /> Only For People I Care About</label>
              <textarea value={onboardDraft.privateBio} onChange={(e) => handlePrivateBioChange(e, setOnboardDraft)} rows={3} placeholder="Nobody sees this unless you approve their request — add it later if you want"
                className="w-full rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
              <p className="text-[11px] mt-1 text-right" style={{ color: DARKMUTED }}>{wordCount(onboardDraft.privateBio)}/{BIO_WORD_LIMIT} words</p>
            </div>
          </div>

          <button onClick={completeOnboarding}
            className="mt-4 w-full py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition flex items-center justify-center gap-2" style={{ background: logoGradient(), color: "#fff", boxShadow: `0 6px 16px ${LOGO_PURPLE}44` }}>
            Continue
          </button>

          {/* Recovery path for a returning user opening the app on a new device/browser */}
          {!showEmailSignIn ? (
            <button onClick={() => setShowEmailSignIn(true)} className="mt-4 text-[12px] text-center underline underline-offset-2" style={{ color: DARKMUTED }}>
              Used DearStrangers before? Sign in with email
            </button>
          ) : (
            <div className="mt-4 rounded-xl p-3.5" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
              {signInLinkSent ? (
                <p className="text-[12px] leading-relaxed" style={{ color: DARKMUTED }}>
                  Sent to {signInEmailDraft}. Open it on this device to get back into your account.
                </p>
              ) : (
                <>
                  <p className="text-[12px] mb-2" style={{ color: DARKMUTED }}>Enter the email you added earlier — we'll send a sign-in link.</p>
                  <input value={signInEmailDraft} onChange={(e) => setSignInEmailDraft(e.target.value)} type="email" placeholder="you@example.com"
                    className="w-full rounded-lg px-3 py-2 text-[13px] outline-none mb-2" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
                  <button onClick={sendSignInLink} disabled={isSendingSignInLink}
                    className="w-full py-2 rounded-lg text-[12.5px] font-medium disabled:opacity-50 transition" style={{ background: logoGradient(), color: "#fff" }}>
                    {isSendingSignInLink ? "Sending..." : "Send sign-in link"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- full-app gate screens for log out / delete account (#6) ----
  if (accountDeleted) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center" style={{ backgroundColor: CREAM }}>
        <div className="w-full max-w-md min-h-screen flex flex-col items-center justify-center text-center px-8" style={{ fontFamily: "ui-sans-serif, system-ui" }}>
          <Logo height={56} />
          <p className="font-semibold text-[17px] mt-3 mb-1" style={{ color: CHARCOAL }}>Your account has been deleted</p>
          <p className="text-[13px] mb-6" style={{ color: MUTED }}>Everything you shared on DearStrangers is gone. We're sorry to see you go.</p>
          <button onClick={() => { setAccountDeleted(false); setDeleteConfirmText(""); setSettingsPanel(null); setView("home"); }}
            className="px-5 py-2.5 rounded-full text-sm font-medium active:scale-95 transition" style={{ background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL) }}>
            Start over (demo)
          </button>
        </div>
      </div>
    );
  }
  if (loggedOut) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center" style={{ backgroundColor: CREAM }}>
        <div className="w-full max-w-md min-h-screen flex flex-col items-center justify-center text-center px-8" style={{ fontFamily: "ui-sans-serif, system-ui" }}>
          <Logo height={56} />
          <p className="font-semibold text-[17px] mt-3 mb-1" style={{ color: CHARCOAL }}>You've been logged out</p>
          <p className="text-[13px] mb-6" style={{ color: MUTED }}>Come back whenever you need to let something out.</p>
          <button onClick={() => { setLoggedOut(false); setSettingsPanel(null); setView("home"); }}
            className="px-5 py-2.5 rounded-full text-sm font-medium active:scale-95 transition" style={{ background: gradient(AMBER), color: "#4A3708", boxShadow: glow(AMBER) }}>
            Log back in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex justify-center transition-colors duration-200" style={darkMode
      ? { backgroundImage: `radial-gradient(circle at 50% 0%, ${LOGO_PURPLE}22, ${DARKBG} 55%)`, backgroundColor: DARKBG }
      : { backgroundImage: `radial-gradient(circle at 50% 0%, ${CORAL}0D, ${CREAM} 55%)`, backgroundColor: CREAM }}>
      <div className="w-full max-w-md min-h-screen flex flex-col relative" style={{ color: darkMode ? DARKTEXT : CHARCOAL, fontFamily: "ui-sans-serif, system-ui" }}>

        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 max-w-[90%]" style={{ backgroundColor: CHARCOAL, color: "#fff" }}>
            <Check size={14} style={{ color: TEAL }} className="shrink-0" /><span>{toast}</span>
          </div>
        )}

        {(view === "home" || view === "messages" || view === "notifications" || view === "opener" || view === "profile") && (
          <header className="relative px-5 pt-7 pb-4 border-b transition-colors duration-200" style={darkMode
            ? { borderColor: DARKBORDER, backgroundImage: `linear-gradient(180deg, ${LOGO_PURPLE}1A, transparent)` }
            : { borderColor: MUTED + "22", backgroundImage: `linear-gradient(180deg, ${CORAL}0F, transparent)` }}>
            {view === "profile" && (
              <button onClick={() => setView("settings")} aria-label="Settings"
                className="absolute left-4 top-6 w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition" style={darkMode
                  ? { backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }
                  : { backgroundColor: "#fff", border: `1px solid ${MUTED}22`, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                <Settings size={16} color={darkMode ? DARKTEXT : CHARCOAL} />
              </button>
            )}
            <div className={`flex items-center gap-2 mb-3 ${view === "profile" ? "justify-center" : ""}`}>
              <Logo height={24} />
              <span className="font-bold text-[15px] tracking-tight" style={{ color: darkMode ? DARKTEXT : CHARCOAL }}>DearStrangers</span>
            </div>
            <h1 className={`text-xl font-semibold ${view === "profile" ? "text-center" : ""}`} style={{ color: darkMode ? DARKTEXT : CHARCOAL }}>
              {view === "home" && greeting}
              {view === "messages" && "Messages"}
              {view === "notifications" && "Notifications"}
              {view === "opener" && "Conversation Opener"}
              {view === "profile" && "You"}
            </h1>
            <p className={`text-[13px] mt-1 ${view === "profile" ? "text-center" : ""}`} style={{ color: darkMode ? DARKMUTED : MUTED }}>{PAGE_INTRO[view]}</p>
          </header>
        )}

        {view === "home" && (
          <main className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-28">
            {[...posts]
              .sort((a, b) => {
                const pinnedDiff = (b.isPermanent ? 1 : 0) - (a.isPermanent ? 1 : 0);
                if (pinnedDiff) return pinnedDiff;
                // Among non-pinned posts, a shared keyword bumps a stranger's
                // post up; ties keep the original recency order (stable sort).
                const aMatch = matchedKeywordsFor(a).length > 0 ? 1 : 0;
                const bMatch = matchedKeywordsFor(b).length > 0 ? 1 : 0;
                return bMatch - aMatch;
              })
              .map((p) => {
              const m = MOODS[p.mood]; const MIcon = m.Icon; const t = threadForPost(p.id);
              const myReplies = p.isMine ? repliesForPost(p.id) : [];
              const dur = DURATIONS.find((d) => d.key === p.duration) || DURATIONS[3];
              const matched = matchedKeywordsFor(p);
              return (
                <div key={p.id} className="relative overflow-hidden rounded-2xl bg-white" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                  <div className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: gradient(m.color) }} />
                  <div className="p-4 pl-5">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: gradient(m.color), color: "#fff", boxShadow: glow(m.color, "40") }}>
                          <MIcon size={12} /> {m.label}
                        </div>
                        <span className="text-[12px] font-medium truncate" style={{ color: CHARCOAL }}>{p.isMine ? "You" : p.author}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isPermanent ? (
                          <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: AMBER + "26", color: "#8A6512" }}>
                            <Pin size={9} /> Pinned
                          </span>
                        ) : (
                          <>
                            <span className="text-[11px]" style={{ color: MUTED }}>{p.time}</span>
                            <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: MUTED + "1A", color: MUTED }}>
                              <Clock size={9} /> {dur.tag}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-[14.5px] leading-relaxed" style={{ color: CHARCOAL }}>{p.text}</p>
                    {!p.isMine && matched.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {matched.map((k) => (
                          <span key={k} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: TEAL + "18", color: TEAL }}>#{k}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 flex justify-end" style={{ borderTop: `1px solid ${MUTED}1A` }}>
                      {!p.isMine && !t && (
                        <button onClick={() => openOrStartThread(p.id)} className="text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition" style={{ background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL) }}>
                          <Ear size={13} /> Here to Listen
                        </button>
                      )}
                      {!p.isMine && t && (
                        <button onClick={() => openOrStartThread(p.id)} className="text-[12px] font-medium px-3 py-1.5 rounded-full active:scale-95 transition" style={{ backgroundColor: CHARCOAL + "0F", color: CHARCOAL }}>
                          Continue chat
                        </button>
                      )}
                      {/* #1 (new) — reply count only ever renders for the post owner */}
                      {p.isMine && myReplies.length > 0 && (
                        <button onClick={() => { setActivePostId(p.id); setView("postInbox"); }} className="text-[12px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition" style={{ background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL) }}>
                          <Inbox size={13} /> {myReplies.length} {myReplies.length === 1 ? "reply" : "replies"}
                        </button>
                      )}
                      {p.isMine && myReplies.length === 0 && (
                        <span className="text-[11.5px]" style={{ color: MUTED }}>No replies yet</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </main>
        )}

        {view === "opener" && (
          <main className="flex-1 overflow-y-auto px-5 py-4 pb-28">
            {!openerResults ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                  <p className="text-[13px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: PLUM }}>
                    <User size={13} /> Thoda apna intro do
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: MUTED + "1A", color: MUTED }}>optional</span>
                  </p>
                  <div className="mb-3">
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Tumhari age</label>
                    <input type="number" min="13" max="99" value={openerForm.yourAge}
                      onChange={(e) => setOpenerForm((p) => ({ ...p, yourAge: e.target.value }))}
                      placeholder="21" className="w-full rounded-xl px-3 py-2 text-[14px] outline-none"
                      style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Tumhara vibe (max 3 chuno)</label>
                    <div className="flex flex-wrap gap-2">
                      {OPENER_VIBES.map((v) => (
                        <button key={v} type="button" onClick={() => toggleOpenerVibe(v)}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition"
                          style={openerForm.yourVibe.includes(v) ? { background: gradient(PLUM), color: "#fff", boxShadow: glow(PLUM, "40") } : { border: `1px solid ${MUTED}33`, color: MUTED }}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                  <p className="text-[13px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: PLUM }}>
                    <Heart size={13} /> Ab bata do, dil kiske liye dhak-dhak karta hai
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Naam / nickname</label>
                      <input type="text" value={openerForm.theirName}
                        onChange={(e) => setOpenerForm((p) => ({ ...p, theirName: e.target.value }))}
                        placeholder="e.g. Ananya" className="w-full rounded-xl px-3 py-2 text-[14px] outline-none"
                        style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Unki age</label>
                      <input type="number" min="13" max="99" value={openerForm.theirAge}
                        onChange={(e) => setOpenerForm((p) => ({ ...p, theirAge: e.target.value }))}
                        placeholder="22" className="w-full rounded-xl px-3 py-2 text-[14px] outline-none"
                        style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Pehchaan kaise hui</label>
                    <select value={openerForm.knowThemVia}
                      onChange={(e) => setOpenerForm((p) => ({ ...p, knowThemVia: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2 text-[14px] outline-none bg-white"
                      style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }}>
                      <option value="">Choose one</option>
                      {OPENER_KNOW_VIA.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                  <p className="text-[13px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: PLUM }}>
                    <Quote size={13} /> Woh chhoti si baat jo sirf tumhe pata hai
                  </p>
                  <div className="mb-3">
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Unke baare mein kya aur kitna jaante ho?</label>
                    <textarea rows={2} value={openerForm.howWellKnown}
                      onChange={(e) => setOpenerForm((p) => ({ ...p, howWellKnown: e.target.value }))}
                      placeholder="e.g. bas naam pata hai, kabhi baat nahi hui"
                      className="w-full rounded-xl px-3 py-2 text-[14px] outline-none resize-none"
                      style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Kuch specific notice kiya?</label>
                    <textarea rows={2} value={openerForm.noticedSomething}
                      onChange={(e) => setOpenerForm((p) => ({ ...p, noticedSomething: e.target.value }))}
                      placeholder="e.g. unki story mein trekking ki photo dekhi thi"
                      className="w-full rounded-xl px-3 py-2 text-[14px] outline-none resize-none"
                      style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                  <p className="text-[13px] font-semibold mb-3 flex items-center gap-1.5" style={{ color: PLUM }}>
                    <MessageCircleHeart size={13} /> Ab scene set karte hain
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Kahan message karoge</label>
                      <select value={openerForm.platform}
                        onChange={(e) => setOpenerForm((p) => ({ ...p, platform: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2 text-[14px] outline-none bg-white"
                        style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }}>
                        {OPENER_PLATFORMS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Iraada kya hai</label>
                      <select value={openerForm.intent}
                        onChange={(e) => setOpenerForm((p) => ({ ...p, intent: e.target.value }))}
                        className="w-full rounded-xl px-3 py-2 text-[14px] outline-none bg-white"
                        style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }}>
                        {OPENER_INTENTS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Abhi tak baat kahan tak pahunchi hai</label>
                    <select value={openerForm.stage}
                      onChange={(e) => setOpenerForm((p) => ({ ...p, stage: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2 text-[14px] outline-none bg-white"
                      style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }}>
                      {OPENER_STAGES.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Aap use kitna jaante ho</label>
                    <select value={openerForm.familiarity}
                      onChange={(e) => setOpenerForm((p) => ({ ...p, familiarity: e.target.value }))}
                      className="w-full rounded-xl px-3 py-2 text-[14px] outline-none bg-white"
                      style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }}>
                      {OPENER_FAMILIARITY.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: MUTED }}>Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {OPENER_TONES.map((t) => (
                        <button key={t} type="button" onClick={() => setOpenerForm((p) => ({ ...p, tone: t }))}
                          className="px-3 py-1.5 rounded-full text-[12px] font-medium transition"
                          style={openerForm.tone === t ? { background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL, "40") } : { border: `1px solid ${MUTED}33`, color: MUTED }}>
                          {t.replace(" and ", " & ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={generateOpeners} disabled={isGeneratingOpeners}
                  className="w-full py-3 rounded-xl font-medium text-sm disabled:opacity-60 active:scale-[0.98] transition flex items-center justify-center gap-2"
                  style={{ background: gradient(AMBER), color: "#4A3708", boxShadow: glow(AMBER) }}>
                  <MessageCircleHeart size={15} /> {isGeneratingOpeners ? "Likh rahe hain..." : "Let's start"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium" style={{ color: CHARCOAL }}>Yeh lo, tumhara pehla message taiyaar hai</p>
                  <button onClick={generateOpeners}
                    className="text-[11.5px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition shrink-0"
                    style={{ backgroundColor: CHARCOAL + "0F", color: CHARCOAL }}>
                    <RefreshCw size={12} /> 3 aur banao
                  </button>
                </div>
                {openerResults.map((o, i) => (
                  <div key={i} className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                    <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "#B8860B" }}>{o.style}</span>
                    <div className="mt-2 mb-2.5 rounded-2xl rounded-bl-md px-4 py-3 text-[14.5px] font-medium leading-relaxed" style={{ background: gradient(AMBER), color: "#4A3708", whiteSpace: "pre-line" }}>
                      {o.message}
                    </div>
                    <p className="text-[12px] leading-snug mb-2.5" style={{ color: MUTED }}>{o.why}</p>
                    <div className="flex justify-end">
                      <button onClick={() => copyOpener(o.message, i)}
                        className="text-[11.5px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 transition"
                        style={copiedOpenerIndex === i ? { border: `1px solid ${TEAL}`, color: TEAL } : { border: `1px solid ${MUTED}33`, color: MUTED }}>
                        {copiedOpenerIndex === i ? <><CheckCheck size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setOpenerResults(null)}
                  className="w-full py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition" style={{ border: `1px solid ${MUTED}33`, color: MUTED }}>
                  Details badlo
                </button>
              </div>
            )}
          </main>
        )}

        {view === "newReply" && (() => {
          const post = posts.find((p) => p.id === activePostId);
          const m = MOODS[post.mood];
          return (
            <div className="flex-1 flex flex-col">
              <header className="px-4 pt-6 pb-3 flex items-center gap-3 border-b" style={{ borderColor: MUTED + "22" }}>
                <button onClick={() => setView("home")}><ArrowLeft size={20} color={CHARCOAL} /></button>
                <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: CHARCOAL }}><Ear size={15} color={CORAL} /> Here to Listen</span>
              </header>
              <div className="px-5 py-4">
                <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                  <span className="text-[11px] font-medium" style={{ color: m.color }}>{m.label}</span>
                  <p className="text-[14px] mt-1 italic" style={{ color: MUTED }}>"{post.text}"</p>
                </div>
                <p className="text-[12px] mb-2 flex items-center gap-1" style={{ color: MUTED }}><Lock size={11} /> Only {post.author} will ever see your message</p>
                <textarea value={msgDraft} onChange={(e) => setMsgDraft(e.target.value)} rows={4} placeholder="Say something kind..."
                  className="w-full rounded-xl p-3 text-[14px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                <button onClick={sendFirstReply} disabled={!msgDraft.trim()}
                  className="mt-4 w-full py-3 rounded-xl font-medium text-sm disabled:opacity-30 active:scale-[0.98] transition flex items-center justify-center gap-2" style={{ background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL) }}>
                  <Ear size={15} /> Here to Listen
                </button>
              </div>
            </div>
          );
        })()}

        {view === "postInbox" && (() => {
          const post = posts.find((p) => p.id === activePostId);
          const replies = repliesForPost(activePostId);
          return (
            <main className="flex-1 flex flex-col overflow-y-auto">
              <header className="px-4 pt-6 pb-3 flex items-center gap-3 border-b" style={{ borderColor: MUTED + "22" }}>
                <button onClick={() => setView("home")}><ArrowLeft size={20} color={CHARCOAL} /></button>
                <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: CHARCOAL }}><Inbox size={15} color={CORAL} /> Replies</span>
              </header>
              <div className="px-5 py-4 flex-1">
                {post && (
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <span className="text-[11px] font-medium" style={{ color: MOODS[post.mood].color }}>{MOODS[post.mood].label}</span>
                    <p className="text-[13.5px] mt-1 leading-relaxed" style={{ color: CHARCOAL }}>{post.text}</p>
                  </div>
                )}
                <p className="text-[12px] mb-3 flex items-center gap-1.5" style={{ color: MUTED }}>
                  <Lock size={11} /> {replies.length} {replies.length === 1 ? "person has" : "people have"} reached out — only you can see this list.
                </p>
                <div className="space-y-2">
                  {replies.map((t) => {
                    const last = t.messages[t.messages.length - 1];
                    if (!last) return null;
                    const lastText = last.deleted ? "Message deleted" : last.text;
                    return (
                      <button key={t.id} onClick={() => { setThreadOrigin("postInbox"); setActiveThreadId(t.id); setView("thread"); }}
                        className="w-full text-left rounded-2xl p-4 bg-white flex items-center gap-3 active:scale-[0.98] transition" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 8px rgba(58,46,42,0.04)" }}>
                        {t.friendStatus === "connected" && <Avatar name={displayName(t)} pic={t.pic} size={38} />}
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold" style={{ color: CHARCOAL }}>{displayName(t)}</p>
                          <p className="text-[12px] mt-0.5 truncate max-w-[190px]" style={{ color: MUTED, fontStyle: last.deleted ? "italic" : "normal" }}>{last.from === "you" ? "You: " : ""}{lastText}</p>
                        </div>
                        <Badge status={t.friendStatus} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </main>
          );
        })()}

        {view === "thread" && activeThread && (
          <div className="flex-1 flex flex-col">
            <header className="px-4 pt-6 pb-3 flex items-center justify-between border-b" style={{ borderColor: MUTED + "22" }}>
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={goBackFromThread}><ArrowLeft size={20} color={CHARCOAL} /></button>
                {activeThread.friendStatus === "connected" && <Avatar name={displayName(activeThread)} pic={activeThread.pic} size={36} />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: CHARCOAL }}>{displayName(activeThread)}</p>
                    <button onClick={() => setView("viewProfile")} className="text-[10.5px] font-medium underline shrink-0" style={{ color: PLUM }}>
                      View Profile
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge status={activeThread.friendStatus} />
                    {/* #8 — connection-length tag */}
                    {activeThread.friendStatus === "connected" && (() => {
                      const tag = getConnectionTag(daysConnected(activeThread.connectedAt));
                      return (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: TEAL + "1A", color: "#0E6E63" }}>
                          {tag.label} {tag.emoji}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {activeThread.friendStatus === "none" && (
                <button onClick={addFriend} className="text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition shrink-0" style={{ background: gradient(AMBER), color: "#4A3708", boxShadow: glow(AMBER) }}>
                  <UserPlus size={12} /> Add Friend
                </button>
              )}
              {activeThread.friendStatus === "requested" && (
                <span className="text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0" style={{ backgroundColor: AMBER + "22", color: "#8A6512" }}>
                  <Clock size={12} /> Pending
                </span>
              )}
              {activeThread.friendStatus === "received" && (
                <button onClick={() => addBack(activeThread.id)} className="text-[11px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition shrink-0" style={{ background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL) }}>
                  <UserPlus size={12} /> Add Back
                </button>
              )}
            </header>

            {activeThread.friendStatus !== "connected" && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-lg text-[11.5px]" style={{ backgroundColor: PLUM + "15", color: PLUM }}>
                {activeThread.friendStatus === "received"
                  ? "They want to connect. Add them back to reveal real names on both sides."
                  : "You're chatting anonymously. Real names show only once you both connect as friends."}
              </div>
            )}

            <main className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {activeThread.messages.map((m) => {
                const isYou = m.from === "you";
                const isLastYou = isYou && activeThread.messages[activeThread.messages.length - 1].id === m.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isYou ? "items-end" : "items-start"} mb-1.5`}>
                    <div
                      onClick={() => isYou && !m.deleted && setOpenMsgMenu(openMsgMenu === m.id ? null : m.id)}
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-snug ${isYou && !m.deleted ? "cursor-pointer" : ""}`}
                      style={m.deleted
                        ? { backgroundColor: "#fff", border: `1px dashed ${MUTED}55`, color: MUTED, fontStyle: "italic", borderBottomRightRadius: isYou ? 4 : 16, borderBottomLeftRadius: isYou ? 16 : 4 }
                        : isYou ? { background: gradient(CORAL), color: "#fff", borderBottomRightRadius: 4, boxShadow: glow(CORAL, "33") } : { backgroundColor: "#fff", border: `1px solid ${MUTED}22`, color: CHARCOAL, borderBottomLeftRadius: 4 }}>
                      {m.deleted ? "This message was deleted" : m.text}
                      {!m.deleted && m.edited && <span className={`text-[10px] ml-1.5 ${isYou ? "opacity-80" : ""}`} style={{ color: isYou ? "#fff" : MUTED }}>(edited)</span>}
                    </div>

                    {isYou && !m.deleted && openMsgMenu === m.id && (
                      <div className="flex items-center gap-2 mt-1.5 px-1">
                        <button onClick={() => startEditMessage(m)} className="text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-full active:scale-95 transition" style={{ backgroundColor: CHARCOAL + "0F", color: CHARCOAL }}>
                          <Pencil size={10} /> Edit
                        </button>
                        <button onClick={() => deleteMessage(m)}
                          className={`text-[11px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-full transition ${m.seen ? "active:scale-95" : "opacity-40"}`}
                          style={{ backgroundColor: m.seen ? "#E9483622" : MUTED + "1A", color: m.seen ? "#C0392B" : MUTED }}>
                          <Trash2 size={10} /> {m.seen ? "Delete" : "Delete (after seen)"}
                        </button>
                      </div>
                    )}
                    {isLastYou && !m.deleted && (
                      <span className="text-[10px] mt-1 mr-1" style={{ color: MUTED }}>{m.seen ? "Seen" : "Sent"}</span>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </main>

            {editingMsgId && (
              <div className="px-4 pt-2 flex items-center justify-between text-[11.5px]" style={{ color: PLUM }}>
                <span className="flex items-center gap-1"><Pencil size={11} /> Editing message</span>
                <button onClick={cancelEdit} className="flex items-center gap-0.5"><X size={12} /> Cancel</button>
              </div>
            )}

            {showEmoji && (
              <div className="mx-4 mb-2 p-2.5 rounded-2xl bg-white grid grid-cols-8 gap-1.5" style={{ border: `1px solid ${MUTED}22`, boxShadow: "0 6px 18px rgba(58,46,42,0.10)" }}>
                {EMOJIS.map((e, i) => (
                  <button key={i} onClick={() => insertEmoji(e)} className="text-[18px] active:scale-90 transition rounded-lg py-1" >{e}</button>
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: MUTED + "22" }}>
              <button onClick={() => setToast("Photos & voice notes — coming soon")} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition" style={{ color: MUTED }}>
                <Paperclip size={17} />
              </button>
              <input value={msgDraft} onChange={(e) => setMsgDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendInThread()}
                placeholder={activeThread.friendStatus === "connected" ? "Message..." : "Reply anonymously..."}
                className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
              <button onClick={() => setShowEmoji((s) => !s)} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition" style={{ color: showEmoji ? CORAL : MUTED }}>
                <SmilePlus size={19} />
              </button>
              <button onClick={sendInThread} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition" style={{ background: gradient(TEAL), boxShadow: glow(TEAL) }}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </div>
        )}

        {view === "viewProfile" && activeThread && (() => {
          const connected = activeThread.friendStatus === "connected";
          const originPost = posts.find((p) => p.id === activeThread.postId);
          const moodKey = originPost?.mood || "thoughtful";
          const icebreaker = ICEBREAKERS[moodKey];
          const theirMsgCount = activeThread.messages.filter((m) => m.from === "them" && !m.deleted).length;
          const isKindListener = theirMsgCount >= 2;
          const connectedDays = activeThread.connectedAt ? Math.max(0, Math.floor((Date.now() - activeThread.connectedAt) / 86400000)) : 0;
          return (
          <main className="flex-1 flex flex-col overflow-y-auto">
            <header className="px-4 pt-6 pb-3 flex items-center gap-3 border-b" style={{ borderColor: MUTED + "22" }}>
              <button onClick={() => setView("thread")}><ArrowLeft size={20} color={CHARCOAL} /></button>
              <span className="text-sm font-medium" style={{ color: CHARCOAL }}>Profile</span>
            </header>
            <div className="px-5 py-6 flex-1">
              <div className="flex flex-col items-center text-center mb-5">
                {connected ? (
                  <Avatar name={displayName(activeThread)} pic={activeThread.pic} size={84} />
                ) : (
                  <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 84, height: 84, background: gradient(PLUM), boxShadow: glow(PLUM) }}>
                    <Lock size={32} color="#fff" />
                  </div>
                )}
                <p className="font-semibold text-[16px] mt-3" style={{ color: CHARCOAL }}>{displayName(activeThread)}</p>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap justify-center">
                  <Badge status={activeThread.friendStatus} />
                  {connected && isKindListener && (
                    <span className="text-[11px] font-medium px-2 py-1 rounded-full flex items-center gap-1" style={{ background: gradient(AMBER), color: "#4A3708" }}>
                      <Award size={11} /> Kind Listener
                    </span>
                  )}
                </div>
              </div>

              {connected ? (
                <div className="rounded-2xl p-4 bg-white mb-4 flex items-center justify-center gap-2" style={{ border: `1px solid ${MUTED}22` }}>
                  <Users size={16} style={{ color: TEAL }} />
                  <span className="text-[13px]" style={{ color: CHARCOAL }}>Connected — you can now see each other's real name</span>
                </div>
              ) : (
                <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ backgroundColor: PLUM + "12", border: `1px solid ${PLUM}22` }}>
                  <Lock size={18} style={{ color: PLUM }} className="shrink-0" />
                  <p className="text-[12.5px]" style={{ color: PLUM }}>Real name and connections stay locked until you both add each other back.</p>
                </div>
              )}

              <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                <p className="font-semibold text-[13.5px] mb-1.5 flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                  <Heart size={13} style={{ color: CORAL }} /> Things they like
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: activeThread.bio ? CHARCOAL : MUTED }}>
                  {activeThread.bio || "They haven't shared anything personal yet."}
                </p>
              </div>

              {!connected && (
                <>
                  {/* anonymous #1 — vibe summary */}
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <p className="font-semibold text-[13.5px] mb-1.5 flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                      <Sparkles size={13} style={{ color: TEAL }} /> Their vibe
                    </p>
                    <p className="text-[13px] leading-relaxed" style={{ color: CHARCOAL }}>{activeThread.vibeSummary}</p>
                  </div>

                  {/* anonymous #6 — icebreaker chip */}
                  <button onClick={() => { setMsgDraft(icebreaker); setThreadOrigin("messages"); setView("thread"); }}
                    className="w-full text-left rounded-2xl p-4 mb-4 flex items-center gap-3 active:scale-[0.99] transition" style={{ background: gradient(CORAL), boxShadow: glow(CORAL) }}>
                    <Sparkles size={16} color="#fff" className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium" style={{ color: "#FFE2DD" }}>Try an icebreaker</p>
                      <p className="text-[13px] font-medium truncate" style={{ color: "#fff" }}>"{icebreaker}"</p>
                    </div>
                  </button>
                </>
              )}

              {connected && (
                <>
                  {/* connector #1 — connected since + day count + #8 connection tag */}
                  <div className="rounded-2xl p-4 bg-white mb-4 flex items-center gap-3" style={{ border: `1px solid ${MUTED}22` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: gradient(TEAL), boxShadow: glow(TEAL, "33") }}>
                      <Check size={16} color="#fff" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px]" style={{ color: CHARCOAL }}>
                        Connected {connectedDays === 0 ? "today" : `${connectedDays} day${connectedDays === 1 ? "" : "s"} ago`}
                      </p>
                      {(() => {
                        const tag = getConnectionTag(connectedDays);
                        return <p className="text-[11.5px] font-medium mt-0.5" style={{ color: "#0E6E63" }}>{tag.label} {tag.emoji}</p>;
                      })()}
                    </div>
                  </div>

                  {/* #3 — their anonymous posts, visible now that you're connected */}
                  {(() => {
                    const theirAnonPosts = posts.filter((p) => p.author === activeThread.otherUser);
                    if (theirAnonPosts.length === 0) return null;
                    return (
                      <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                        <p className="font-semibold text-[13.5px] mb-2.5 flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                          <MessageCircle size={13} style={{ color: CORAL }} /> Their anonymous posts
                        </p>
                        <div className="space-y-2">
                          {theirAnonPosts.map((p) => {
                            const m = MOODS[p.mood];
                            return (
                              <div key={p.id} className="rounded-xl p-3" style={{ backgroundColor: MUTED + "0C" }}>
                                <span className="text-[10.5px] font-medium" style={{ color: m.color }}>{m.label}</span>
                                <p className="text-[13px] mt-0.5 leading-snug" style={{ color: CHARCOAL }}>{p.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* connector #2 — shared history */}
                  {originPost && (
                    <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                      <p className="font-semibold text-[13.5px] mb-1.5 flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                        <Quote size={13} style={{ color: PLUM }} /> Where you connected
                      </p>
                      <span className="text-[11px] font-medium" style={{ color: MOODS[originPost.mood].color }}>{MOODS[originPost.mood].label}</span>
                      <p className="text-[13px] mt-1 italic leading-relaxed" style={{ color: MUTED }}>"{originPost.text}"</p>
                    </div>
                  )}

                  {/* connector #4 — custom nickname */}
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-[13.5px] flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                        <Tag size={13} style={{ color: TEAL }} /> Nickname
                      </p>
                      {!editingNickname && <button onClick={openNickname} className="text-[11.5px] font-medium" style={{ color: PLUM }}>Edit</button>}
                    </div>
                    {editingNickname ? (
                      <div className="flex items-center gap-2">
                        <input value={nicknameDraft} onChange={(e) => setNicknameDraft(e.target.value)} placeholder={activeThread.realName}
                          className="flex-1 rounded-lg px-3 py-1.5 text-[13px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                        <button onClick={saveNickname} className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-full" style={{ background: gradient(TEAL), color: "#fff" }}>Save</button>
                      </div>
                    ) : (
                      <p className="text-[13px]" style={{ color: activeThread.nickname ? CHARCOAL : MUTED }}>
                        {activeThread.nickname || `Using their real name (${activeThread.realName})`}
                      </p>
                    )}
                  </div>

                  {/* "Only For People I Care About" — approval-gated content, visible once they approve you */}
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <p className="font-semibold text-[13.5px] mb-1.5 flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                      <EyeOff size={13} style={{ color: PLUM }} /> Only For People I Care About
                    </p>
                    {activeThread.myThoughtAccessStatus === "approved" ? (
                      <p className="text-[13px] leading-relaxed" style={{ color: CHARCOAL }}>
                        {activeThread.theirThought || "They haven't written anything here yet."}
                      </p>
                    ) : activeThread.myThoughtAccessStatus === "pending" ? (
                      <p className="text-[12.5px] flex items-center gap-1.5" style={{ color: MUTED }}>
                        <Lock size={11} className="shrink-0" /> Request sent — waiting for {activeThread.realName} to approve.
                      </p>
                    ) : activeThread.myThoughtAccessStatus === "denied" ? (
                      <p className="text-[12.5px] flex items-center gap-1.5" style={{ color: MUTED }}>
                        <Lock size={11} className="shrink-0" /> {activeThread.realName} hasn't opened this up to you.
                      </p>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] flex items-center gap-1.5" style={{ color: MUTED }}>
                          <Lock size={11} className="shrink-0" /> Locked — ask to see this.
                        </p>
                        <button onClick={() => requestThoughtAccess(activeThread.otherUserId)} className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full shrink-0" style={{ background: gradient(PLUM), color: "#fff" }}>
                          Request access
                        </button>
                      </div>
                    )}
                  </div>

                  {/* connector #3 — private note, only the owner sees this */}
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-[13.5px] flex items-center gap-1.5" style={{ color: CHARCOAL }}>
                        <StickyNote size={13} style={{ color: "#B8860B" }} /> Private note
                      </p>
                      {!editingNote && <button onClick={openNote} className="text-[11.5px] font-medium" style={{ color: PLUM }}>Edit</button>}
                    </div>
                    {editingNote ? (
                      <>
                        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} placeholder="Only you can see this note..."
                          className="w-full rounded-lg p-2.5 text-[12.5px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                        <button onClick={saveNote} className="mt-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-full" style={{ background: gradient(TEAL), color: "#fff" }}>Save</button>
                      </>
                    ) : (
                      <p className="text-[13px] leading-relaxed flex items-start gap-1.5" style={{ color: activeThread.privateNote ? CHARCOAL : MUTED }}>
                        <Lock size={11} className="mt-0.5 shrink-0" />
                        {activeThread.privateNote || "Jot down how you two met, or anything you want to remember — only you see this."}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between px-1">
                {viewProfileConfirm === null ? (
                  <>
                    <button onClick={() => setViewProfileConfirm("report")} className="text-[12px] font-medium flex items-center gap-1" style={{ color: MUTED }}>
                      <Flag size={12} /> Report
                    </button>
                    <button onClick={() => setViewProfileConfirm("block")} className="text-[12px] font-medium flex items-center gap-1" style={{ color: "#C0392B" }}>
                      <UserX size={12} /> Block
                    </button>
                  </>
                ) : (
                  <div className="w-full rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: "#C0392B0D", border: "1px solid #C0392B22" }}>
                    <span className="text-[12px]" style={{ color: "#C0392B" }}>
                      {viewProfileConfirm === "block" ? "Block this person?" : "Report this person?"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewProfileConfirm(null)} className="text-[11.5px] font-medium" style={{ color: MUTED }}>Cancel</button>
                      <button
                        onClick={() => (viewProfileConfirm === "block" ? blockPerson(displayName(activeThread)) : reportPerson(displayName(activeThread)))}
                        className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#C0392B", color: "#fff" }}>
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
          );
        })()}

        {view === "messages" && (() => {
          const anonList = threads.filter((t) => t.friendStatus !== "connected");
          const connectedList = threads.filter((t) => t.friendStatus === "connected");
          const list = msgTab === "anon" ? anonList : connectedList;
          return (
            <main className="flex-1 overflow-y-auto px-5 py-4 pb-28">
              {/* #6 — icon tabs, like Instagram's inbox switch */}
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setMsgTab("anon")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[12.5px] font-semibold transition"
                  style={msgTab === "anon" ? { background: gradient(PLUM), color: "#fff", boxShadow: glow(PLUM, "40") } : { backgroundColor: "#fff", border: `1px solid ${MUTED}22`, color: MUTED }}>
                  <Lock size={14} /> Anonymous <span className="font-normal opacity-80">({anonList.length})</span>
                </button>
                <button onClick={() => setMsgTab("connected")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[12.5px] font-semibold transition"
                  style={msgTab === "connected" ? { background: gradient(TEAL), color: "#fff", boxShadow: glow(TEAL, "40") } : { backgroundColor: "#fff", border: `1px solid ${MUTED}22`, color: MUTED }}>
                  <Users size={14} /> Connected <span className="font-normal opacity-80">({connectedList.length})</span>
                </button>
              </div>

              {list.length === 0 && (
                <p className="text-sm mt-6 text-center" style={{ color: MUTED }}>
                  {msgTab === "anon" ? "No anonymous chats yet. Tap \"Here to Listen\" on a post to start one." : "No connections yet. Add someone back from an anonymous chat."}
                </p>
              )}
              <div className="space-y-2">
                {list.map((t) => {
                  const last = t.messages[t.messages.length - 1];
                  if (!last) return null;
                  const lastText = last.deleted ? "Message deleted" : last.text;
                  const tag = t.friendStatus === "connected" ? getConnectionTag(daysConnected(t.connectedAt)) : null;
                  return (
                    <button key={t.id} onClick={() => { setThreadOrigin("messages"); setActiveThreadId(t.id); setView("thread"); }}
                      className="w-full text-left rounded-2xl p-4 bg-white flex items-center gap-3 active:scale-[0.98] transition" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 8px rgba(58,46,42,0.04)" }}>
                      {/* #5 — profile picture shown only once connected */}
                      {msgTab === "connected" && <Avatar name={displayName(t)} pic={t.pic} size={42} />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold" style={{ color: CHARCOAL }}>{displayName(t)}</p>
                        <p className="text-[12px] mt-0.5 truncate max-w-[190px]" style={{ color: MUTED, fontStyle: last.deleted ? "italic" : "normal" }}>{last.from === "you" ? "You: " : ""}{lastText}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge status={t.friendStatus} />
                        {/* #8 — connection-length tag */}
                        {tag && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: TEAL + "1A", color: "#0E6E63" }}>
                            {tag.label} {tag.emoji}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </main>
          );
        })()}

        {view === "notifications" && (
          <main className="flex-1 overflow-y-auto px-5 py-4 space-y-2 pb-28">
            {notifications.map((n) => (
              <div key={n.id} onClick={() => openNotification(n)}
                className={`rounded-xl p-3.5 bg-white flex items-start gap-3 transition ${n.threadId ? "cursor-pointer active:scale-[0.98]" : ""}`}
                style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 8px rgba(58,46,42,0.04)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: gradient(notifColor(n.type)), boxShadow: glow(notifColor(n.type), "33") }}>
                  {n.type === "friend_request" ? <UserPlus size={14} color="#fff" />
                    : n.type === "reached_post" ? <MessageCircle size={14} color="#fff" />
                    : n.type === "access_requested" ? <EyeOff size={14} color="#fff" />
                    : n.type === "access_granted" ? <Unlock size={14} color="#fff" />
                    : <Bell size={14} color="#fff" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px]" style={{ color: CHARCOAL }}>{n.text}</p>
                  {/* #3 — shows which post the reply came from */}
                  {n.type === "reached_post" && n.postSnippet && (
                    <p className="text-[11.5px] mt-0.5 italic truncate" style={{ color: MUTED }}>on: "{n.postSnippet}"</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px]" style={{ color: MUTED }}>{n.time}</p>
                    {n.type === "friend_request" && (
                      <button onClick={(e) => { e.stopPropagation(); addBack(n.threadId); }} className="text-[11px] font-medium px-2.5 py-1 rounded-full active:scale-95 transition" style={{ background: gradient(AMBER), color: "#4A3708" }}>
                        Add Back
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </main>
        )}

        {view === "profile" && (
          <main className="flex-1 overflow-y-auto px-5 py-5 pb-28">
            {/* #2/#4 — tab switch between the two profiles, like the Messages inbox switch */}
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setProfileTab("anon")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[12.5px] font-semibold transition"
                style={profileTab === "anon" ? { background: gradient(PLUM), color: "#fff", boxShadow: glow(PLUM, "40") } : { backgroundColor: "#fff", border: `1px solid ${MUTED}22`, color: MUTED }}>
                <Lock size={14} /> Anonymous
              </button>
              <button onClick={() => setProfileTab("connected")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[12.5px] font-semibold transition"
                style={profileTab === "connected" ? { background: logoGradient(), color: "#fff", boxShadow: `0 6px 16px ${LOGO_PURPLE}55` } : { backgroundColor: "#fff", border: `1px solid ${MUTED}22`, color: MUTED }}>
                <Users size={14} /> Connected
              </button>
            </div>

            {profileTab === "anon" && (
              <>
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="rounded-full flex items-center justify-center mb-3" style={{ width: 84, height: 84, background: gradient(CORAL), boxShadow: glow(CORAL) }}>
                    <User size={38} color="#fff" />
                  </div>
                  <p className="font-semibold text-[16px]" style={{ color: CHARCOAL }}>Anonymous, always</p>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="text-center"><p className="font-semibold text-[15px]" style={{ color: CHARCOAL }}>{myPosts.length}</p><p className="text-[11px]" style={{ color: MUTED }}>Thoughts</p></div>
                    <div className="w-px h-8" style={{ backgroundColor: MUTED + "33" }} />
                    <div className="text-center"><p className="font-semibold text-[15px]" style={{ color: CHARCOAL }}>{threads.filter((t) => t.friendStatus === "connected").length}</p><p className="text-[11px]" style={{ color: MUTED }}>Connections</p></div>
                  </div>
                </div>

                {/* #1 — things I like, editable */}
                <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-[14px] flex items-center gap-1.5" style={{ color: CHARCOAL }}><Heart size={13} style={{ color: CORAL }} /> Things I like</p>
                    <button onClick={() => setEditingBio((s) => !s)} className="text-[11.5px] font-medium" style={{ color: PLUM }}>{editingBio ? "Done" : "Edit"}</button>
                  </div>
                  {editingBio ? (
                    <>
                      <textarea value={myBio} onChange={handleBioChange} rows={4} placeholder="e.g. I love eating oranges, rainy evenings, and terrible puns..."
                        className="w-full rounded-xl p-3 text-[13.5px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                      <p className="text-[11px] mt-1.5 text-right" style={{ color: MUTED }}>{wordCount(myBio)}/{BIO_WORD_LIMIT} words</p>
                    </>
                  ) : (
                    <p className="text-[13px] leading-relaxed" style={{ color: myBio ? CHARCOAL : MUTED }}>
                      {myBio || "Add something personal — this shows on your profile once you connect with someone."}
                    </p>
                  )}
                </div>

                {/* keyword matching — up to 10 tags; strangers sharing one see this profile's posts boosted */}
                <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-[14px] flex items-center gap-1.5" style={{ color: CHARCOAL }}><Tag size={13} style={{ color: TEAL }} /> Keywords</p>
                    <button
                      onClick={() => { if (!editingKeywords) setKeywordsDraft(myKeywords.join(", ")); setEditingKeywords((s) => !s); }}
                      className="text-[11.5px] font-medium" style={{ color: PLUM }}>
                      {editingKeywords ? "Cancel" : "Edit"}
                    </button>
                  </div>
                  {editingKeywords ? (
                    <>
                      <input value={keywordsDraft} onChange={(e) => setKeywordsDraft(e.target.value)} placeholder="e.g. SVVV Indore, AIML, gaming, poetry"
                        className="w-full rounded-xl p-3 text-[13.5px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[11px]" style={{ color: MUTED }}>Comma-separated · not case-sensitive</p>
                        <p className="text-[11px]" style={{ color: MUTED }}>{normalizeKeywords(keywordsDraft).length}/{MAX_KEYWORDS}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button onClick={saveKeywords} className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full" style={{ background: gradient(TEAL), color: "#fff" }}>Save</button>
                      </div>
                    </>
                  ) : myKeywords.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {myKeywords.map((k) => (
                        <span key={k} className="text-[11.5px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: TEAL + "18", color: TEAL }}>{k}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px]" style={{ color: MUTED }}>
                      Add things like your college, hobbies, or interests — strangers with a matching keyword see your posts first.
                    </p>
                  )}
                </div>

                {/* #1 — the permanent post, editable */}
                <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-[14px] flex items-center gap-1.5" style={{ color: CHARCOAL }}><Pin size={13} style={{ color: AMBER }} /> Permanent post</p>
                    {!editingPermanentPost && <button onClick={startEditPermanentPost} className="text-[11.5px] font-medium" style={{ color: PLUM }}>Edit</button>}
                  </div>
                  {editingPermanentPost ? (
                    <>
                      <textarea value={permanentDraft} onChange={(e) => setPermanentDraft(e.target.value)} rows={3}
                        className="w-full rounded-xl p-3 text-[13.5px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button onClick={() => setEditingPermanentPost(false)} className="text-[11.5px] font-medium" style={{ color: MUTED }}>Cancel</button>
                        <button onClick={savePermanentPost} className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full" style={{ background: gradient(TEAL), color: "#fff" }}>Save</button>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] leading-relaxed" style={{ color: CHARCOAL }}>{permanentPost?.text}</p>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>Always stays up — shown pinned at the top of Home.</p>
                </div>

                {daysSinceSignup !== null && daysSinceSignup < 2 && (
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <p className="font-semibold text-[14px] mb-3" style={{ color: CHARCOAL }}>How DearStrangers works</p>
                    {[
                      { n: 1, c: AMBER, t: "Share how you feel. No name attached, ever." },
                      { n: 2, c: CORAL, t: "Others may reach out — visible only to the two of you." },
                      { n: 3, c: TEAL, t: "If it feels right, add each other back to keep talking." },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-3 mb-3 last:mb-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: gradient(s.c), color: "#fff" }}>{s.n}</div>
                        <p className="text-[13px] leading-snug" style={{ color: CHARCOAL }}>{s.t}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="font-semibold text-[14px] mb-2" style={{ color: CHARCOAL }}>Your thoughts</p>
                <div className="space-y-2">
                  {myPosts.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>Nothing shared yet.</p>}
                  {myPosts.map((p) => {
                    const m = MOODS[p.mood];
                    return (
                      <div key={p.id} className="rounded-xl p-3 bg-white" style={{ border: `1px solid ${MUTED}22` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10.5px] font-medium" style={{ color: m.color }}>{m.label}</span>
                          <span className="text-[10.5px]" style={{ color: MUTED }}>{p.time}</span>
                        </div>
                        <p className="text-[13px] leading-snug" style={{ color: CHARCOAL }}>{p.text}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {profileTab === "connected" && (() => {
              const genderLabel = { female: "Female", male: "Male", nonbinary: "Non-binary", unspecified: "Prefer not to say" }[connectedProfile.gender] || "Not set";
              return (
                <>
                  <div className="flex flex-col items-center text-center mb-5">
                    {editingConnectedProfile ? (
                      <label className="relative cursor-pointer active:scale-95 transition">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePicUpload(e, setConnectedDraft)} />
                        <Avatar name={connectedDraft.username || "?"} pic={connectedDraft.pic} size={84} />
                        <div className="absolute bottom-0 right-0 rounded-full flex items-center justify-center" style={{ width: 26, height: 26, backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                          <Camera size={12} color={DARKTEXT} />
                        </div>
                      </label>
                    ) : (
                      <Avatar name={connectedProfile.username || "?"} pic={connectedProfile.pic} size={84} />
                    )}
                    <p className="font-semibold text-[16px] mt-3" style={{ color: DARKTEXT }}>{connectedProfile.username || "Add a username"}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: DARKMUTED }}>{connectedProfile.age ? `${connectedProfile.age} years old` : ""}{connectedProfile.age && connectedProfile.gender ? " · " : ""}{connectedProfile.gender ? genderLabel : ""}</p>
                  </div>

                  <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-[14px]" style={{ color: DARKTEXT }}>Your details</p>
                      {!editingConnectedProfile && (
                        <button onClick={startEditConnectedProfile} className="text-[11.5px] font-medium flex items-center gap-1" style={{ color: LOGO_PURPLE }}>
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>

                    {editingConnectedProfile ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11.5px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Username</label>
                          <input value={connectedDraft.username} onChange={(e) => setConnectedDraft((p) => ({ ...p, username: e.target.value }))}
                            className="w-full rounded-lg px-3 py-2 text-[13.5px] outline-none" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[11.5px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Age</label>
                            <input type="number" min="13" max="100" value={connectedDraft.age} onChange={(e) => setConnectedDraft((p) => ({ ...p, age: e.target.value }))}
                              className="w-full rounded-lg px-3 py-2 text-[13.5px] outline-none" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
                          </div>
                          <div className="flex-1">
                            <label className="text-[11.5px] font-medium mb-1 block" style={{ color: DARKMUTED }}>Gender</label>
                            <select value={connectedDraft.gender} onChange={(e) => setConnectedDraft((p) => ({ ...p, gender: e.target.value }))}
                              className="w-full rounded-lg px-3 py-2 text-[13.5px] outline-none" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: connectedDraft.gender ? DARKTEXT : DARKMUTED }}>
                              <option value="">Select</option>
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="nonbinary">Non-binary</option>
                              <option value="unspecified">Prefer not to say</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button onClick={() => setEditingConnectedProfile(false)} className="text-[11.5px] font-medium" style={{ color: DARKMUTED }}>Cancel</button>
                          <button onClick={saveConnectedProfile} className="text-[11.5px] font-semibold px-3 py-1.5 rounded-full" style={{ background: logoGradient(), color: "#fff" }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-[13px]" style={{ color: connectedProfile.username ? DARKTEXT : DARKMUTED }}>
                        {!connectedProfile.username && <p style={{ color: DARKMUTED }}>Nothing set yet — tap Edit to fill this in.</p>}
                      </div>
                    )}
                  </div>

                  {/* connected bio, 5-6 lines */}
                  <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                    <p className="font-semibold text-[14px] mb-2" style={{ color: DARKTEXT }}>Bio</p>
                    {editingConnectedProfile ? (
                      <textarea value={connectedDraft.bio} onChange={(e) => setConnectedDraft((p) => ({ ...p, bio: e.target.value }))} rows={4} placeholder="A few lines about you — 5-6 lines works well"
                        className="w-full rounded-lg p-2.5 text-[13px] outline-none" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
                    ) : (
                      <p className="text-[13px] leading-relaxed" style={{ color: connectedProfile.bio ? DARKTEXT : DARKMUTED }}>{connectedProfile.bio || "Nothing set yet."}</p>
                    )}
                  </div>

                  {/* "Only For People I Care About" — approval-gated, 300 word cap */}
                  <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                    <p className="font-semibold text-[14px] mb-2 flex items-center gap-1.5" style={{ color: DARKTEXT }}><EyeOff size={13} style={{ color: LOGO_PURPLE }} /> Only For People I Care About</p>
                    {editingConnectedProfile ? (
                      <>
                        <textarea value={connectedDraft.privateBio} onChange={(e) => handlePrivateBioChange(e, setConnectedDraft)} rows={4} placeholder="Nobody can see this unless you approve their request"
                          className="w-full rounded-lg p-2.5 text-[13px] outline-none" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
                        <p className="text-[11px] mt-1.5 text-right" style={{ color: DARKMUTED }}>{wordCount(connectedDraft.privateBio)}/{BIO_WORD_LIMIT} words</p>
                      </>
                    ) : (
                      <p className="text-[13px] leading-relaxed flex items-start gap-1.5" style={{ color: connectedProfile.privateBio ? DARKTEXT : DARKMUTED }}>
                        <Lock size={11} className="mt-0.5 shrink-0" />
                        {connectedProfile.privateBio || "Nothing set yet — connections can request access once you do."}
                      </p>
                    )}
                  </div>

                  {/* people who've asked to see the section above */}
                  {(() => {
                    const pendingRequests = threads.filter((t) => t.incomingThoughtRequestStatus === "pending");
                    if (pendingRequests.length === 0) return null;
                    return (
                      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                        <p className="font-semibold text-[14px] mb-2.5 flex items-center gap-1.5" style={{ color: DARKTEXT }}>
                          <UserPlus size={13} style={{ color: LOGO_PURPLE }} /> Access requests
                        </p>
                        <div className="space-y-2">
                          {pendingRequests.map((t) => (
                            <div key={t.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}` }}>
                              <span className="text-[13px] truncate" style={{ color: DARKTEXT }}>{t.realName}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => respondThoughtAccess(t.otherUserId, "denied")} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: DARKBORDER }}>
                                  <X size={13} style={{ color: DARKMUTED }} />
                                </button>
                                <button onClick={() => respondThoughtAccess(t.otherUserId, "approved")} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: logoGradient() }}>
                                  <Check size={13} color="#fff" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </main>
        )}

        {view === "settings" && (
          <main className="flex-1 flex flex-col overflow-y-auto">
            <header className="px-4 pt-6 pb-3 flex items-center gap-3 border-b" style={{ borderColor: MUTED + "22" }}>
              <button onClick={() => { setSettingsPanel(null); setView("profile"); }}><ArrowLeft size={20} color={CHARCOAL} /></button>
              <span className="text-sm font-medium" style={{ color: CHARCOAL }}>Settings</span>
            </header>
            <div className="px-5 py-5 flex-1 space-y-2">

              <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${MUTED}22` }}>
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: CHARCOAL }}><Bell size={16} style={{ color: MUTED }} /> Notifications</span>
                  <button onClick={() => { setNotifPrefOn((s) => !s); setToast(notifPrefOn ? "Notifications muted" : "Notifications on"); }}
                    className="w-10 h-6 rounded-full flex items-center px-0.5 transition" style={{ backgroundColor: notifPrefOn ? TEAL : MUTED + "55" }}>
                    <span className="w-5 h-5 rounded-full bg-white transition" style={{ marginLeft: notifPrefOn ? 16 : 0 }} />
                  </button>
                </div>
                <div className="h-px" style={{ backgroundColor: MUTED + "1A" }} />
                <button onClick={() => setSettingsPanel(settingsPanel === "privacy" ? null : "privacy")} className="w-full px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: CHARCOAL }}><ShieldCheck size={16} style={{ color: MUTED }} /> Privacy & Safety</span>
                  <ChevronRight size={15} style={{ color: MUTED }} />
                </button>
                {settingsPanel === "privacy" && (
                  <div className="px-4 pb-3.5 text-[12px] leading-relaxed" style={{ color: MUTED }}>
                    DearStrangers never shows your real name to anyone until you and they both add each other back. You can block or report anyone from their profile page at any time.
                  </div>
                )}
                <div className="h-px" style={{ backgroundColor: MUTED + "1A" }} />
                <button onClick={() => setSettingsPanel(settingsPanel === "blocked" ? null : "blocked")} className="w-full px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: CHARCOAL }}><UserX size={16} style={{ color: MUTED }} /> Blocked users</span>
                  <ChevronRight size={15} style={{ color: MUTED }} />
                </button>
                {settingsPanel === "blocked" && (
                  <div className="px-4 pb-3.5">
                    {blockedUsers.length === 0 ? (
                      <p className="text-[12px]" style={{ color: MUTED }}>You haven't blocked anyone.</p>
                    ) : blockedUsers.map((b) => (
                      <div key={b} className="flex items-center justify-between py-1.5">
                        <span className="text-[12.5px]" style={{ color: CHARCOAL }}>{b}</span>
                        <button onClick={() => setBlockedUsers((prev) => prev.filter((x) => x !== b))} className="text-[11.5px] font-medium" style={{ color: PLUM }}>Unblock</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="h-px" style={{ backgroundColor: MUTED + "1A" }} />
                <button onClick={() => setSettingsPanel(settingsPanel === "report" ? null : "report")} className="w-full px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: CHARCOAL }}><Flag size={16} style={{ color: MUTED }} /> Report a problem</span>
                  <ChevronRight size={15} style={{ color: MUTED }} />
                </button>
                {settingsPanel === "report" && (
                  <div className="px-4 pb-3.5">
                    <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={3} placeholder="Tell us what happened..."
                      className="w-full rounded-xl p-2.5 text-[12.5px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                    <button onClick={() => { if (!reportText.trim()) return; setToast("Thanks — we'll look into it"); setReportText(""); setSettingsPanel(null); }}
                      className="mt-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium" style={{ background: gradient(CORAL), color: "#fff" }}>
                      Submit report
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white overflow-hidden px-4 py-3.5" style={{ border: `1px solid ${MUTED}22` }}>
                <p className="text-[13.5px] font-medium flex items-center gap-2.5 mb-1.5" style={{ color: CHARCOAL }}><Lock size={16} style={{ color: MUTED }} /> Account recovery</p>
                {linkedEmail ? (
                  <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
                    Recovery email: <span style={{ color: CHARCOAL, fontWeight: 500 }}>{linkedEmail}</span> — use it to sign back in from any device.
                  </p>
                ) : recoveryLinkSent ? (
                  <p className="text-[12px] leading-relaxed" style={{ color: MUTED }}>
                    Check {recoveryEmailDraft} and tap the link to confirm.
                  </p>
                ) : (
                  <>
                    <p className="text-[12px] mb-2 leading-relaxed" style={{ color: MUTED }}>
                      Add an email so you can get back into this exact account if you switch devices, clear your browser, or reinstall. Stays private — never shown to anyone.
                    </p>
                    <input value={recoveryEmailDraft} onChange={(e) => setRecoveryEmailDraft(e.target.value)} type="email" placeholder="you@example.com"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-white mb-2" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
                    <button onClick={sendRecoveryLink} disabled={isSendingRecoveryLink}
                      className="w-full py-2 rounded-lg text-[12.5px] font-medium disabled:opacity-50 transition" style={{ background: gradient(TEAL), color: "#fff" }}>
                      {isSendingRecoveryLink ? "Sending..." : "Save this account"}
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${MUTED}22` }}>
                <button onClick={() => setSettingsPanel(settingsPanel === "logout" ? null : "logout")} className="w-full px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: CHARCOAL }}><LogOut size={16} style={{ color: MUTED }} /> Log out</span>
                  <ChevronRight size={15} style={{ color: MUTED }} />
                </button>
                {settingsPanel === "logout" && (
                  <div className="px-4 pb-3.5 flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: MUTED }}>Log out of DearStrangers?</span>
                    <button onClick={() => setLoggedOut(true)} className="px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ backgroundColor: CHARCOAL, color: "#fff" }}>Log out</button>
                  </div>
                )}
                <div className="h-px" style={{ backgroundColor: MUTED + "1A" }} />
                <button onClick={() => setSettingsPanel(settingsPanel === "delete" ? null : "delete")} className="w-full px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: "#C0392B" }}><Trash2 size={16} /> Delete account permanently</span>
                  <ChevronRight size={15} style={{ color: "#C0392B" }} />
                </button>
                {settingsPanel === "delete" && (
                  <div className="px-4 pb-4">
                    <p className="text-[12px] mb-2" style={{ color: "#C0392B" }}>This can't be undone. Type DELETE to confirm.</p>
                    <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE"
                      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none bg-white mb-2" style={{ border: "1px solid #C0392B55", color: CHARCOAL }} />
                    <button disabled={deleteConfirmText !== "DELETE"} onClick={() => setAccountDeleted(true)}
                      className="w-full py-2.5 rounded-full text-[13px] font-medium disabled:opacity-35 transition" style={{ backgroundColor: "#C0392B", color: "#fff" }}>
                      Permanently delete my account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}

        {view === "compose" && (
          <div className="flex-1 flex flex-col">
            <header className="px-4 pt-6 pb-3 flex items-center gap-3 border-b" style={{ borderColor: MUTED + "22" }}>
              <button onClick={() => setView("home")}><ArrowLeft size={20} color={CHARCOAL} /></button>
              <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: CHARCOAL }}><Feather size={15} color={AMBER} /> Share Your Feelings</span>
            </header>
            <div className="px-5 py-4 flex-1 flex flex-col">
              <p className="text-[12px] mb-2" style={{ color: MUTED }}>How does it feel right now?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(MOODS).map(([key, m]) => (
                  <button key={key} onClick={() => setComposeMood(key)} className="px-3 py-1.5 rounded-full text-[12px] font-medium transition"
                    style={composeMood === key ? { background: gradient(m.color), color: "#fff", boxShadow: glow(m.color, "40") } : { border: `1px solid ${MUTED}33`, color: MUTED }}>
                    {m.label}
                  </button>
                ))}
              </div>

              <p className="text-[12px] mb-2" style={{ color: MUTED }}>How long should this stay up?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {DURATIONS.map((d) => (
                  <button key={d.key} onClick={() => setComposeDuration(d.key)} className="px-3 py-1.5 rounded-full text-[12px] font-medium flex items-center gap-1 transition"
                    style={composeDuration === d.key ? { background: gradient(CORAL), color: "#fff", boxShadow: glow(CORAL, "40") } : { border: `1px solid ${MUTED}33`, color: MUTED }}>
                    <Clock size={11} /> {d.label}
                  </button>
                ))}
              </div>

              <textarea value={composeText} onChange={(e) => setComposeText(e.target.value)} rows={6}
                placeholder="No one will know it's you. Say the real thing."
                className="w-full flex-1 rounded-xl p-4 text-[15px] outline-none bg-white" style={{ border: `1px solid ${MUTED}33`, color: CHARCOAL }} />
              <button onClick={publishPost} disabled={!composeText.trim() || isPublishing || !authUserId}
                className="mt-4 w-full py-3 rounded-xl font-medium text-sm disabled:opacity-30 active:scale-[0.98] transition flex items-center justify-center gap-2" style={{ background: gradient(AMBER), color: "#4A3708", boxShadow: glow(AMBER) }}>
                <Feather size={15} /> {isPublishing ? "Sharing..." : "Share Your Feelings"}
              </button>
            </div>
          </div>
        )}

        {!FULLSCREEN_VIEWS.includes(view) && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-6 py-2.5 flex items-center justify-between" style={{ backgroundColor: "#fff", borderTop: `1px solid ${MUTED}22`, boxShadow: "0 -4px 16px rgba(58,46,42,0.05)" }}>
            {TABS.slice(0, 2).map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setView(key)} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition" style={{ color: view === key ? CORAL : MUTED, backgroundColor: view === key ? CORAL + "12" : "transparent" }}>
                <Icon size={20} /><span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
            <button onClick={() => setView("compose")} className="rounded-full flex items-center justify-center -mt-6 active:scale-95 transition" style={{ background: gradient(AMBER), width: 52, height: 52, boxShadow: glow(AMBER, "77") }}>
              <PenLine size={20} color="#4A3708" />
            </button>
            {TABS.slice(2).map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setView(key)} className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition" style={{ color: view === key ? CORAL : MUTED, backgroundColor: view === key ? CORAL + "12" : "transparent" }}>
                <Icon size={20} /><span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
