import React, { useState, useEffect, useRef } from "react";
import {
  Home, MessageCircle, Bell, User, ArrowLeft, Send, UserPlus, Lock, Check,
  CloudRain, Smile, Sparkles, HelpCircle, Moon, Heart, Ear, Feather,
  PenLine, Clock, Settings, LogOut, Trash2, Flag, UserX, Pencil, X,
  SmilePlus, Paperclip, ChevronRight, ShieldCheck, Users, Inbox,
  Award, Quote, StickyNote, Tag, Camera, Pin, EyeOff, MessageCircleHeart, RefreshCw, Copy, CheckCheck,
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
const OPENER_TONES = ["Funny and playful", "Casual and friendly", "Bold and flirty", "Sweet and genuine", "Respectful and formal"];
const OPENER_FORM_DEFAULTS = {
  yourAge: "", yourVibe: [], theirName: "", theirAge: "", knowThemVia: "",
  howWellKnown: "", noticedSomething: "", platform: OPENER_PLATFORMS[0],
  intent: OPENER_INTENTS[0], stage: OPENER_STAGES[0], tone: OPENER_TONES[1],
};

// Builds 3 tailored opener suggestions entirely on-device — no API key needed.
// Every line is written to avoid gendered verb conjugation (uses "hai"/"tha"/
// "chahiye"/subjunctive forms), since the sender's gender isn't asked here.
function buildOpeners(form) {
  const name = (form.theirName || "").trim();
  const namePart = name ? `${name}, ` : "";
  const ctx = (form.noticedSomething || "").trim() || (form.howWellKnown || "").trim();
  const stage = form.stage || OPENER_STAGES[0];
  const stranger = stage.startsWith("Bilkul pehla");
  const friendsAlready = stage.includes("Already dost") || stage.includes("Bestie");
  const tone = form.tone || OPENER_TONES[1];
  const g = tone === "Sweet and genuine" ? "Hii" : tone === "Respectful and formal" ? "Hi" : "Hey";
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const openers = [];

  openers.push(
    ctx
      ? {
          style: "Context wala hook",
          message: pick([
            stranger
              ? `${g} ${namePart}${ctx} \u2014 usko lekar thodi si curiosity hai, bata na iske baare mein?`
              : `${namePart}${ctx}, wo kaise chal raha hai?`,
            stranger
              ? `${g} ${namePart}${ctx}, sach mein? Aur bata na kaisa raha.`
              : `${namePart}${ctx} \u2014 kaafi interesting laga, aur sunao.`,
          ]),
          why: "Kisi specific cheez ka reference generic 'hi' se zyada asar karta hai \u2014 pata chalta hai tumne dhyan diya.",
        }
      : {
          style: "Simple aur seedha",
          message: pick([
            stranger ? `${g} ${namePart}kaise ho? Bas hello kehna tha.` : `${g} ${namePart}kaise chal raha hai sab?`,
            stranger ? `${g} ${namePart}kaafi din ho gaye, socha hello bol hi doon.` : `${g} ${namePart}sab badhiya?`,
          ]),
          why: "Low-pressure aur simple \u2014 koi expectation nahi banata, bas baat shuru karta hai.",
        }
  );

  openers.push({
    style: "Curious sawaal",
    message: pick([
      friendsAlready
        ? `${namePart}ek random sawaal \u2014 aajkal kya chal raha hai life mein?`
        : `${g}! ${namePart}${(form.howWellKnown || "").trim() ? "suna hai " + form.howWellKnown.trim() + " \u2014 " : ""}sach mein sab kaisa chal raha hai?`,
      friendsAlready
        ? `${namePart}bohot time ho gaya baat kiye \u2014 kya naya chal raha hai?`
        : `${namePart}ek cheez puchni thi \u2014 weekend mein kya karna pasand hai?`,
    ]),
    why: "Genuine sawaal reply karna easy bana deta hai, pressure nahi lagta.",
  });

  const toneVariants = {
    "Funny and playful": [
      `${namePart}okay ye thoda random hai but hi \ud83d\udc4b ${ctx ? "\u2014 " + ctx + " dekh ke text karna hi tha." : "\u2014 bas keh dena tha before I lose the nerve."}`,
      `${namePart}breaking news: ${ctx || "socha aaj hi baat kar loon"} \u2014 reply karoge?`,
    ],
    "Bold and flirty": [
      `${namePart}${ctx ? ctx + " \u2014 bas itna kehna tha ki" : "not gonna lie,"} tumse baat karne ka bahut mann hai.`,
      `${namePart}bina lag lapet ke \u2014 tumse baat karne ka mann hai, hi.`,
    ],
    "Sweet and genuine": [
      `${namePart}${ctx ? ctx + " \u2014 socha ye batana zaroori hai ki tumhare saath baat karna accha lagta hai." : "bas ye batana tha ki tumhare saath baat karna accha lagta hai."}`,
      `${namePart}kaise ho? Bas itna kehna tha ki tumse baat karne ka mann hai.`,
    ],
    "Respectful and formal": [
      `${g} ${namePart}umeed hai sab theek hoga. ${ctx ? ctx + " \u2014 socha baat kar loon." : "Bas ek hello kehna tha."}`,
      `${g} ${namePart}socha ek baar baat karni chahiye \u2014 kaisa chal raha hai sab?`,
    ],
  };
  const toneMsgOptions = toneVariants[tone] || [`${g} ${namePart}${ctx ? ctx + " \u2014 socha baat kar hi loon." : "kya chal raha hai?"}`];
  openers.push({
    style: tone.replace(" and ", " & "),
    message: pick(toneMsgOptions),
    why: `Tumne jo tone chuna (${tone.toLowerCase()}), usi ke hisaab se likha gaya hai.`,
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

const LOGO_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAADDCAYAAAA4GCyWAAChuklEQVR42ux9d5xcZfX+c857p2xP770REmrooWxC70WYBbGLgl8UVOx+gdkB7L2hoH4tP1HYBaSIIC1Zeu8JBAIhvSfbp933nN8ft04ESTBANPPyGTa7O23v3Pe55zznOc8Bqqu6qqu6qqu6qqu6qqu6qqu6qqu6qqu6qqu6duxF1UPwH/uZETIZAoAMMpgxI6MLF7YTAMyYkdE3e3BrK3SL7+lf3e/Nfh/c51/9fmtX/D290fNt+Z638jlp4cJ2mjFjgbbmWpW8p9XY8dPqqVRd1bX9FwNZzmTaTKZNDbEBsQGoeq3Z1qWqxGzAbNDWpiabzbJ3fKsX7mqEVV3/xmeSpWy2FWgFLjNGVCT++wEA8gCmNzRMmZUYMMqOnHjw8uF7HbGxa/Urwwtrl051bbmGwS6pCpE14pbrVTUFFRYVISUhYoGoA0WKGAwlInCemcuqSlA3rSrMZJTBZSJTECUB2TREakUkARFiOCUiWICJSKwqmMUOY6KSqpSJSIwxeRBcBpdVSckqAUqAJMSWa5TUYSVHiVxWconYMqmjpJZFHSJRPz4iZnIBckBWSUgAgBhlApXIwDLIrU3VrJ8+adcXS25f6dEXOiav27S6YfWa1xb1YeM8AMMAdAEoBgfUsIFrXW5tbUUul9NqBFYFrOrais8hm1W67HJHVGz8d7vVJoY6jbselBk+40gX4p5dP3Y3N1E7pMlwamQy2YBkohbGJMDkgIgBVcAFSBVQBYHA5L0IKSEMKxTe74I3IF7iRFAweT+HeN/DCqAAg0AefEBFQeL/DAqG91oGDKiAVEEKsGoQ4oBVQerdn5TAREDwWhq8J+9xpAomwABgYu99k5fVkY8n5D83ASBSEAOGAWYLpiIEebilHvT1by46aV7w2spnhlvp71i5/uV1Lyx+fPnLy5/rALAcwDoAYPb+mosvuZir4FUFrOra8vhnMkw33GhVbbAtEonE+N1GH3TcoQ0T92g2DUMPTg/bZUBq0KhUKj0ICSIYBdQC5IolawluGWQtAaQQ8Tc7QH5gRgoQUQxYyAOOECRISQFAidXLNj3g8J9D1QMu/2dM/v1Fif1HmgBAJAIeiPog6X8PpfB7/31APTBlhYooAR4IEqBQL/FljfI21XgORyAIKPzPe4PMQcJMMMoKEBiGEyaJZBJIJQXMeZRlvXT1vyYl2fTU8jUvLVq49IWb7n7ihhcALANQIGKIWGqlVsohp1XgqgLWTnvcM5k2vv6G91s/mnISwPTJcz9zVNP0w46vGTXloPTIyXVc0wgtA1K0QKlsSVxlsUwEMBikYBLyAcWPXIKoBgArRdEHYlGMDwI+iITAFEY+fgSGIHpRAon3vFHERuAAlOLghuB+BFIJANF/XopeGxWA6YGNBhET+VEZhe/Diwy9F4oBp/daFL3P8KT2XxsKqCrUikJJ1X/PCZOQRMpxGuqTGDAgibp6F72l1djY/fqyFWteePCpF+fdeetD7ff40RcMm3jUVQWuKmDtHMfbS/tCXmrQqD1OOXj4Psd+pmnKPrPrhu9Sb2oaUS66kGJJYK2yCBtiMBHB3/DqRy5qI5BS8TZ7ABysQRpIlWClGkVgsWgnSBfD5/A3Nip+TmGKR14M5AGZD4heyhcBoQYppsbeG4K0UkNwCx5LsSgOcTZcFUSV741A8IA7StpU46AawYp35BTEBGY/ovPCSPWjNmVmTSQcbqxPU30dUHZXozu/6PWXVz56919u/+3tr6157RYAbhW4qoC1E0VUZ1kfqIZNaD7vw0P3O/Lcuumzp6YGjQLnFdKft+paL3ICeekTAQbkRUsa8VIqCoj3M/hpmMcPKZg4ikJikRZCTgmxiAaVfJVG94sDURxMvPfgg4ZoBIL+KcXh77wnDYAu/rgo9YuBjFIIal4EhSgKQxR9VYJs7CjHIsDg71MFjH8giRTMgGECG4r0IeS9lqpCXZWSCzVkeFBjHQ0ZpugpP4/XVj1y110PX//9u56cdzcAiQGXVE/vKmD996xMxtANNwap37BdTvrah4YccOwn0tP2mm5SjbA9JdFCUR0BMzGFqVSQpgEwSuFGRUCkiwcwqgqyGgIFw+OrPDI8Itq9aMZPreLEtr/RGQAJVaaJ6vNEwWtoBCbkv0/vawQcweM4luYhiKrgR20+sMIH03hUFIIg+X+HxqItVV9IFYssNXpfAV8Hgs+PRYQ8+8/H7H+lQBmiFeKsoLAgViGuirWsDXUpHjMqSeIslhWbn/rHNff8/sqOx++8HYBVVSKiKjFfBaz//GOrXiqjAGrGHdhywajjPvKppt3nTFRTC7c3L1xyQSAmIqj1q2nq8zeqYUWOxd9SATD4qVgQWUWRE4WVNPKVAxRER37uwxrwSH5aJxF4UMAnxdO0AIDEZ8GDSIsiMj1M0QJOiyIAjEc8HoCR/xyx6l4cvMKIyvubNEwNKYrGKEoVA54qiN7inB2R/xiKAS0BxBQ9D8W5ugCsCcQIOTcRgVuGpNNJHj+qDlSzVNb2PH7Tr/78858/tOi++4jInnHGdaa9vcVWT/sqYP2HRlU3WBXB4NEHzBnz4c9f3rDPUYckagYBXf1CVmCIPfpF/E0ufqQgAXEegEuUTmlss3vgQBUyAA44pjD9i2/oIErxyWsf3CisAAYAFqvq+aAZgVnwM4QRH6uChKCI8Vfhe/Dek6pWvMeAqA/5pRAk4xFcAEBRESEiq+L38/Emxp0FSSdTFHEGKMt+9KgUkfRhRBlwZxQBGwgw5IGeqmqxCKkxSZ46tZbc5AJ58Pm//zl71Ve/DmC5tqmhlqBOWl3vxDLVQ7B9LwDN2XnO0iu/bKE6bOr7c98Z9dEv/aJ+1hHjpABLvX0wzMyxJIIotnljRDjCCAFgL7aJIgzEIwm/WhbqqTQUwQcRgve7SAgQpIgIaeNYBBePRAKuSeO8EYXpGCh6DRMxXuFjFVHVMrxnjDCv+JvjqWYMPCjWUUMRhvmREXkyB4rfP/hL1Qcq/9EVKSDFOK8owgqOWpA+Bn8b4L0OKZHjMFu4tHJVvy33D+MDdz94z2MPOCxT0vKm938v8zQz49JLL+WOjo4qaFUjrP+MFHDibocfNebDX/1WYs+5+xSLKtSbh2FiX4rgyQH8r4H4Eooo3dI4Ce6nRhJIEaiCfOZQQoBQWxWS21uU/6PIDBUVw0AvxUoxaQJVkuFxMNUAJDXiyoJoJUbCa1hFjAhuVo0Bqf83UlRJ5Ohghgc25KN0ywgrEqBSGNZoGDkS+cAYRGqxs50D4kojcAdrpFnzH+vdNOTyQB7nxcQQV1AqwY4bPcAMGrEKHQtvuObSX3zuQgCb2traTEtLNUWsAtaOnQI6u7z/KxePft85X6YhU2uKG/tctuowmZD0Zok2ukesa6zKR6HgMxBsBt+H0YpEUQjHK3WI0sk4BxTqpWJpnUpM2iBbEOBSCXYIU1Sq4K0YqJBHIPYzjVcENSoIIAYuAcCxeA+KpA8UFhaYYpxSLD3UOGCpF27RFmldoNgPMckHzkCRykAsEvUiMyYNNfSEgKQnH+FjldXggILAZFAqWqlNpTBz9zSv6rvzyW9ddcmXHlv05DxVNUTVFLGaEu5IK5tl/OqXAtGBs77xl58NyJz7+bIZ4simHjXMhiLZdYXUQDVSekcbMl7Z8nMZpYoKWFx/xOSnWEQVpHSw5Zgq00LCG6Rm8dcKIq8QUPxIj2KpWgyEgnQqCoYoFpEFfxPHXoe9lC2ehvmFhnhaFgJPrAgQvXOqBJowFYxAjf2wirYg9YHKymUoouXYcwQiVI6Ok8aiTF/gH4MgheMQuWJp+esld/TQmWOOO+qA04cOrX/l6FOOWWCMgapyFbSqgPXeB1ZtbWbhZz4jTc7IfWZ86//dnjzijCPLm63r9BWZEwlvr/sVO40JJ6PoINqwFaAUU2ijImqoVIxXVNTCNCjioNi/xTdXKMRETJQZi17CKCL4nmKqdEKFgBSxx8ffd8SPKbCFXipikDQGzhpGRAj/hgjQFJUpHcWjI4qTUX7U5l8ZIi7Nu6Nii0qiz1WFz0M++BLF+f0wrZQKcI7AWv2o1zHgFUv7rO0flT5w1l4tDWme/PALD95sjJEqaFVTwvccrNpbWuyUY8+dPOzDH5vPux44prCy300qHIInRaCY/CBMqwQwbyBNCLilkPMJUkIbRToRMChIVCECKISVlcPKGFc2N4cRTGWKGWiiKCaNYEGsChlVB+MAF09b48AWSS6oMl1DJfdVoaSv0INFSvaoNUdDcp0RA9U3iLAqCfx49KYQVYIHGH7y50VVQbRGFKSOUdEguohoDPhilcvgwuFrugAfuIiQz5e1LlVn99/fcV5ae/OvzrrkrIuMMXlrL2agKjStAta7nQWqco5IZpx8wYzBF33+Nhk0cUJ5ea9rmJ1AsxRqkMQDghC0hELAgmiljEAiQWiFxskj2oVBasioYWOYExSCgwCwXjWRVWFI/D4/CdNKTxmvIQ8G/73EG5wp5LB8wBKNNFDxVDHg0iTmmBBEheLJG5hMWL30+vr0n/sYQ3LeS49NLIVVUahKWIEkplA+ET6XH0Ea43FN4WuBvahWAIjj/f1woepCUVZVKyABqeepw+zf38d2RmWVMqjWxtPfUN9FqKjKql+dLJcsyHXc5iManBc33nJ7y0VnfIKZV11yySVVdXwVsN7F1aYGLWSnnPSpA0d88eJ2aRo9xl3TZxNsjAYRUvBVo68BCIXEtkRRlYpPxvsAp9bPP0SVwJpwUpxKpcgwgKJFsWsNir2dG3pXLTMQ+1Syvv6JriULRpT6Oo0tFcqAFlksiYpClGAtCyWEvB2nDMBaMYAlqBEiR6BlYnKEiUTUNRABkCwShFXFMAyYWSBKAiUOYgolQBiAhVoVqFpiJYjjGHYYxABKJCIeW62WmYwQSMWWHFIoGadMCkNqTcKkywolK1ZJqCxqDbMDImaIknov6NFMPv3uJJJlwwwwQyFwyKSYtIE5ZcYM3W1luZTfU60ePHzw+HxT3fDBTfVDkEokYa2gWOxX17oCFSIyHPCCFVIJEwlaFdgilaUKUAuKpV6dxcItWTv3iOHm4RfbXvrE5e8/yhhecbG9hHPVSKsKWO/0as5mnY5czt3ro5dNrfvYR+91m8aO0bV91jiOgXfRroiUwvSqIiWMFOEc+zdEQRaAtapCwiZhEukakGtR2LAEhU1rXu5etnBJsafz9g3PP7hy/ZJb7gPQAODV6ifzlssBMBlA566jzpyzy8R9hw6oHX7U0MaxMxvSwycPqBkNCKNULqhChBkmYRhBxSEAL43xdqKR4j9UzFNEpREp2CjICEr9KM89dETi2SVtj3/gsjMPV9V+nzurglYVsN4x0sqgvcXu+vHvja/72Nn3oGnUZKzts45jDOJRlEUswoqnX76+SiKXgwCwVAB1rbKwJFK1xjChf/US9K9f+mj3kqfuWfvU3zrWL573GIDOig+PCCJCc1ph5rfCAkArQAvb/c+1fdv/zHXr5tOwYXM0+Pcb3cf7fTuAzD89FpgPYM6/vG/wvPHXCf79z88HDBu23v9d8Bxb/mEZAO0VXvatrVC0glrngy+/z3EVEhYxYmvIriNO3G/GuENOGjts9yNHD54+dUjDWBTdPIpuwYKEiQ0F6aVYhVhAJJbeMsMYT4JBTGGIpVAQWxApFIpSXtwTjx3pvLLuzhuOv+i4M1SV/batKhFfBaztTloxLjfSNPaAvSf99Lc305Rdx2J1r3UcYzgky+PEeSwltBpqgELQikVY6lolONZJ1jjqAr0rXlzZ/erTN627/6b2NS+13xec0F4nD+GMa13T3t4CtLcHV2fd4rPU6vn8T8chjH+yyBKyrWgFwJexxEBs0HH7fXr2AVOP/viUUZNPmTx2JpddIF/otyAxqoRSUVAsKApFQbmkKJcFZVc8Fx6/ChnnuJg0JOjFOw/c004b6Sxae99Pj/z03M9WQasKWO8EWjGZK6TO2iHjf3H7C3VHHTvcruh3ybDD8R7AsHrmk9mCyiqhT1iz72EFqxDXWiddawwzehc9vW79gid+ueiai64E+tZ5IGX+FUBV13Y4/7PI0sxMK515vbHqu2TsPnL2oZkjzs3sOe2gs6eOnja4lBcplgowxJ4tmYYFSHh5ncKKoiyCclmRLwj6+svo7bUoFFxYsSAiWKuoS7J78kmjnD/f/etfX/TL886fN08xdy7Z6udaBaztcnya56npmEtm5i9v/7/0UceeLav6XUPGgcIDn7BpOWaCJ7EmZkGs+gaw9dM/k9RkOsndS1/u6lz42I8X/PJDVwNY5WWfatoXtCqqJnHv6medyWS4ra1NfXU6gAnjLznz65fuM33OxycNnore3oJVdjmRcIgp8tVyDOA4DJMgBAONRAXFgkVfr4ueXhe9BReuK+jqKWH4wPrygbNrEhdf3fqdK2/59lfnZec5c3Nz3epHUAWsf4+2UjXtRHbSOdnfDPzKpee4G4uuU4YT6qIEoU9UwGOx73jAwr4TgoYOoBABXJVEbR2X+3rQ9eSD7S//5vOX9W1+6QUQIXOdmPZqt/97H1Mjy61trcRnklUFZoyae/I5x1+UPXTmkbNSnELRzVtj2BgikPEdTDlweACYCYY92YMJhcPiKT8Y6C+WdfjgOltIbSp85htfOvuWR39/q1yqTDmqkvBVwHqbJ21WOXcZyYQTP9Ey9JLv/LGUGsBOd8EhYtLAo9wGgOWlfXGnTRaOhjcIoGJhYGy6Pm02v/DUxlXz7/rMilu+ei0ANGfnOR25udW0YAekA1Rb1eeZkp898aefmrPv3G/tNn632v6+kquwjmHjXbw4IOGDYRhecMxxZT0D7ACJFMGKlWHDa/nhRU+uPPnTH9yzW1/cDEKsEam63mhx9RC8IVoxWoFUcvyEuvd/9GppGpTi3oLRhAlb/mL6RQR1bSWKHEtCAlZhratIpS3XJMyKe27oeOyiU/ZccctXr82qMpDlDi8dqJ6oO9zKCRFpJpMxzKb0k79d+NMv/PLcAx54/r55dQ1JJ5l0RNTP5HyBLqxvX23hV4EpHGcWNI9LSeGQ4Y3r+u1hu+0z+juf/fq1RCRb9G9X1xusai/hG+HV/PmUI5KRl/28PXXiiTNobd6yY0w03CBqwtUKH3KKnD794F5EJFFbD+naaNbec90lL/7og58G9WxqzmadP8yda4Gqb9KOvhYuXKiqStnsPOem265Yc/PDv79+7KBdeczwsYfUm0Yp5otExBRUg0NwQqSEJ445sSIoyBAXu63dbddpUzZ3u50nf+DoR1Q1Pg+xuqqA9Ra8VVubuXL33WXS+7/6scHnfepC6oU64vvTVTgHIOZyWWlsQkGZ21qpqa/j/iUv0au/++aXl7Vnv03GcSGX8NKOXNUr6T9sdXT8QbLI8gPmwdI/nmq7p6u7pNNGzzx8WO1gWygUyfGdGYmDmzf0Ahwp5wMgC2yeyyWXGtL1OmzE4EPue/y59ou++qmNVQPAakq4lUtpRiajDaqDG886+4pUstY4JfGa3PyTTP3/JChrh1gVNRiDALGuJAbWcc/rC9e//NMvnby+4+rvNc+b56h1qdoA+x+cJCIn1rr8k2N/krrugR9d/rXfff6bL617yWmoqRXXteo5BvlEgY9OYcuOf/NmuwqUBU7KoZ6uvBw8bVbDFz/06Z9asTwHc6r7shphbUUqqK2cI5JRl/7q540nH3+Yri9YNcYEbgeBMV3gGl5pRBfNH4ZrJd1Yxz2LFy5/9ee54zqf/+t9mTY1fz9xYjWq+i+5st2x+A7RNuVPXnXm3a+uWlrcY+qso8YMHSVFWyRjDIVDMmLWzBWN1PBnJBoCJcCiKlMnT5i2fG33gi//4TMvaDbLuWqUVY2w3hytspwzLINnn7xv41EnfMjtgS373pJBVBWUeir8qEK3Jg/IxLqSbKxDz+IXNrz0wy+f1PlM27PIZp32FqqC1X9bON5CVtvUPLr4b9/+bvvlX1yy+XXTWF8nVlwFFOI3sltXoZYg1puOhNDS2bNlZodQlDKGNw3UDx7T8j1VNKG1tWL6WHVVAasSr1pbAVEMOuujl/DEMYlybx7qEClFEVVgqxtOVaEoqlICXLesVFtH3a88z4u++4VP9S+47dlMW5tBLlcVBf6XLmohOy87z7n3hT//4Lt/+daXV25caVJOCuWSq2oBcQGID1QWsdFsCGUv6g2/5c2dBTnmgEPHf/fcqz9MRKptbdX9WQWsN1iZNpNjloGHnnUCH3zIyeUeK2zYVLhRImZdTH6tx/dQggIiopSqscWudbTsd9//au+iO2/ItKlprw4i+K9fc3Nz3XlZdf7+1NXfa5v35/PzpbxrbMrakkLFP0d8MovCsqH3M1VAXQBlQrlfiIpGD5t14NeB+iFYkKlGWVXAeoPoqi2jUDWD3//+r6dGDYVTKCuzqbAhDvMAeNOGYxboEABMbE0CztrbrvnWxgf++J3meVpNA3cq0CJX29T88NYv//K3d151UzLpOGrZ1WAKke+AqPEx2YHBllVIWUEucdeGguw1buaI733qB2dTjkTbtLpHq4D1z9HVmGM/eUjj7IMPdLqtJJgMx08qingqUYWEVULxfiYiyaa0s/He2x9edfVF32yeN8/pmFsFq50wPZR5WXV+ePOXvnjngn+82tSYdpREyLBX3gpu4aihQGgcBVHWCpky6yEzDvw0MLQeGUg1yqoCVgyvMoAqGjNn/E9q1GDmklUyJhoEsQXlEJud4J1wIppurNH+l1/pWvyrn5xDzL0d8+dX+wF3zqXzAWGiZVff/qsLl/UuLzQ0pUWNDQcuei4PMQmMxko3BLBh7u8v2Znjd5l23nGfOJ+JtK3KZVUBy8sFs9wOksY9D98/vcv009DpKqk//8A/jQLluodPkYF3QC44TsJaWzZr7/nb/2LN3S8edsk9Dqqe3TvtyuVI7HVinnzt5r/f/MjffmOS7LDXduP51Fv4vFZwi6YUgRWcAMpOmRsaUjjiwNnnKJDOZDLVKKsKWECmtZVA0MHve/8nnMnjkuWCWGGQqPiu4RQbHhWf7+cPhRcr1JBwNnTc++iq3130y6wq+03M1bVzp4Z2Xnae85328y+///kHXq2vqTHlkivi+u6y/s3z9fdlMsxgYs9aOUHcXyrLQbvtN6Xl0M/u7/czVqOsnRywqN2wBQY1pg6cfVTZhYqnQUZYvdGoqhNOgAmGDqiA0yn0r1gua/505ddAJLmWFqqmgtUFAFcuXK9EtO7P9/75y+s2b7BJTapaf5KPRjlg6OxACm/EhtePWiq6MmbocG7ed9+LAKCtra16Xu3UgNXWxhDF0E9edJQzadIE6rECCoSi0VCBcCAzAKX47GSyTtpw73333tK34Jb5WRGOuYJW106+2ttbRET4pkd/eWvH8w8+kEomjZTFhqXlQB1jfJoh6KawACxBymLKRdH9Z+w9e2zN3qMMczUt3JkBK5PxBho0zdrrDKc+DZRLHiCpFySJijfNJhjFFbNOFxE16QT3L15SXnvDH1pBpDlqRTW6qq7Y0tZWgIjK18z7449XbF4ryUTSC9KNejuPpTK68nkuKStgmfq7SzJt5KShZ558+tGiiir5vtMCllI7s0Xt0BE8dsxxKAJKHLQwe0Zs4XinaAy6+nPJWUVMiqn76cfb+l+f92xGxFQbmqtry5XLkYoIP/zyjbc9+9rT99c3OQxHLDsUjhCLnZLRtGnyLpJSEDQma3S/GXudDoCDi2wVsHa6dLCdoYqBR555kpkyrckWXCH2pKIBWIXjtwJpgz+LzoqAUknqeX2FbL7zlh+CCO0tLdXdWV1veGVsb2knApXvePy2qzb0dcExjt/s5en5VGMkfGACCK/9S6HsFpUmDR/fPLxu0hBmskB2p46ydso/PpvJKABn0P77Hp5oqFGyVkK/otj9ghHt8GcLKhQCWK013PPSgnu7nrzmKZ+7qlYGq+sNV0t7i4gK3fDkz2979rVnX6tNJtmWrYRA5cscENP9eYIsgJNMBXHtlHFTGo6fkzldFWjLzNypeaydEbAoZ4wAqElOmTQ75YIc1xr1kz+Eoj7yyXYKpQwEgBIG5Z48+p586PcAkGudXy03V9e/jLLQDiag+9FFT/ylKGUlYgmaodUCajWM5sNdaQicNLCO1QFNaRy2x6z9ACQybTt3WrjzbbZsliCCwTP23y89adowlCBMHJs15508QGQcE/arimoi7ZjCay9t3Nj2wztBBOTmVKOr6vqXq7WlVRXAjQ/+5YbFa1+1iUTCiBWVEKQig0jyrUCCxnsRa9QCTTUNxwGoc4yx2ImrhTsdYGVmthIANM09cff0sKFpKVtFaLiGqGLjI1hoIqoEw8aaFGlpxbLbgd4NHtlenXJSXf965ZATVeWlG5546dXVS55JOw6pq1IRVfmApXF/NQVYDGw/ZLdJ09Pjmnbfx6oAyFYBa2dJB9u8ZlLw8OEn2zQDVkJDvqBOSHF/dh+wIApmw6VNfdT98MM3wSNUq7uxurbl9Ms/8+qCe/NFCxIORTChOWT0g7DXkISpVLQ6pHH4gOMOPGYsFMg277xypJ31D08l95hVK9aXLQSj5gMtO/kaZP/EIRAgrlKKqW/p6xs33XzTwyAC2lt21Oiq2ne2g60WaiFAqeO5+fcu37jKOk6S1A+vlGIfm18xFEuQssdxlcsuBqZrddyoCQcAoNb5rTuthGYnA6wME5Gm00P3FZEDqQAlVYNIL+rPkYvHWYESS5UNqLhk6QJg0SoV8dUyO9JSyrSpITbeWCpVzrSpQfYdL4UHrwtVpfC1M23mHX/dTJtRVfZv3ms3Z50dDbTb0S7MpM+9fttTqzauXJlMOAwmCV0c4A0GF4E/11B9p1KFugoY0MzJ0ydgJxcn71yAlZ2hADDwyBPyyTGjoCWXlAhbSGBiYQqFvu3iJMW1QHHVinkAiObP36EGeHjgQNreQlbFgog0RyTtLWSRy0k2+84YwWUybQaEitcNX7u9xfqv+w6AhxIRa3t7iyUi8W/ea3fkXCbWTCazQ31GXtM8Ol9ZtWiJSfi99cZv0fFRy9NkedG9iHhf2ZvDM7ihaTyARgA7rROps1P9tTM9DUsxWXMcBg4FymJBZDy2U0O1cUgpBOeRAJxwuLi52/Y99fACAIor1+84VzpmtLe32FrUjhx/1vfPSTQOPSnZMKjouHALG1YvWP/M/b/J5ehZIobq9gsKVZWIyAIYOuf037YY43yofuDoMpVKVOhe/0pX58orczl63OuVE9peBYqgRVgV9L7mbx0xeMDYjwyuHzGW4JqevnXlzr41f/zTXV++vr29vTeTaTPt7TuETbW617qGWqjcXyzdWQaaTdIo+S2CqrFpceoR7sTkN0QruVZB7Oxal5g0joheyCLLOex8A1d3KsDKZDJoB5AcO3aiplOQUlk5ACtvB4ZXOoqVbwxEyYB7Vq8o9T51+xNejL9gRzhZKKtKOSJMzPzg7MEHnvCD1PCpw9gyTBFwXKBxMuY2TDj0f4bsdvwVz153yuVZVc0R6b+ZWnhoQYSZB1x41tQjz/tG/eBpkxzrwHGBhAIpwsGFng0fHTP+0N+0/9+hX1JFFwXDYv69MJkJJKMHNY857qjP/nXqqEP3HZQegiQBKQOkUoBIae6eUw/53LV3/uLL7e0td2azyrkcvefp+5xfeBXqBxd20AeOeT+a0jUoi4UKYEB+ZRp+6KX+PEMCMaHkCkYOGFr68IHv7/rl/d8AsgBy1Qjrv3qtm+9dxBoPm7PaOH47BFViFcWxSz0wYxFQAiitWdeH4toSmADZAc6WrFKOSEYf85XvDT/5nC861ATp6XO17LKWWd2Sx3+k6ofx6P1Pzhr8dWyO6ByoBkKftwUe2awSEcn0g849d5fjv3hVsm4sSj09Lqx6UCjeaCvYGhox+pBPnHr2/IlEdHI2q4VcbkuX/G1NA40cs+cFQ/drPv/moY3TZ+U39bud+R5KGiDJHmjVppKy99iD9mw4se7v6bsSLbkc3ZjNZjn3HhsrzpkD6egAunt6ru/q33zJgJq6lFhVViJRvyWMNLIICexnBLAlqykn7WidjgawvMph7QRr/hxYAFxYv2kf34bIu+gHJeTQxj1eXvZqhGBAGwffDWBlxorBe024qxIuYxl50KePGfP+L1xY4zS53N0lDDggwwAZEBtj2MAtAsViedT+p3x8+glXfgVEms3q2+RAstzaCp2w69njdz/lq631g8YK93XZBJFDZIxVNmXLpixsSuUSdXd2l8dObD7i+FP/+t1cjuTtv64X9KrKqEkzjr133LDps0o9va4x6hhjDJQNhA0pG+vaxIZN3e6uI/cwpx3ywd+nUkMnX3bZZe+5PUsu16oA8MTrt2xcu369S2ElkLwRYHEvbg1mXRJUiOCSTVENr9qw6jTvZN45K/w70x9N5DgKIGlLhT1E/U0f+KfFUsN4DEBQMJHaEtC3dm0XALTPf+8JT6+NSJODDjkyWz9kaBK9vYDjMAWpBDwylwhgY0ht0SRAOnD83l8DRozPtUL/ucywFWl1WysRkY497MwL60dMHIn+HnGSxjB5nZbBRCEoYNiQIeuU8wU7ZOQe502f/qFpuRzL22jgDVJQ3XOXT547ZfLhuxXyBddJk+MkCE4ScBIMYxCKLwnG2bipz91r/NyGUw/6xGdU1VFVeq9PQfbEfgNWr19LKAJS8myTw6EUMRvuiFsFxCoMOxjcONAJwrUqYP3XLw+FTEOdG3hcSQBSgZQhBlqBJotBKPQD/a8sqgcArH+vS8tZJiJNNY4/PDFy4j6lHleE1YTDXQlg9rgPIo/QdZW4tyeP1MCJTUOmHjgbRMCU45LbuuN84W1jYuDw06UEFQVbQTjaJdKyEYgBY5iszaOxfowzbNT+xwGKTKb17QJHctouh81wkJZisUwqkeDXMMDGG/8OeBy/WxS2BcaIpolnAhiC9766pn6lcF19uuERX0YjsRPNv8gE9jMaDqxQKBLJBIYNGSIAsHPC1c4GWD7McDJJFHmnBeEKyOcRGB4JSqowCsACvb0A9Rd2DN3V8L/WAEDd2F2GmbohyUJRtKxE1ids2beeCBX76jXYFstWyDRourbxTAA0vjx8GzdvlohI0wP3bWKnZnQhX6aSq+SKP/5MCRCNAIsIhgkJhzTtJLWhfvhsAHgbtk5k2CiAXUtu90n5fnB/v3K5BH8MvJ/ShxExwAwwMdQCU0busQnAQLS+95Gxa10G0N1UO2A5CGBmDS4yASchkNCiG6phf6thQmNtnQLAnJlztApYO81fbXyw8khNgqJCLOST7QTPwbY/r8j3Aaa8g0ycH7xLGQAcJ20FBKuAC4Ig0O/EGrk1mHvne06woXS6sQhAPvrR35fe1uErbh7qugWnWLIoW1/oKBSyehUdA0RwDMMYUCoxqAwAd9/95Laed2rFEoB6CKXdMmBLBLcMWEve32sD/zJf7msInAQSKSDpOA6APF9m3usLjs5v9fbc+s6iWOtHVIFTCAgSmy2nCkjQz+r3FiY4wQAwf8F8qgLWTsJlaankNzurT6pTZRQW59wV6OkWUAlg63on/Ht9smRmuADQ8/rzpXJfZ5nYAax69roqfrSjnlg60JUxIZUwMG4R5f7CwwCwcGH7Nv4dOc1mlfv7lzrlQu9KpYRHWWkcoBBuP1H/ZgFbBjZvem0NACxa1PN2o4PF0NQ89j41IRWQKkTitwisQYpEArq5Z0MJwDKif6dCuX3X6jXQDZ0AG4X49jJi1bOcEQp/FoCwqjfAolAqJasR1k4DVf4+KpZt+G1o0BfpG4J4hOFdxfN9BBKAndSOkRLmcqqqlO9acmt57esvOzVsWFWi7ejHjYFljvgDX5MJLm1aWl696LG/g4D29sy2/j06H2DAfblr2YsLkDJEQkr+xA5GlIYG5nTlssJaB52dK7FmzaJ2ABjWceW2bjZtaQEDWLtsxXOPKpUolQCM8aPgYHayMCAEWya4JYUtkhTyoKdfe/RZAGy9dGyHiEwcx+jqtYJyyf/Q/LFf4keMwRxDL3L1PkhRoL9cxM68eOfCK++01u5+j5vVGFEc/Duo0AhgiFAqAOWSetlOTf2OEoYrtbQzgELfcw/9wNg+JOvq3ISqGjJgsGc36M9VtCIQa8rKhja99ug1pdJzr2au07dljdORaxUQda57ruP7pc0ryzUNDeLAqmPCZkwfLAliCW4RboJrnaWv3Xf/iy/+4KlsVrkd2+7Q2t5Oqqr09ILf/3r5+kc3DBhYbwy7kkgA7I9/V/J2PQFwS2JrnTpa8NqTm+5+4s8/ISKX6D0fw0ZzWr36BJPb0Nen6O1XOA6HZpEh2R6UfUjD0NWKRX+x2F8FrJ1kiesSANfU1D3ng5MyUSWgRTw1AEWhIHBFPAPSxhHe8doRwvH2FptV5RW3f+N3G+9tv86p56RJ1Qq5atVanwUXVaglkyin6uuSa19+oOO5Oz55PlSlveXtKr9zkrlOzLrF7XdtWHDHJSbpJhI1DaquWBGr1oq6rlVbtsIw5QGNjc66Nc8uWvjkH88m4nIu10IV8e42fHwAQNT12quvz2vZ1L0i31A7kMWF65ZFrBWPnSZVZriDGhvM2t4Vpv3hn7RuzC964tJLhYH33srasBEAQzf3rTsURtGZd5kSPlhVqBk07G9VUrBDWhYX6zZtKAFA64LWai/hf/nSOfPhAHBTw4Y+pYoTmcjrKg0qaqIg1ZC4VVHkCxJw8MDgkT6HtGPwIDkiyapyjuhTZZe6h846+pPp2pGQAmBI4RhCgmHQ12fWPn/fHU9d874PE1Fe/80WmfYWEr/d5cf5zk3DJ+5z+oWDB0wy2g+oFSQMkKpnQqmfly6Z//Qj9//29LWb7ljhq83fNmh4E5DbTHt7y7xyQU6cNf3oG8cP2a/JaALGWqQMoa6WkU7CeXX18xtv6Lj60ode/X9XZjJtJpejHaCf0K+kAlRX0zTAOIquPktWNJReaUBRBFVDIYAVAjL5Yl4IziMe/zhzp+SwdiqUzqiadiI77n9/9eOh55z3Waez7DLI8VppARKfrA3mEVrgtdfKKPRbceob2H3qvue6ftB8KNh0w6ta7RgnDTGggkHTT31f0wGnfNjUDDsqXTvEoq8zpX3dD3e+/vw1Kx+47A8gKm3PJuSgmbq+ad/3TW/+8Jnp1LCja5LDaqnUT1osPLJ25fM3Pfdk7rcAuvxm3e3CAUYNzU2zjtr3gk+NGrRr88DakWPTjqOF4rq+zt51N1wz7/u/KOO1FzSrTDtAH2GQyQOk+0w6suncub9YNrxmfGMRed1rtxqqSXqcX1C1DvRYxApl1VQqSas3ryn95C+/mfybjtwKv/G82vz837zWtXrVvdLrrxThqp8Ph22mkUKcPAK5VBa4JYUhJQigieQ0APVQ2+3Z1O4g3fIqQRP0jZteuulGAFP9zzYFYAmALv8Ep+1p6awqlM0q5XJ04xO3PHEzgN19msECeBVArwdqlnLYfqDR3t5ifdB66q4nrjgXwBQAaf91ywAWB8BGO0RkFQBtO7e3w6rbcGJS6+rLRSslIe7pEtQOJljr6ccQN5AEQUTJwGD1hrXJax787UgAK1qpdce5YFY5rHdmdWCOAIBJ1t4onZ1KpI6EAj3v5GDfqcGwwi0BZBUOEdgKaOgowYTjEzvgaaI5IkE2y8QGIHoFwIsgeobYdGUybYb+fYeGN37dHAlUidhYIn4GwFNE9Cyx6fXM9YTeCd97L8JS0qwyEy8m4AUCXmTixW0ZNYDSDmIrE64Z64YSAIweOHNaLQ9m64pImdDdKR7UBuO+fOO+qIKtknAI+VLplby74lVVpZ3RWmanAyygFQCw6ZY2W16zgtRJACLRPEKNWnGYCMW8r4EhJtiS69QNrq0ZNu1EAMCO6Kudy4mKJah6UiVVVrHv/MYlUhVLqsIAPPfP6HXfwY1FSjkSUWEFWJFlUeGWdrI74nCQ1jlzBABPGrrb4LSTgkCIidHb5+nHvGA5NojCV7iTZYECXb2dLwPY5J+uVcD6r1+5HMCM/MZFq1ByX7ApArxxAGAlGMCfPuh10BeKGlBZKFsXbl0dMGWP8QAIn27dUU8Y/7ocjYB9d183vL2bx8d/zVzw2jviInOZIwC0NtV4FJhArGQYKJYE5TJAwbQmRNIasQq1oFIR+urS1xYDILRXx3ztLMsXOWJVftHCvCa89hwOh5Z4hLsIULKCQlFgQ9W4cpkBO2joMQAYZzk79Xy46tq2lUWWRC2GNs3ec8SAicNdtyQKJWKvH7JkBWx8mzLyPFXV7wk17KCzt4tWd625D4C2t++805p2OsC61PXUznbDxnsSZcAhUvYrhAhaSQBYAVzPVQ3EBIfBRqyaybtPS447dheIxc48H666thWxPDpiv8lz9hpcM7KpXC4BYCIorDDK5SAOi8JVX0yqyWSC1vds6L7rsbtXAMCCHcPttgpY70pW2OKpnXtfeOE+3dxjk8YhtlF3vK89BHmDSrzGXSYkHYOULdvkyLHp5EEnnOSdhHOqY+qra6tWaysUAI8bMPXUWqdBXXUDbTKsBYoF3/dK4o7dBCXVRBr86obF3Uu6H3nWMGNnJdx3SsBCe7uACBvu+vXDfStWbDJJsIqVoCM+MPRjeK05hqKDxLZMCcMwoyefAsBB6xypbsXq2homgpkVSE0YP3DaIaqWyMRasS1QLnsWQF4DO8KhFGxI1AE68713AXBdaw124lFfO2OEoFkRBtBTWrXqoXICcBWiXnkGrIABYNQjQYk0nP6sSox8WXXIhH2dAbvOxlRKYJ99EtUNWV3/arVl2lkVOH6PCw8eP2jGYFcKYoxhZvZMB4k9PW9gAisEtQQRBcNQd76Ix1987nEAtnVO605NQ+yUKc1Cr8piOx978M7evIuySRDE47ECB0sOWrsCx0cFBEy2WLLO6EmOc2Amg8Uo4StPVKOs6vpXizJtGQHUzBx10KcbUgNgA0moZ+AHNhxypeFVFYAV0VTCMYtXvdp/0+M3/A0AWjta7c58MHdKwGpvaVUQYU3br+/ML3mlN5k2xoioIc9SJvB2UgDWqxB6vcRQqLgMk0DNrGOPBjAQZ5lqtbC63nRlkSUm1pkjjzpw0tC9ZhXyeYGFCVh1YoAdwCQIZDzQ8qytFQy2CUO6av2aeZs3L1ipbWoIVJ38vPOtnGRFGMUVi4sLn78vkQKMH5SHlzd4XfKhfTIC73DDVChIYtKe0xqOvvhUqALZeaa6NavrjVZrthUKxaHTz7pgRMPERN4tK5RjQ068i6Nx/N3I3omm/vCQjX15mvdMx60AZGeWM+zkgAXkWjy3zb5Hn/pNsbNPKeGQimdD64p3s+R91RC0FMyAIy6Zulo4ex7zFaimsXC9Vrdmdb1BdMVohY4bcsg+M0Ycekq5WFJDxBzbdcGEIYfJ346hA67W1DjmxWULO39711V3EhFa2lt2+vNs5y3Lt7cImLH6lu/8o7B40VKtd0hERQC4QnDhTWFR/zwK7H+ZCMY47BTyNrnbvtNqTvzGR9DeYpHNOtUtWl3xNTMzk4hIT9zjvK+MHzQ17UpR2DAFJ5OqZ48MAhwHkZ4BgDHGJhKERSteuQ1Yu0Su2wFmYVYB6z1d2nzJPQ6A/q7nF/6u7E1wUBEJ2yOSSa+n0PiTaAyxr0QGyLqUSqeldtZxXwMwAJdf4e7kx7O6YiuTaTNnXn+m3WvMqc37jj/sVGuLYhwyZCJX26CoQ1A4JpAyeIMonATz8nXr9e7H5/8BAKrpYBWw0IH5AiIsv/obN3a/8GK/TTvGimhwYNIOebwVcdhjGHgeKJi5u0/TU/ceX3fK978OsU79iEMGA83VSKu6qC2TgarWHLv7Od8e0TguUZKSBmS6d/MgS8RzBnEM+RZrBBLY2qThp159csHtL1x1n6pSS3tLtRq900cEuZxkREx580sLNt1/14PlGgOr5E1aEsBxfG/yiuGqXr+XBaHkCrtuWWv2PfbCVOPEuSbfU8Y+vdWK4U6+2jJtTC1kT9r9q+fNmjD3wL58n3i+P15EpbGisijBSXjj5KwlqCiMGvQUSrj7qXv+AKDY7vn3V3lSVMvxwJgDa3DQ2FLtU+uOmvq9399aM2IC2XyBlQyVy4qVKy0Y6pOinlcWlCAiUFFY1wrXN3Fh/p8e6/q/Dx0CVRc70Dip6nq3V5aZr5DhtXtN/8oJv3tk0pDd6wtuL4GYEbR+gaBQsAJlFxg0GJg63oF1vc7CQQNr8MCrTy497fIP7Kn6Ui9Vz6dqhBWuFY/k9znySO5/teO+jX9ve6CYhimKqojCcYCalMdhhddF8k42okAzk2C3v98mZ2f2bzrpxxeDSKsyh503AFBtVRHLZ8/+4q+nDNu9qb/UCyLDfgboiUMpHI0KhaKmxnMXtQIwEtLVX+QbH7jxl8Cinvlz5psqWFUBq2I9ee65bla1sP7//ew7xZde6DS1KWJrNc2EhrTfT+gTpeE0k4DTIoURy4ZYks2nX5o6+LNzkJvrYp9zqy07O1ts1TzPEJFm9rr4e7MnnnJIf1+/ZSITOEMSESiSLXjtXqyorWEIGJZE6hoc5/4XH3jx/8375pWqSnM75trqka0C1hbXRdL58+dzsbjizv75d/wq5RCljZEEEerT7EVYCkC85tT4Mgw4jqFEKY/k6DFSf8wn/lJbO30ffOUqAbLV47uTrEymzeQ65rpHTjv3iCNnfPxCW2RxRRjqm7RrcInzzh8mgoCQSgLpBMEtKpKOo5vy3fYfT93xv0TUh9ad11n0PxWwGMgyMm0G2XkO5s1zoGrCW5sabyaXBi7Hb5uT65g716qqvn71j77fveClFYmmJBtrpTYJOEQVth/BODAiAjPDEGBMgtNdvTpwym4j6s/92VVoIQJfUQWtnQSsrm8/0w6tnXnM0TPOvWlg7URTsAUiZvLauXwXUfUlDX7foAJoqDdIMMMtqa1POObep+558NoHv3+LiGzPaT8Ez7qaVJW0TY2qsrap0TY1bW1qNKuc9c7VHWY69n8KYBGyyqpKYPZsb9tbLHJzXcyd64LIhrcWsiDyDGGYNbBUeJsHXFsBAlZt3HD7zd933TIxSAgKxyGI+MpRJWigxfKtaDyGCxBiY7sLbu2sI/cZ8pG26yC2HuYbAsxIVrf1fylYIWOuv/4sq9Ap5zX/6LdTh+5TXyx0q+MkCLFZg74ZSDjwRAkgwxjU5AAQrW1I0ML1rxZ/ftsPL1NVaWlp+XdBg7PZLKsqGzbe6UmkRKTUQpaIhFrIUgvZlhaylCPJISdMJIaNxgBsBwOHHYYAyDJaWyPg8dbMJjN4qJmx24nJ/Y9YXXPMcUtt17oBAoYZOnqjvWfeqNLTjwwoL3jhls2bn+8EsNxP8YBL73WA+YLcts3C2+fcqxJPXn2e2f37828fPLd5Tnl90Xb3wqzbLGCDMCUMGikYHmipeoNYxQKWyIXjOMWbvn3n5r9fegaueqKA8/a1qCqV/+siqxuuP8uKSsO3Trn/5ulDD5nbU+yxxjEG8EZ2BSJR9psGg1GCSgSTVOwyyUFCYVN1CfOru3/1vW+3/c+XVZWJ3nZ0RZpVMpcbEQmfYgSAur3GH3fm9PGT0gdPP3hVb2/nGDVETfUD16zrWl+8+6m7pyxevuSOtX3PrQSwEkCvR3kYvO/095n29vZ326d/hwUs9iS+3gdUB8ysnXPGCXUHHrq/jBh7eGLC9DQ1Da7RpsHgpEHowCEAygrb3w13/fp8acmibnl9wSP2kfvu7nzstvvLwIsASsjOc5BrBdCxdRNcslnG5ZdL7eRT9pyc/c6dyXFTh9iNBVq3SUkEfiwVARb5JDwpeVdRAaxr4bJxHWandOt35m26o/U0sOnC6e8zaG+vkqj/JWDlTwWa8K3THrpql5EHHd3b320NOSaYOs8UUexeIkBQUhgmlAUYPIQweqTIgLoauuPp+17++M+a91XVvrcpYyDNKvFlLOpd8MfuNuKQ5tlTDzlh5oRZu08YPXHcyKEjGgY1DUBtbQ2SjgH58VOxVEJvvhubujeVlq593V22fukzT7385F1/uf+PtwH5xwPguviSizmXy8nOClje8E9mgSpGjjxwlvOpT34qucfupyUn7TKEGxthBSgXAbcMS66rbBWwHjh4k7yV1BioYUPGm5xrN21GaenLq+Sp+57uv/eWn3e//MADAPLIziPk5m4laCkjR1I/+wNfH/u1n38jkWh0u9YUnHyJYVjDKeLk2ykrYgp4P45yrYDYcZ1kwsnf+7t7NrSfewyILM64zmAHm5dXXdt43jbPM7mOue6IphmZcw7+0Q/3GXv0mL5SrziOYYWCfN8Phk8jwB/aS96QbjBBAIwfAx02MIWX171Crddc3PzI4vb7RIW21UImm83y5ZdfHkRUYz526Bc/s9/0gz+w26hZY0bXj0PSAawCLpVFSdQkVJkVCiVjSJlAjmPgOMakkwaGga58P154/bnSs8ue+dsf/vGHm59b/sgNAPre64nT7xVgMYwRWAsHOGjIhd/+Ss1JJx6DXWemuQyYPitwrefOD4aqd8kR68sKAgtZb8gkyKqqCARGlA1LyiFxAH39ZVt+ZP7d3Vf/+Kelnhf/DjaAXMzYipHpYzKfr1nR/iMe9dHvtA/+yJePy68q2J4+MswKhvoA5X2NACs25t43BDTGcbku7RQWPXlL93eO/VIPNryMNjVooR0ixK6ubTtvDTtixcXcqR86/oiZn7ppyuDZiXyxyzoJx3DQ1xz85xdmEAgZGGBWWCXU1gNTxhlX2Zpf/P1XX/357Z/77ttIBUmzSj45P+H8Iy/7yHH7nfSx6RN3G5+Ag0KvFbdUVlVLRCBjiJgBMt77MOz5cZHx6WJSVVUwoA47qEmmOVlDeG3za7j76XkPfveaKy9d2fXUQ6paAkHfC2+udx+wslnGFZcLrCTHHfPxzyY//vGvubMPHqglgPuLlqyyIfamqiuDRH05ASCqnjG/ajRk0k/HvEl83sgbca0KSJCqMaYGKLz4AooP3nv5xqs++00QCjijbSuinGZnTGZWYkX7jyZN+N4D19XvffCuna/2qZAxhmLNFQFAafDVf0/izTpkEbDCyoB6U3rhkU09d1xz8uYFP38Q7ABSJuzkhmz/MVFVVukyL90yR02/8Ecn7/OFjw1MjKnP53utk3AM+ameZ3nsA5fGNpj/MxDgqmDMMLaTRqfML+/9031XXP+hZj9y2ZZUkJmNiFjsPab5rHOO/VLr4XsfvUttMoG+/rJ1rUusnpMN+ZIKv1bkO516dLEHXn6Po1+9ZFbfwFKUmaSuIUW1jQ4/v3RR4Te3/r8bf37TNy4CsDabVc5tv0rmDghY2SzjspxAMXD6N3776/Spp51eHDAQ5e6SCxcGzBSkWQSPE6JATiAEVYGKb8sB9QyrELXLRKmaBxZkRUlUTF2alMGbH7773k2fP+eSApY9hLY2g5aWfx3ljDmwBisfy9cMm3TSpIuvu8WOnYW+lT1qkgn/zPJL1uJ953105IGsxmYeCoFVXNTXOcXlS0v5eVf/eN2D38wB1N/cfK/T0THXrWLCjgtW6kVKCmCv85t/f8X+4884gakGxVKfOo4hQEO+yhjyyfaogoxQZOyp2ZOpst17lzrz+MonH2753mGnz8vetn5ubs42TKvOsuErxIod/qGDv3LRWQee8+WpY6eit69klS0nEv57CkEqiPR8KQ4A9gvrIMAYL1VlDkALYAOw4/0tCoWQSGNDLcMAN8y7ZdEXf/b1z6/pf/H2f7NA8DZSs3drNWcd5HIycMCkQyb8/rZHce7HT+9PNoi7Ka9E5JBDxKShNbH4Y0MCc0ZveKAfwvphN3PkvR62zoQVRoVXwzVGuvKsPWW3/uAjD2/83h/vqZl4eAYtLbap6ZAB//I9r3ikgFm/TOTXLr6186Y/faTedvfXNjVYLpcVqlBXw3J1fO5xYPinEFgVWAhKQk5xc5fqgNHJ1Mn/++VRLb+7t7Z2wAkdHXOTyGi1lWcHBStfCkAHT/74Fy877eHbDp36kRNUHLds+zWRdIiZ/AjFB6oQ5WI2MhScswwRKxPG1JlHlj5qz//lx75C1L96PubL1oJVBhnDfLlYsYP+58gr/vHpI1u/PKpmqt24rl+sVQM1ZMvqD7HwikBBqSjYJ/AnTHsKIL/CHVcEsSfdUd8aHACMMvd09Wu+s+iefcipu1yfu+aPR+7TcjwRiQZP9C6sd2ejZJXxx7l2wMTZh47+xZV/dY49YqysK1q2MGSMx0PGdZ8aBX/Rp6gxW1nvKhGohz1VHIXjuUijKAdQCBOsa9ntKbs8dWoyNX3v03jFpoVdr9/+FNraDNrb3/xkWf03yaryrR859hlHG0169/2PKNq0q+WiEfKa6IOUFD63FaSpHM6X8+QQCiYtFdUVktTY/cfWTT78VHITgwv3nPgIslpER64KETtUGpil+fPnD/jowb9sP3mviz49rG5qQ3+x1wXIMd6YZq/dhkJPvlgLjv+9D2aGGaVyWYcPq+H+5DL3uzde8YlFq+79m2aV5ubmbm2EQi/xIhGRmm+ffeMtZx967oGlfnHLUnKchBPqvkJ0UoRpaPTeItcRkJfJEEcFgRBcg+ZHjVqJSJnECnd3FuzEoRPq95w884xFK5et+dj5H3iqLaOmfeE7Py/xnUfG5mYH99/vNtaPO3r01b+90Tnq8DpdlbdqEsYH9hCMVMlHfoRTmFU1VC9RmCL6rQ7ic0hB64NQxCMJABXvCuNbH4sAUhIxA+uo/OrL+XU/bj0r/9xfbsWUY1NYfEfxXx6n7DyD3NyaYcd87frasy87ur/PuqwlxzAjmBwdBMakAElEyEMCAPUjMgtYV20yWWvYFrHhnh9/dfP8i78TVCerWLHjpIEn7X7xT1r2u/zCcrnkulQ0DjvknZg+J4XQht0PTiLwYt+KiIkgriupRAoDx3cW73j++sw3rz3vtm1Mp4L3VP+zD9/zlyNnHX5CT2/JFVGHNIjk/CZ9f+pTkJqyn+IRicdR+VbfFb9ngIKUkAjs+3aBAyCL1PqwinLRSlN9Pb+84eX8//62teX25677W1umzbS8wxXwdzrCIlqxQiAyY9B3f3V7zWknNerqvJWkYzSIlPxPN7o8eMmdahRfUYBsGjwq1kKqXjWGY9iuAeIRhQMpCeSR4MYhky9octTIpB009ozCY489qGsfXowzzjBYuPDNrxAdf1CwKfYtvu9mp7f30MRucyaUJeGydZmIQ74ijPB8D3gogf1qEQW8FgiOATvlvDj1TSqJmn16Hr/jT7jvC92oWv7sEIB12WWXaxKDdjlt1v9+f0BifE2x1MfMDiMWNSNIt7wuZu88Dc5ZvyuChFF2rSZQo07NJvO3Z3924fdv+uJftE0N7bZNYEVE5Fx4xI//cdp+7z+yp6fogskh4tDNyKtKcrSTaItoK4hRfA0O+XwKkUTuIxrtQwr54XAuZ8i4GMdQvlyQccNHJ/fbfe/DXl+2Yd6GKSs2nHjiiejo6HjHIq13ksMiqEKtHTSi9Vc/S3zozAHF9XmRRMJAo3FGisABIV5t8z90IT+iitJB+BXCIFqBT7irUgRsQbYezvz2ox72yEYYh8udeVtzwP6JQV/40Xcg0oi2NnkLsFCI5X2ueqKw4e4fnd73py8+DFjHNTWuda1GaWoAuX6LYyjD8PVaPtnJIJBx2Bb6OT1o9KAhs04c6U3gydLbOtY79423+LrlbdsusiBVFTNz7LG7DK2fOLxY7mFRZlsSWFchrt9q47fcBEClCH7uOYmKJRTLriYojRJvMr9+MPejn96e+0Nbmxpq2fpIui3TxkQk58794acyB37y0J5ut+yW4dgyYF2FteE2iCGTxz8FhSER9TktjbUJBQY3FKMtfP5Vvcd4RS5vuGs0kpqgDCTSDnf2d8v08ZPHfOykD9xz9dW/2+WKyy+Xd/Ki+84BVpsyiHTkBz/32YEf+8jhqc2udWB8uVpA/3lIQjHqKgyOwkk1FPXsiX/VUlTwWXGaK/4zBoOJQcThqavhRYdMqjPvDjnk8H2Hf+K3PwCRok3f6njIk+ftq8jqpq77f3VS4S+X3OnYgmNSaYLrTxMIBKT+SRL8PeHPgxvU4+hFvO1BMggA0Nq6jVenjCE2Cjbqx/QKMkpkFFvc6L/qxuGNiYWJlcn4X+O/M9rcvI0DQrzTx9Yka3dPO7UKJoldf6LPNMj/oZXcq1clgpWy1KVqkKcN8ucnf9B66zM/u9iwybdsgwYvm1U+8/oz7YHj3nfw4buf9NOEU2tL4iYsPEtlteQNqJPAAyA63RB/rxppGCsiJiFfMhRRMFveB9aPrHw+K/5nOo7Dmzr73NOajx/0y8/8rtWKNGhb2zvWQP3O+I9ns4yzjK0bPevwxnM++RWTSFvtL7IaJ2xtsRLTMkVBlQdmoabJOyo+te1dCzSKqiARB8aIjiIjVhmJH3z4Ybx62hPHVSdZsu6AY0//SM8rL9zQfybfsRU8koscMdhs7H3gh6cmapq+0nDyZ79sGpvS3NVrlckEURUhShtCoWlUfvLaJsFwFcRKhbd1nHM5qwIGMBBAKXZI7RYXJaOVnfguvPvwFls1HqXEN9aWm0xjz0Wx55HY7zX2fEESFY+KzBa/Y/xzv+WWFivBew7O3YR6z6Ox1xUAeQAlBdyOjpy7DQptFREiInVt3rEqxNYLnwOCHaCQyGYKFO3R2yUCBGoH1NWZ1d2vufe/dutZf3vumzcYNrCecfvWXpSotRWay2n9CbM+8tupQ6doZ2+BjHGgJF4FT7zijvrhvQRqehAo8AOgNwAt6w0JDkaOhXvMq2CF56iEukIK7oRgi8KPwgBy+jpd99RDTjr9zsfPuY/PbPmpZpUpt/01hu8EYBFaW4FcLl134ee/xHvOSPHqguWEQ+LzO+pLENTPkSNpAIXpH8VCriAiiUcpEKkImYLKKqEyool4rYDb1ygqMwy3v8ipwU08eO6prf0dP7pLWyGUe0sfIvEub1rcTNTK3Z2La47+2O+SU3Z3sLHfQsTE9zLFPeE1zg8AxOwVB9JD1vkR1tad0M3zHOTmuk3DT5gzdN+zzldxDzGJBqsikHIJBLJea4Aw1AIiTKocIDcrWyL1wjzvZ0Kq4ondSD3CGEoEItGEgTEBg0EKhagQhFW9OUKkQgCpQTA9mz33cvWo4MAVKhTVCUhhDVTIEAdDbMkwRBU+KyhE6gmJWEFERg07QiQMIaNKcKXssCgrVIkJjjGaMEmtrWks1CXrSn3FDauXbXzh50R07baKM5V5nWtdJHwojSpuGpLpwcfsHYQwA7WNtSnz7MpHO6998gcXLljZfkO2eZ6T69jK1rAgds4oE5E9fb//ff8BU47apafLdcHkKAREFGYkAk+fyD7tQQrfQ8AThAYRESFIV4OigIbbRAKsZwKHSV2g0FfEPVA0pGG8LIaUkLdFHtzYKJ846cMX/fXRP9+IVqxE7g0vQDsYYGWzBGJp2P3wuTVzmo+2XRAyhr1NEtVZAwCSQLPkHzWNketBWBv0ZlGckyI/DEaM9xJfjaVBJEaVaSL51bxYFVJg2G4uSWLXvQ5oPOKis4jwZ0w5NvkWVUM/XyWgTc3GFvpr6pXn1jR98OJv1+1y6D62VBYulQKTUpDGkJQCAPNxiQ20XACtfsV7p1uhbNhnn6sST3bMLQ8bf9Zpgw+76NrasfsljXVBYiIyOKigqvoSCw05NlZCkJQEEpAg5WY/WmVlH2Q0vD+LgiWIHL2DyOJXw9QL4SgM5cgPo7wkwntOjaQnEgF4oKXzqm3kV7IipXg87AvIZUSqFbAHajAMGIfgGG/8OwEwhEnTRnQfzNQ0l4jOa8uoaWl/i5TM/9waakc/WLQFTTgNLCKh6DK45In/dyl862NWOMaxyZQxD752z5M/ued/PlQqvfKiH21sE1gBoLYZUAIaDpl63OfSVKN9+QI7SQM4/rEEQUjCzzXg0KLCE0JtmELhBYoakemgMLXhGIUsxjtfAqDiLSiXoEJKYKgNojGHN28q2tlTDxz/kbmf/goRXRC7QOzAgOVFV6naD37kwprxY5nXF6xNJjmomkVMqDd/za+lQVEZ1GtEEoTgFucOtCLFolhOGaF/IGcIPaskalzWoM0HCtdapfpGDDjomAu776Gb8U3No4W2JtJRtJCFan+R6O51P73nhFGnXXkRH3jGF9TUiWPLTAFK+oWBgLQMiwcg1f5O6l1+7xAAL7+1SkSdjg4qj9r1/CMGHHzBn1JNUxLlzZtdITXszfvxr/Ea0St+fijqRSzeSe3lC4FeTBU++Pg33y4n0Mix9d6v13IUVZxMTPtm4cs5UGm9g9i/A0ALmtfD/JNIWZU8tQ9FzcJeQBPjk8V/ZaEgyvHkTl5MxmH0wOp1R0BrnAY5apcLznUMyi3t9Jlsszq5jjcHkFZ4Ue6La+5PHDrhLGpKjIAV8SIT9kXN7OevwSxB73XVpErmr8/89u9/evCC84iwork561COtrmToS3TxpQje9KeX3r/tOF7zegrlCwMG/E/TE/V5zuXaiQNDWQNwVYQ8b23/HYcjQm0vK1CfpTmXfDBChaCkB+xEcK0MPTxikVaoVxLFG7Zcq2p01NmH3/mH+Z9/4fGmCVvkubvIKR7Nstgkrrhsw6u2Xf/I1GACJEJgEP9gyuq/sWfKjZViDdB6KpRhTDkoOI9e7pF2iixr0E1JAi+fCFpQIYjSCu9K5VxC0Urk/bcr26PzAloIYtM29YfGyIFmh0YZ+2qv55/SeHRG5c5qVpWq/7IsBhji6i3SwBRY0iovKDgrl/iIdqbi++as/Ocjg5yx+5/yaED5l54c3rolFoqdqtxjANm8hhnZjAzOYbJMcz+VzLMYEMgQ2oMeTvcuy+YmYiYDDOx8X5OxGQMg03IYAeLjHdjIu9xxEzMTAjuY9gbvMBMxMyBHpy8Fwt+xmyI2SHDDhky7P3bMPuNIp6GnMNxH0zEBO/FDSXIkENMDhmTIMOGDBkiMkTqkIr3nonZFG1PgtkpHzHzwk+fuNdPf5TrIFezb270mEMORITVG15we/Kb18BNwLXqdWFJUCwhz/vM09TBLYmkNE2LV7zw6p8evOATTGaFasZ0dOTeTtsVZdoyAsDZZ/yh59SZOghsGJIqPN81Ed8QQDQcR+dfp733J9778+5L/teguh4BmkhAwAeP06iP34/Ww/sJwopj8PrWej9nMPX0FWW/yfsPOXP2p88WEUez25fG4u0eXSlQe+JxJyenTHUk7yqMieQIAYj4f3RQ6q+gaGMygAqgQqyvUGPVwS2rNhUA6BPzEpR2EX1Y4sciPmNrSi6cQcMpvf/xp/uXuG28KnRYuGXCoClpW+jNB4SshoKYQJEfpTlGSR0m2L6etQBWvwHBHJeIcEdurjt6ry8dXzPrw7cnmsbXUW+3kHGY/LMrvApKkA57r+SlbBSmacFZTUFqGEvrAq2YpyHyf28RFjngl7i99JFAanytmc9U+b1UHDyH/xrkPwbxn4dSlEijRhJUvVD5uNhjwwgaFHIo3mcdyWCCggsRwI5BwfYn1DXuodM++bnj9vjZrygXyF4yb6RFVC/G61zcmV+7lsBgJQkGoJJ/0kWVOO+5mIHOwvq+5ubm9VZcAtrfVmSRRZaISMcObt5r3OAZexVKrirBABJVmQPg2EI2E16LVWFdDQtT3ilCFRfxLW/Rc1EIZtZqCEwSBgTe95AI1LxkgVB2XTSm6ujQPQ5tAdDkXO5sV5nD9gQsguMIgKGJGdNPIscArkuhxiM4CH5lQXyyvaLfKSDPlSqBR6PUItBahdFUvGwbqNqDnj6Rih6/yFkBoVKe/M2WUFDKKmomzToQ2KUBbHSbD7RxFJsWqzFJMgQYIhhvS/kcTGA74gMIAQYKu/b1Tf/itXyRGcnogy79UP1BF7RTemxdubNPXBi2In4hMr7xEbpXBEUN1shHjH2ylLdI3dgX4ZKK75IhPrAh4rzihQ2JgCasi4uGtj+VXJn3AbFEqSqB4jqPWJoci7Jj2qCgQuU19XLIc4ZRRfgRRxxXEF2LGPQX8k65z5QPGfup887e77oriaiJ6Ab7L6yAZU3PorXsWDgJkOOw1zfoV+ACoj3QFHICUFano6Oj6d/ZSDMzrQSAjpp22knD6yckS661UeQUgUMgS4gnDMF+Uj93E1WI1Yqfq0QzCqLICjE9lh+5+ZGTtUGg4UeVLkFcT2cWHPTQA4DJFIrQmeNm7DqwYfIuVixl35628B0GrEyGYS1SqaY9U1N3Haf93j4JfIHVD1NDkIn9WxVQ+88AFBbSNYqMArmDVqSCftEw/EBjWhL/gyHdooIYH7XkpYXM5bLWjBw/duARLbtBxfub3s4Sm0aMVKY30GGJKpQddQsFuPkNtwJQzGnd4vWy7OmrSMYd9q0f1e33yd9rcmAtF3uEjGEJ016tBJN4T6YEIBSR4OzHWvGOgbi/VwTwsVsFEKKiL4FjBY7A4geC0Mictix8IAK5qHqLUEcUykCAsC8PiMZkIfb/+DkT/ZujC6D4G9Z6IshiuT9RLpbsXqMy5330kJtvVE1MyiEn++xzVXwsm55+hmsA5C3Q7nIBiaQjEbMaXVSDsil8DXx9amA3gP7Wf2Oe4FnXOxaADm+acKJDBq51WbbcL1qpXQwByEZRUUSHRJFVpLeicD+KUgVwBbdAkBruI+uJZiERqImQ/3gfUAzB1aJMHjkl0bznkScD0Fa07oApoacUR8NBh++fnDjFSMmqEMP66GsroquInwrsWbRCxhADr5gDgoZgpGHgEZ2k6lUsglRSpGIzRwCoUR9i7OpOIBhrbX1Tk9aPmXQ8ADTPOP/tXBmSJlVXA/+KFHS8SyAkFYW1CuuqWk1wYeOqQmHBXR7Z3hEjJzNtBnSZQGxi17Pv/OmgQy74XDLRgKQtqgnSwJCI0IqoM4qCKNKzxcCTYyIoDh8f9WbGeyGjx/hwRx7gsUaVPPiRHCRqSwr5OoqiSo6rdyGVnQuIhMLxroZ/yvVj+nXPZMifwG3Fm8YdgJT/vKLiHxfvsewQNFEyRbfH3XvMyXMvOHreXROHfGjak0+eV842qxMcunXtc2gMDqx5YcU/Vm7uX11gNca6op6y3FOXh+mQX50WAWoTTQIg3zpnztskmpWsupRM7jp15IBpY1xPsUAeQEQiz+BC651bEZ8UesZJtNcQ54Q9RUkY1IrEg2MPxGzIjQHW9W4BOEXgGI/GyFPO+BcF11oMqK/B/lP3mQGgbjvi1fYDrKz/QScmTdmHm5pIQ3+YKNcOeaugJSCQFyACofCEjnERcQ1VxX3wz6kjgiqYUsV5Xhm9BSJUv78wZrpnDCg5cZcJADCsdc62XCGD+3bxsKkb1VYOrAhuQcprXVXAsLvuxWU96zqe8dR+OQVAzdl5Dtpb7PDG/SfscvZdj6QnHX6BFKw1ZSGG8T3DEPJPJBFoBfMTOdaqRAHvFHJKwZxFCjki8sN7st6/SQlk4bdkkGdNLajkoYT93/mcVtjCwSBlkLD/Wgz2v2f/8SocKbRjHJWGVUcfVpX914v+TfCeP3ichjwXYi0oCC8SEiM6iRRsGHDg9PR32amDD5r0gYNyDx86+eufiMj4LK/EStM4dKxZufnBx5Z3Ll6tpSSViuqlQzaIMig6t0SMK9BCqX8fxxnT7LmAbvvUmUymhQmks6cfP6ipdvAw61plGIr2UZRFiMYv5FEaHUZTcYI8NL/0gUgpnsVX8FTxKEusT9bb4N9R4UxjVXz1zwMVgrhgtcCg2gGHAphujNluPNb2AizKBUr9PWdtLPugTrEqYJBGRDxWLB+XiByPp4HhzyseE4T3segsdHqgqL8weL6w7zD6dLx/UyzyCE54MVYA7c8fCaCp3Ri7DQeaoIoE6qZzw4BaSEwd67c0sB+hQAmiLFZES+sX3w9kyrjOGiBLYKMeuf714xo/8LsOM/nIWcWubldda0SZNLSwoUo+KQRrf+PaKH2DpwdVVbUqasW64oUkXlhC4ntIWLEqYsWKVStWRS1ELESsiFi1ImqtiLWiIiLifVUVUbEiakXVew4Vsd5TuWLFFf8pJFzek4n3BN49y95Le/eCWlW16rnkW5BYhbUirrjWu4n32oh5flRUhX0VdjipWzUmsxIAMKa7r0eG1U4cdOJ+F/36nKNuuJBylMqglTBoSqoxNcYCmc5lnS91FF0LLRsrNmTlw5gwGEHvqovBTaNTUwYekPIv4tvOrCADABicHrRvfXqgWrGRapOii0UFqAD/RKZLeAGgMAUMsvUwCpVoz8QBKvDSktBTKwAt9c+r4ByOSH/xW82CiLNUAKaPnNoLYKm1drsNhN1eOqyAcJ+QX7suwwJw2RsgovEoJ0xTNBSLaiTXjXgRqWzZCXmVgNwFQovkuLwhbIeJN0FLFOmE4KFRpSdO8KsCUgYoWTsAwGCodAHZfyk1qODw2tttauiuu5BTO1HckpCAiSLrnJC7UQWzY6R7I+VffeIOoN3i7qsToFwZAmf8SX/+TP2Uw36E2uGwnRutgXHUB57A1dSXY2zBW8UFtwpr1TogMiYNx3GY4RgSL1AJBJ9hw7avMQry93hhgOPVTQ0I/LhINO70ilCISIjrooJJMr5QNP7ZBu9avUJFYMzIxrc+iQGzWM840TumAmtLqnC9eIOFPWMUv0fVP0/ili9hqhk4cDJxd6lTa1ONuvfIU3/yicNuPvk399GZ2ITNBzecmXwEP5JnV/Tcsvegkz86MDnaCNtIlxTzvWLDEHZlQO0QM3bgzANeWn/Dnci2Arlt8zjLzMgoAJTLxeMdTVDZFkFO0MmhIYsWyvn84ykcpfuBUjlsq6HK2YgI7JBjNjm+I3lAxfmfo4aMAgV+Wb7GL3D4BUevEajkVIFyGarWDG9MjD+SiK7NIss5/PsTd7afcNS7fKW1tq5e/AqV/pO2KiYl9itS8EPViAjXSGDppzMa9g5qKAj1yO2YG4Kt7D/0NovGNkWsjB+S8h7fEl6kxQMspOoFGK7QtdvG4REhMfnAIVI3XN1CkRzmSOAegxWCaDJVS6VVy9eUF9/5gK8ILg+qP2DXgcdc+sv09COatayWuruIKWHiY6dD10iNm7Fx2BHgVXWssjiaTDQaowVocQPypc5uA3652LOObD7vWFtIkAKGWZkSriEuQy3gaiCwJV+cELwmkSqRgrwOA8uhcSL5SRqxkPptNgqougbWMoMUpORZKQoMkYJUyYZNa74wVIhUiY1jvWkurGQoumAxQVxryuViXUN6uNtQMwxiyzMak2MpxQ0o2yJcWxDHYQbHQUrjuyomUlY/BTWUL+bJLSXcWeNOPuLLxz/xyKNL/vQ/f3jxY3cbTmDFpjseWpV/4bXhjZMmld1eITJM8QjLB0YR0XQqjXEDpu0GEFq3rnGhYrUv9J5waP3oXl//pH5Pmyfi9NuCKNQge/2DHG6rKBqToIgCAhlUdHMGbcz+VdW7MARaSX8beSr5mIWmeG4nlhAWcmAi8SjIU8+BmERh005tYmB94/TuzcDCzEJC+46ndHdQ01ggoF4UW4zo1koNVVwvFI/nEfBXXstIwDUFQBZcFSqQMBZ1hAR0qBuKvWaM54lrveCniAFxCCdtazCqmMdaAK26laed1yrX9O1TkWggKfZYIZhAoxT0MLISmEnIYVPYvPj+fqxfQ0Q85oCvnZma2fLb5Oi9atHTKRAxQo5fW65sYQlbfYLhGzHJhFhXUtzAkG7qXnbzXaXOxTeg3PPMK89dvQ5Yu2SLBhTCf+Zw16RfM2gYXnvI/pOHHzGgPjn4jPGDDj1iWN1u9SXpcQ3BIY7cQKOTjCoujGHXAwhFKTuFgmuHJ/eZ0jxxxG21zrC225//+pcArFna/exde4054TwjRonjbrixASmuNSUFmmqHHgroaL6MV75dpXfS1LuqnkkA2xiABNEiR+p2DeYJ+OPDOGid8o3lg+KV+EG4MkBWfV93f2p50FLuD3tlP31kjvZaXPUecI1WgvfkWy/74bQAIEoglUrp9gWY7buYQJaCsigj6gGM9d+Q6hZK9cqbilakgxoII0N1fDyaiqIusj4sbNGWo6FjaVxtjjBdDADMqvhRVpnyWOe/+61qRiawEUDGmlE37+pXzSjg1QTRwFVAYUwabl8nOhfc8qv6+kOGNhz52Z/SxEPOEjMI5c0brWFjPEM4iQ3YoIoey1Ay4f+9TIBD6jp1A51852ulriW3X7jokc9cVdmI4PX0t7ZCmZ2K9vBLL3X5LTTBb3oMmB0Vccm/H73ZY/zX9K5J/v3f/AXfhDv03nvJ5xjya/sf+NvaJQ8AwJ+mjT5rjwPHfvKaKUMP3a0sBVekbAjGZwm00j/C7z/0euEqUgHTk98sCR2cPGLC5z44dtC0wx94/Zpz7nkx+5PDJn3w7BG1k+pK6PM6rX3iO+rjY+ovWxnZNHPo6KbZB67seuiGDDLUvg2hRWaG92YK5f6UT24TwDCIwCLsHQzaksAhRRKmh7EUXHxA8/zggtYsL95VG+CU39JGHpAFURiChmofKDnEfd/vPXYxDmFcgHISsCWBWsMAMGPGDN2xAMt7t/3StdEpx5jqWMU6DE/VtzOWLZwZ9A1ATHULwWcgIJQt5AqxaE1lC14r9riI64o3SUfRmoJg+7sTwIbUNtRICZrThtHHjnaG7zralIvC7LfwxiZDextVBOmE6X/pvldr60ce0PTxb/6x2DR+tPT0Cud7iNiYivmGiJq+gwiVCRX9kqJWHU7aVLre6Vz99ItLn/r1RzYu+eXjmYwaoB3taAfaZ2gwksmnVeIO4HircU1vRcXErFt0ax6zFVYvb/z7yvcOIEuqrdreAm5pp+deXnntYR854G/fnjj80HOTiToUiz0W5BgSquyqIA0V8qGOzc+x2TBbyWt/P+n0pveNGr773rePbzroR8+uuXnh6F0/dwBKJJ7kjLbwxiKUtCyDa0c5e0088sSVzzx0QybThvb2bS+Q9RQ2p0SidrR4mU2CrgRU8kwIoiKNGp5FELlKiG8/EwiNKwxP/N5R36JDfJ5TwinWkVVNMCEosKuJ6Xr9qq1CGdRfyKOn0NsT+9x2GMAKDt8KTaXvdQUnGbBAyFRwOKE/O4VhKmlcgxWAmYb3+acozI+KOACmYJiqRIQ8aVAFRMXGj78mfMFjJJvwW0gI0L6eLqDYA2ZAtoJw11aAckjtc9qpNUMmO+jrdcHE8QqpqvoFHuJSoRfJRNO4hmNbvylOIxLdnRYCb+RuILZEzEMbgWqfojYUn8QQKVuH6o3akrP61Zv/8OLtp34ewObm5nlOe/u/bLr9T56HGHvvOSXKAYDNIGNmNJ/fk+uYe97h07/73J7jT/720Nqp9b3FTpcUDqnnEaMSG3sVNA2TP+fSRwLDTJQm6ne7ZGByPJ2w2xc+/+qGB/s3929EbaqBrbXRbAHyIn9WhrKwkyDsNrb5gNueqR+aacMGP/jYquMdcFhdxU2bXFUAxm9IDdxOfNfagOz300CNlfw1mjznE/P+/f3wKPB7DyBPwsSSQ5uZEKx8YFfyCjBgr1MrPnQjLhsiLypUYrAaXbmmZ8mffI52u1APvN1OoCuvTADota+94pqiBwdR2hXTx8R1I0FZNNBnhQNT/Y74oIk5FOhFH3tQtq84fQNdV6DsjZd6RaNhq4HQMeZWwKpgYssAuKbhTgDrMtfarVErBydjA4+ZeRIbwKjlf27q9srsVgC3JKBxByVK1ojt7RI2xnjQHveyiDupUlSVCSg316pY2KQzxLg9SzpXPv/T81+8/dSPgmgzMhmzM846bEe7zXXMdbPN85x7X/ryL/726IWHLNv48IO1iQaHNWnLrlVxxdczSUWb1pafcjCfz3EMl7SfivmCTBlycG3C1MB1xReORsNNIj0huFCyOnrgjOkzxjUfTUSJLLZ+DNYCPyUcMXjXX/fbXlXAWKtQK7BxGUG8NzCmZA8p2ZgOK9xTsT7asFUnrojfoiF6S9W71+gdNXxbC88uWimK8ozPkSWBJeuXNAH9xjDr9sKa7ad0//NDBgC5L7+4nPv6xREwWak8oBJ1f8cbaeOaK68XjcKKVxyoQuCyMelCWOHTUMZAMUFO1PeGaGqNxJ7H77Nz/CZoFmj/4qf8DbA12aASiHXgrM/OdoZNnaG9/aLqdZwF3thqo0Y39Y+JzfdDrfW8faOGj1hvH4XtNEEFVZTgiqJUdq1FDRHSpnPZP+YvvetThy1//JJfZrPKUCW0t1vsxCvXMddtbp7nvNJ557O/uu+QIx997Tc/7MmvMUlqoLJrRdQqaWTxExrcBSR9wBqHLV+EsrXc29sLt6xwyz5gxXpiNdToEEqlkgxOjqBDJp19PADTqlsfzS7MtRAA3Pfi9W5n33oiMKyVSH0eE39CI0W/xkBKYxrHoG8wAK9AoV8pKg1U7FopJgVBlP1eRA0ByytOcaVjRMCzMsApVZMAVnetfQ0AW5HtpsPafoA1rL8MQIuvLb3JXbeWk2yYXY0M+eNAETYoUwRaMbmBhmQ4vUFfW2WjbEWPYex+oWg16PqPuQ1QrFEaYYO0woBZ+4skff0eVrW/JWR5tWtomibtdynVDoOUPMdi3dICJ0g9bTijMDrJRf+psdjXc4PVgMl4ym7rzWZNpAYY6X25tP65733j5TuOPXnz5vueb26e5/g8lKK60NEx180iy0RcuPX5879w04LPfnhp97xlqWQtkybhWk9WGmqp/MYhRTSYIfjQVKIij9eW47UBBZseqPTvF1gu5hWj63Z/X11i+GTvqbZO9d6OdquqtHTdQwt6ip2vkDrkllXsFn2XIdsRCkMD8NBYL6FGIBQMlECllUz8Ah6o2nWLCM1qdD8Bwfr8s2dFE/jCUyg0JbAUSqIrN696CMBytIc+hzsQYLW3C1TJrly6srRi+QpNEeCqBMAUd2yIg1I0fSTSRoXuoYGSPRbaauzgBYl69L1WCE7DPsSKiE5i1cdIFW2tKDkpLm9c2ZV/6tbHQADaW+QtxaLMUjv60CPMlANnc7EoxGS2tGiOR3ka4+rEj74CFX4cgCXWZMyqMKS2Nt1ItU6NyS+767G18y9sXvnEJReDTA+wc6aAbxlpISeqQtnmec7rG//+//742LHHPLH8ymvydp3UJgewgq1CNJjeJBpMkInkAIE9d0XDsZL3uVkJ24EoVlliZsqXCnbcgJnpo3a96BwCaZvnwLB1qxUEbOxZ0/XqEwrA2qinOwScEHjizd2RD5b6vX82dGLgyMdLNOwntAHIxabqiMT6Bv1ClPiS0uC8tTE7Gs8Rwou03KJCCsYsW7+a7lt472MA0LqgdbtdRN+BqTkbXnUXvnB/EdAiGfVaB/55ekxcCxW3uQh9KkLhqVY6HgT2JQEQ2sqUMdJebdGHGAIIx6Ie8oWpgApEiVFcv/z+/vUdazLX6VvxV4S2NoUq1xz44S+bwZMVxZLGhYQxeRYqaAzVf56is4XHUdA7ptaVBDtaUzPAFLte2bTu2f/70uI7jjts07qOR9TbOQTs3CngW/GruSjaeun2F7/0wZsXfiHz6qY7nk4mYGprmgikVnyv34ApDPrv4psyfkFRjZ8IVFEN8O5vGQrde9xxH6lPTt31rOuN3dr9Nme+59qxeN3z7d2FLhjjhB7rIdsRS/VUPOCxVkMnXYk1KQNbtu34zguhT1xkUyOxth+7BT8mgeGA7z0WmgQK4FqF6ypKRdGEOrRg2fObFq2Yd7+qUi63/Saab0/AUlALA7DFm//01+KrS6jkGC5ZbxYC2chBAbIFOIU8lN/MGuedpNJrCXEDPo17X6GimUwlGn8UWdjEuusl4s+8cQoG5XyfFl556g8A0P6Lt7giZtoYzNIw7exjaJdjD5O+frWqRuyWnJuG2jHSuD2K1xQcfg0GcQoDlmDdkliBNc5Adgvraf3CP9+y6Poz9l/22Ke/r6olIMu+NKCaAm59tMVMBq+tu+Wvv3/0hAPnv/LDz7++6bENqZp6k0ykyIor1nccUEuhC4FaijmGKFQk7FvQQFjgV8xCayNi6isX7YSBuw88YY/zvyEq1JbZOvK9oyNnVZXueuny+5Z1vbAmnUiximcnIBX8FGBtzNsKWziIBr2EQYZiAyeLAOD8CCtopA6axYO+QdcDQRt3gwgAMshMNNYgrQCxEZcFz6149joAS0Ilxo4ZYXlpYWnZww/ah+58HSkmKluJ5gnGOuo15uceJeQ+SR1rXI6lhUFap3GA05jlTIwDi2xmoscHIbRu4WpKKuKk6ri44qUl6++46DaoEjpy9l9HVxmB6sDU7LO+hcYxQLEExFOLGAnrBVlbCj4D2OKoxUYJJCIkZB1nILMV0/3aLU8vu/fzpy++6wOnFIsLXm1unud4QJWrjrTf9iWiFhlkDBGX7n059+Or7jvmoIcW/d9PNvYu7qtNDGSShJbdsqiPAooYCPlNdRpOF4E/vSby3kLs4uiWrcn3Wdl3zPtOGD9k32PPvJ7tVnJZ6vtpbVzZtehKMp7ZekCO25gTaBjVhdEUo8IXUTX0u5LwFreooZDLCjmpYF5hzP1EYummdQF1fQ7LJbhlwHWBclmQdBxatGqR/ftj195KgG2l1u06hWJ7p4SKfc9zMGPGBnvn9T/XjevBiSQcVU9DYisrdRILS+ON0BSPthSxXkIKOZ848AQ2vhqL1kI3h5BaUG+CVXzkth8CMxl1RKm06JlfAsg3t76F+Vp2ngGRDpqT+5/krkft6fR3uY4TVQZDniM+1cf/KhLxEPHKIKmoIbapdBM7JmUKKx54bf3D2c8v+cdpR25aetONqp7tSZWr2j7yB1WhTKbNEPUsvvWFcz/3m/szRz+85MqOvvIqqnMGMklSxFXrWU8HjXKx2YRhR5kGSAgL9aQHVmFdgVqmvnweA51xiaOmffHbqtqk2daQ1nyLSqcQER5Ycs3VK3sXb6hJpVhFNCrUILRcCooHIckuccsYb88ErqOVVcTYjIUthqmKRlKGgMi3QfQVemaF3m6QMkHKZA2YHn7lwXvW9D/TIaqc2xrjgG1YZrufDaufBOacz6V5v3suMW32MYmZM0bW9JYFYI7bXAQ2thSLvKiCdI+6yVW4wr8NWw6v0H929iSJHDApZlcTms6FZWsrTqqei4sXvrbktx85B9rrLp078V8c5Czj/nNs45CDJtec+L9/StYOS5hSkQlMgf8Ua6X1C+kW/l1h+moh1hUiR5LJRmZY7lv1/JJNL17/zZUdH/hU/4bH54NMHtlLOTd3rgId1fRvO66FC9sVALVl1FzzwgXLFq2//f+t7l74XMKYEXV1gyY0pEcyVFVRFmIQUzC1yu9P1HhPISpdQvwLFBORtWrHD9p1pCtJ94M3zLk32zzP6Vj6h7eKkFWzyp/7+0d7xw3ef9CkoXsd6patDUam+tMgYwJOrhhrF5PfR9+9QTU6mLVDsbE4GstcA+86is0ICAIICf3JCMouGurSunjjq/zzu6/4VFdh2SJtVerYzufsOzJO2pP9sqZ3fd/7Gy7/+Z9rBg5zy3nXcZlCJa0isimBr24P5P4cckAS6bRiJnsUN/EOwSqwqPFJehu3MInZANtoerSIgijhGrfsbPrbT87e0HHJXzKZNtPe3mLf9Hh5LfLpYR+5tSO914n7mU3dIoY55Kok5r6JqCUHNpI1oGzV67YwbBJ15JR74a57+vWeFQ9cuf6Ri/8PwEYQA2dca/xKZRWo3vGVZaYrRNQCgLPL0Pedsvfolv8ZP2ivI4bXToOFoCx5q+oykaFwk/vuqZHdtPdRmWAEGRGURJtq66Vf1ud/1vGJT7609pZr3+I8C883VQXVTxr29UOvXbjLoP0H9Jd7KeE45NnuBPY2WmE/7QdcYNLQ9oUQtN0gZrfjNT8HgzWCsWnBgNUADOO/I//x4RnJCsMENdY21KfM1fN++vtfzfvsJzSr6k9+/g8ALIDQpowWcgac+4s/mk+e32LWlqwSGddHcgKBJRJ3UqxRmWJlYs9NMrA8iRkChvcLdFUaghkFlURURl6sUbuOqsKWXZuoG2B6Hv3rdWv++L4PIjsPyL1pykXIqkGO3CFn/uFS58AP5FKd/VZBJhxgGVh7S/S6oeWvKOBaITUKpAxxErZzFUprnny+//W/t3cu/NWvAawBEXDGdVWgem8WZZGlyyPgwoQBc07ZZ/wZ50wcdPARw+tm1EIdlMt5seoqEdgwE8XAAxT3/fKHUxgCkysDGxv4lc4nX//eXSfu39+3fr2oS5Ej2JvAaFY5lyM5dPIFn8jsffmvk+Uay441JkHhlOdgEnVgksVBG41/lecAXEl9xw//fYVWNb5DA0UTrCPbw+h7CofcRs9HDCisHZBO84NLH158wTUnNzNtXi26/Uz73g3A8uJjNgppHF//g9tuSuw/ew/d2AdNJDmYy8f+pGEKuagoTQzj1cBNwddchaOf4tOd/agmSC05ALzYIIhIQOo/tVuWRP0AFF5fuPj1n7YcifwLK0Ct9KZkdvM8Bx1z3UG7f/yj5vRv/o6cJjdZKDnKxvfU0tjUGv99QkEiymBxOMHGqSEtWfSvXVQobnjxzr7Fd/1f78tXzQPQ7UVU1qC9Kv7cEYGrpmbEvs3jP3XO2KZZ7xvRuO+wxuQIKFxYLViCgAhsyLMypsC9IAAD9idDw0pjXT0/vPyGp6/qOON0w84SK+5b2s/4k6Px0dl//uWc8WedWyrmXXbIIYrSuWAibQQm0QYPDBOD+4SGiqH5XhA5xfzWYhOfKbxv8FrR8BKrrtal0liycRFdfsfnz3pl3e3XnXHGVkWPOxpgwRusetllkq6beIhz8W/vt/vPEbO5n0zKIRM0G2vcbkZDu5fQVdMHJ60YXRV3IY39LJYicghkiMwCBd4EY1vWZHqguOsXm1W3fuvwvuf+bx7OaDN4s4Oc8X43aMpJBybO+vGNWjduuOnrBzFzvMUjmARDYgUKNZSkRLKWmQHpXIXi+pdfzC9//O9dT//lj+W+p5/zPgEDXOoyclWJwo4IXBlkuE3bJOYuMXKfMefMnTR09tkj63Y9YtSgGek6pwliXbi2ZMX3FCYiptDNkyMZnstubTrt3Pn69++88Zkvna6q/VshT/FSQ6LGc2df99TcKS2TevN5l5k8gVYYHVEsjUNsEEgcmILGb4QRFSOIzKJojeJgFT4nRXyXEkSt1iVStt9utn945Kcfu/aZ1r9sZaq7gwIWADRnHXTkbHrCnC+Zr/7qO5i4i5juPnKSyWiYQqxrM9z4IV8Vm/QskRND+IForPVGxZcGaOVIqpiDKYplcdINol1rnI1//c6XNj/zs+/779F94yrqDAe0sFSbnHBMzTm/bTOTD29M9nQLsTdmC66oh09sDRlyTMIkEkmva717A9wNL6/qW/Xc/N6X7rqlsPzGuwBsCnm+1lZCLlcFqv8QjkuzreDLjO8jDyQweo+Dp3zg2ImD9z1ieO3Ug4bUTW5IcQOsC7i2oGJdr5nFG04JIiJYgNVxkzUwj67684//3+OfuMh3M8C/Og+yyPLldIXU6h67XnD0z/++x8jZE7p6+6xjjPH8qqKRaOGwV0TmhWHq6DtTAIFjgx+FcQyUKAZUAcGPwDfLAy0LqzXJlBWTd37/8Pey1zyWvcyPBN/R85nelc9alUEkNbM/fgF/8pKfJkZPEKc7r2yMUYk83oNJORSb/gJEJHxoJfNPFUL1I6ro9wFgcUxVj7IrTqqR7fpl2PyP731h8+O/+CHa1KCF3uSKMCOJ5ow0PnD1EckP/PwGu+cptbW9fWXD5IiwCiUUYhzAwBiA3RK0ZyW0f9Pz5bWvPFJcOv/uzU9d9QiAZd7RZuBSy8i1oqqj+k+Outq4TTNS6ek1aMZhkz541MiGPY4eUT91j4HpcWMaEyORoJSnQIcLkLiiLoEsDDmSrKfE46uv/+bvHvzw/wZc1b+ETGT5MsrJ6IbmKR+f/cPbpg2ZNa0v3++SIcdhDv1Hw0gKW8yChIbVQA+kIvkr+TbJIfCRz3FhC/kNESy5Ul9Tg4L2868f+t6fbny89VzNaIneBTqD3r0L1DwHubmuM+sD59d+7Eu/SO22J8yGolWFUaLYaHoNCfT4+K3gK+J+8YF6PEwJqeJnocJcBCSwyZoGU1q1sHPN9Zd9o3/Rdd/3werND7I3cVmHnnf3czV7HbG7dioSCV8c6ips30aUezd0y7pXBUJ/c5c982p51WP39C65eSGAjSFIiSW0tDDa26v81H9Z1JXJzKQbrn+/Dbguf42fOfTUXcYOmHXEkJpJB9Wnhuw+qHZ0TVPNyFRdqgFOIukXaIBUArh94S9br33u/NzWgFYzsk4Hcm4SM3f95MFX3HvQpFNHFPJu2UXRMWyIgvQuFml5BHuw3T1H0ZB2iaWBzAgrmwGnxcF91JsDSSC3oTbprM4vxz9evOnTv3/gwquZjLvF3/9fAFixSCs1bu7htRd888epvQ/cHT1Qm88rmDkaiOpP7fDJc47prEgjFXw80uJAmxUMmwju57pinDSZVIoKCzuW9N3+ixM3LW5fiIwatJN9i/dLIKLB5917TTpVf4pTO/Bxt3N5orj0uQGUrP1D8eV7nPzi+24vl1evA7AiOqrs+W+0AlVuaueIuoAsZTIzqa0tI8ysUS8pEgCGDW6ascukQQfuNW3ogaZQ7vvAsIZJhaGpcZ1cpKbnN9z5fzcs/PKvs1DO4a2N7jJoM9ejxSqS0z91yJ9ys0af1GKQRrHcZw3BMJtItgAKveC5wgY4NqCCIv8vbyAFRSS7X7wSsZJ00lKXhvPSpmeX//q+73zj6ZV/uerdSAPfO8ACgLY2g5YWC2DcoM/8/n95/yM+RoPGJMq9VqhYUiL1qq2hPisadMpAbGIzKgz8AimEz2EpBMImAZNKmfL61VJ4seNXa//8/lYA6wMSfVvedgqYVARe879NAyhER5EAER+gWuGPBauC1E4MYFlkaWamlc663rGqgi0ssWr886Pwdl8gg4y5nq63qooTZma/fOCE0782oXH3ASUX6tqCEAszE3E82uKYjDQmMGW/dMi+gykzg43v5iaqDjmoSxleX9iMx1fecdOP7/rol4HSK20ZNS3vclWb3pOPM5MxuOEGCxE07f6+I2lu5nu0V/NeMnAkkLcwxbxlq56rP5i80ehaIQANZBBBH6Jaq1AShoHjJE0inYT2dqKw6MknNz9x85f6nvzZPBABl17KyP1L/qjC6zyMmCBeH4/xBylYl9HSTmhfEEzVqXJS1fVm5xMBWWQyMymDDM663rEAYC912VzmyCV68dud2cfqMfY6MLHL7qfv87XWKcNmnzqqfiq7ZYErRUtGQVBmYmJiMMEfeRpd+AOynRkgTwgqjsOaTCZNOknoLvTh5TVPP/mPhW0/mr/4Z9cQES69VN4yff3vASz/YPtCNwFQ37DnqaeaYz/2QWfc7nPM4PEpYgYKZWihpKqwJOK3vGiYInoW1QwVGHCSwAmQuNDNS0t27evz+5+//7eb78v9FUDZT0e3NvJ5I9FbXC/zjojiqmunAjFsr3OouTnrdPhV7nED5xx86ISzv7jr8APmjB44fUA6kYQI4IqFQKyKDWZwaNCszUQwxDCGTCqVoJq01wC0vm9ladmGlx97fvnDv7j+uf+9EUBpayqa/62A5fOWWcblVwj8GeDDJh67R2nuB06kCTMPd0zywOSgkXWSbgDI+IBFMAAM+emhC2jPZpQ2ruhyN698UVa/fHvvo9f/rX/1/Z7PMRvgkovfKqqqrur6D1+e7ILCqKdmTMve3zht8pA9j29IDT5oYM3IptrkYDBMReU8nH7GQJG6sTG/Qvrd7ieWd75y92OL77jx+dV/fhIAmBinn3HtO6qx+s8ArOB9ZDLsT0/WiDeaNrHhff8zVno7z3aGjGwyA0f2Y8jELiTTLvf3o7x+TcpduThPfV139c7/1etFLH81fEZVQks7V1tcqmungi1kubUCuABg4NjTd/viwL5i4YyaRO3MwXWjSiObJm1OcW2ps39t3druZXWdhXVdiYZU27yXblm3ue/Bl+B1vUJVqaWlnd9roNpxl2fnwFDlt/XYNjVb659dXdX1X7yRSLPKmt32fcRkoFnl7A64j2jHPuhZRmYmIZMBMlC0g7DAe8/NADpm+pHTAihy0ajW6qqu6qoEr2y2lWYubKXMDGjrfPAc/zfrh0G9n83nhcPWa7tXRKpWuauruqqruv6TIyxCNktYOJOQAbBggW7nvjoCsoTMTO9vnLHdn7+6qmsH2cOKTKaFgQwAoL29Ja5S3C77KOs5pQK5Vn/q/M6xlxiZNgM2UedlxW8N0KYGmYxBzBhxG8CXkMkYqHrKt3+6B6M5O89Bps3s+OlwdVXXm5/rmUzGaFY9M64tf+m1ulHGO8/57eyjLLKsWWXVNx6cYdjjuTLIvKt76V16oSyjrZVwlrGBc/4AYHzDzGOd4qDRRyqbGaVli27tWtLxMIC+AFxABFzrGv+y4UVJrf6Ms9ZWLzoDgBlDCZcf6UYTKAAAyUH1Myenpux1imtLFvkNN65fPK8PwBrv+au2LtX1n7ayrNqqzEY1Os9Hjxu0V9OEAQdMIEnN7i+te+7xVdc+CSCsmDMZWHGpdc580zp/jm0lUKt/zreilRb6gtYF6+bT5fcd6XpzGMPn59rEkL0OnnrqnHJJGlwt/O2BV/+sAJ6KP//pZ/zFtL8LFXl6x4FKW4NGG9QDuyb2OeV47H34cYkpe09LDh07zGkYkEKqBuW1q9Rd9fqT8vqC20tP3f4MPff3Jzu91oW1W/lig2qBZO2kubOSe5++T3LE9GOcQaP2Sw8ZkVTXwu3rKpU2r13rdq76h/vC3/+++vHf3QOgG9ksz2iHs3BhrlwFruraUSMqzSrFpArjdh977Ny9R500d3DdrrMb64aPq6sdkEpyI/rzXVjVuWDtmp4XOl7d/NC8p1+7+VnAXYTA1uitVxMAnjBoz/32Hn/87JmjDpg9omnCIaOHTKmxrqKnf7Ou71xR7M6vffTljY/dN/+VazrWdS17AEDR02qdbtrfwSb/d9AiuY1xZouFAvUY0swf/dKpZtf9PkAT9x4qTQNgLGDKCiNiWSwIxiBhIEVFccMylDYsX4Wlz+cTbvoGWfxYo3SuWcZ1g29Lj5u0WjuTJD1LGt2eDXOornZ/Z8q+m0T1GBmxy/DUgLEjU0Mmw3ESMCUXbMuWoURwWJwkygCKnWsgK154sfDcTfM6H/rFn13gIRBp1Zq4unY0oMpmlS7Lsfi9iGMPnfj5i6cMP+yU8YNnDW9MjQYTw6IMUVchaiHECZNmIkKfrMfm4tLN6/tezlvXPlRwe59ftvbJUf3lrs1W3eeThl8plexehnRWU/2Qmlljjn61p7D5xLFDp44eXDdq1KhBUyltEiiXAbfsWlZSAjkJZjgMlNTFsu4XdEnngns7XvrrdU8tu+F6AJuZDEQv5nfCQmn7A1ZMuZ5AYre6j1xxCe1/dEan7eWZl/WXLZVKYPU8ZImYvKERAnKtqJKWTYKsSXnJeVmhpX5woRfkllyHuWAUYNUkw0lqshbWqYXCwLoCLhY0VbZioGB4ntveaDFRVVVrSSyxoUQ9UTkPu/yRrvKi+X9YM++KHwJYCmZALuGqX1V1vbcrY4hutKoWQHL6qXv9+KO7jJj9ocF100bBTaFc7BdXSspM5Dc5+/MmFApRJiOGEkgmUiaZMDAEWBG4th8ltwDrFkGCsmFOpJMppJIppBJ1SDjeq7vWwlrXirrwZlUwRcPqFaQkDhk4Jm1q0sDm4jo8sfreV+566cZvPL+8/U8AbFumzbRsZ8Epbdfn8uxYZCDQlDgje4Fz+CmflWl7D5ESgP6CJdeyEpMSheZ8gWeVNy3HH+DgzR4UtQqrLF4bIBMrjIE3m4wVIBFRV1VVlKxl1nAmiOcPHzCIEs0FRDgpWkTByql64zBQev2J9e5LHdnl8756NQDrOzpUo63qetejqkymLVCWpw6ffMEn9phwVuvYofsPUQGKxT4r1vWShnCSeFShCmxkiANXXvEHdLEysaoSOWQUooaJiBhqmC3IknGgBMtEDIIS+16jgZUWh17wkcGf35coqUQKtfXMG/rX47nl997ymwe+lV3f/+wzfu8hYTtVLWm7gRUbhVgMHLnHIen/+dYPsf+R+5Emgd68N1mGODah2ccPiYz4EPdk32KUF0k4HVqj4Q6AUe9IcGCzDHj+7cEIsBCkfOtlRHMQg0EYJFaZE5KoaTBiC+h++dE7Nt74+a/0dT79HMh4I3yrq7repeVvcK13xhx24szLL58+8vjD0smBKEmvBYSZDAXOvME+Cmd1hkZ8/kiuGNiEMz3Jn4EABntDrMkQYAz7033iY/HEs53RyNc9sKAh43lmsef+7C0WqUmmtTYNs3jzwk03PveLn/79mStzTAxvis6/L+zeHoNUPdeF1mxN/eyzvqVf/PEP7R4HT9Kusov+PIkx7DUH+B7TsZpcNGgU4RCJYIx7HI9joyB991cviOJgDlxwGHw3B/In7FTaKFM4EqzCWJ+MN8An36diIYmR06alJ8xu0d5CZ3H9Uy8M3+ML6b61D1cjrep6N4h1prmE/cZ94gPH7HrZXyYPOn5qvmilaHtBYFZlP6qqHJNKbxCFhD+jKAaLRnYFERJ7F3xfYhTO0Qz3aDB/MBy36u9433xZY/MQiUBKVHZdLpTKdnB6VN0eow6dMyg9Zubjy297ipDb1NycdZYu7fi3Iq1/M8LKMvgKgVhn6Ie//738yed8zk02IdXTZ52EMQpE5mFhVOWPdfQdQzU+sVliA1GDPyucn03hRB32vbAYgTMpIvdEP6IKbcXiERxitsvBe/Dtl1UAdQW2bK2mmozkN6Dnvu9fu/HxH34AWa06h1bXOwpWbRnllnayx+3S+os9J37s/AQGayHfrcZxOIiYPPdQCkdwBcMhYiMI/YJ8MDQiGscVH1LBsaGoFBr8aTh0ghG5k1KET95+891IOfbY0LU0hiZirSY1JbVpYzpWXv/ij+ed//7+8vpnt8YG+h0CrIwB32BrREalz7vyd3zqeUe7/XC5VGAwMygw3ItNvUGUtvn8YMWg0Qqwipn0BfMKw3QvNtYr8HPnmJ1r8DyRv3t0pQjnF8amTge+QCoKsQopi3KiznJSnP6X//Hdlded/pXA3rm6t6rrHYisiHIkHz34ttzExsMuLblwS7bXMHke7RxwRsEA1JCv4mikF6KBEkEUFsxHBCKv9vj0Zg4GpCI2Ice/L/zxX4FVMofcWCWQVQJiFMkFe9oQ2wGNSfPU2o6en3V8/aJlmx/6zb8DWm83JWSYRZISmZD85M9uty2fPshsLljHLTtwvIMcpXsafBeCRBhlKiqAwxvvRf883is+qj6ciuN/gLHfa2xwKsWC2HDGmkRRmCoit1If3DTwhmcmtUUmcdzaEbsdmh56SFP3mVPuaM7Oc5Z2/KEaZVXXdgerD+331x+Oa5zz1Xwxb10tGGaHEM4I9NNAopgPezDIKwj7Nfp3ZU4YcVfBlJx4xqPRXo3HMeTfsXJujsYImhjlIjF2Sr3fEQA2BHKUC25RJg6emp4ybM8TX1m/ZPVfb//IU1lkuQMd27yX3k6ERVDlRqIm88Hv3V3+0Bf31s395YRFggxVhIWRf4JGYLIlWIFig1QpFiHFiPhwIjSiOYYSjP/SWCTlfc/xkfZAxej4YII0Ys8bpJ7kPx2HXJjCmITLqQanZ+FdVyxpP/qSgBSt7rXq+nfBisioqsVxu1/9k92HZy4sF/IuGzJsmLwqn0ZTbDR8UDhbkMBhKhdmLLH7h4NV/TQP8OcPIpqTEEVf8AeyRlwXRzRYRO34r8/kEfKG4L0P/72CYtFWGMERRMoysLaen1h7f/5bd3/gsN7Ciicu0Uu32Rr67XlOEdnEBb+7VN9/0d68Ke8mrCaUY3RRLM0KHhIcUI3NG4SfmqkCsPr/27u2GDuv6vyt/Z85M2PPeOIZX2KTOPc4cRKnIQm5IHAoCQiCMLcxgYZeELRcGkiFqiIR4TG0tAVRHnhoJV5o6UM1EwmhSrQvrZSHooKSXrhEpaVRlTSA49iOb3M559/r68O+rX1mSGzgqfm3dTT2mf+c85/js7//W9/61lqgV1AV9MiTnqmoernLyMj5+PEVMBOJzytR90L5ewI1b8AM9RVC4uUnsDQHDIc9LJ9tp65+7SPbX/tHXxKRBouLTbffuvWLrPn5RUf65u7LH/nyvrm3f2x1ddCiQQ9NuNpKGg6RNW/G66rCU6EKqCq8Msw91Pg1J6EkKGUiuSVQ1Ch9IA1OF6gAijAWTyOTC88T2FLK7lMJVQWp8BqPQXysCIpsnB6j0PgYaM8dO7nsb557zeSn3vTXX1ZyzwIXeKEY1FwgWDmI6NQ7HjmM+Q9/0i2rb7w26lyO4BInFcCMnC8/Q0hoMhdJt0IchIoRNoUyzitnEHMICTOqXuqso46yPPM4oHiy7DHZE5aANAj9w+FQvDrtbdt7t5554T/W/vxT3w1NZY90TKtbP8eie/LJG/XWXR8+eOtlH/qzhpMebq1xTRPBCiUjl/dVDMfimPikG+XpzsUxZXdXCefCfPnIN9JTGalmVMRfRwdLrhDm2EBESmAaklmjAVyaNO3c6mDgL5+9ek+vf9Hr3/6Bu77mpFkjeN6R3vmj2+HDDk2jW6771fvw5gcXhsMxcm3oWuckNbLPWQkCUCm1yNkLFRmTpkye0Y/yePk0GJXZhwUNrIiegE/CfGBMJWg3IV4SqDTRtwJW1HS1MGFpotTxfJjPlfBUkJB2eUWkt6PdettHv9yfvv1aSKNdZ9NuXfg67EQane7vv/bGS9/3lcmxnW0rawLXiMbvpVfAk/mmke0EFpSCE8mRS2ZAcXhw/W+7JSSwnxj1aIyGkgLGKN2omuQ8s34ejpGkpoTnD8cWJuW9lscr4zmGzCIawPXRnFsZtO+47qP733nTwqeU3vHwLx+wBAsLnFLdxoMf+xp37aU7u0rfjGUeaLN2CQjKCK4YmkUDKFXCzRtQGrE4UEtYmKmtNZ4mUKIAWhhRZk4sQAkLdEhXKMnj7KHFfyLxnOjTBOqQZWycc27lpEzteOXcxfcc+VNQQweKbnXrAtaBA3Ckunv3Hv7i9un92wb+lNCJ80qkGzVII6oKpZrvvJV/7R/kohmlDwCnEehseBZZWpZtkiQdASiHgGbrJKk33GK4mf/tMpgFgApgG8ArTMVLUkwASwHoMGiHjQ7H9HVXP/DJy7a++o3uM07Ptx3z+QFWHNnOd/7hn+hrDu7AyRWVXs8kOCVbFYp+hKghSczERV3L/rSAoUWzoo/MzNMASmBfyM8XXysxJo8K/GCsEPQBgMQAYLpUBbd7fD0z5xDxMTR6V+Oahiun/OYrDrxt251feBcOiY+9tbrVrfPRrZrHHjvSvvryzzx4yezdb1kdnPYU12gCJ01gQKjXuE/ixVhYDWOlASO1gEMp1/KsO7ECHI2PIQiPAJIJZOrApGZqCQoYo5oCZgWUwv0SnkuJVhlAzAu0JXwLgI2cGyzzypm9+sAr/+DzJKcXQoNA+cUB6/BhB9fo+O67Xs973/M+t6rsga5h6gzGPBaeEV0ZRUB4lDdrQAxIwJMARHJ6tLCuEp7VAEST/TMAYzKPiZ0F4CviWvkSjNwYw1MULavWvgJhFhFABzI+Nu63XXXvnwC3zmDfPNE1A+zWeUQpi4vzumXLnbN75u75nOOkH+pAvC8yhb2QluLA+PVXA0I5/IhfX01gpAHE0h8W9qXx74l15ePVsrRwf4pkbEhYmBSrkDCFoHYbp/NMWKAeaH1IDiRwJKQ5vbKKV1123433Xf+Jj8sRUfKlJeGXAizBwgJBHWsOfvCz2HNlX86tgNIIk6M8hWFZxJasEdF4pmDE7OJCl2zYzKyK9a08VwI4A3bZCiEZ+FLoCcOacniaQ9TCdRP7Ahmyh7H4WqzRFMZO4XrOnzuJ8W03XfGKAx/6PRwRnZ9np2V16yXYFZ2I8LbdDz40u/n6VyyvnSLpHGPIl5SkOsRD1rCYAIY0oJPgKfElkyUER/QmjY9XeA3P47UwsxRGJobnUfUKgJGiTUiYQM6GhAXs8jFasoyZiHjBoPXSG07wNZe94xPA9LXOuZe8+L/4RptfdHDCib0H53nH/XfJOfXinEMS/yohu2Rfc9YgZweZQ7kqPLTdE1gb0UqmUNbpWFlEH/FoJXG+Dg3DByZ+hInFD04qrxZHMppSMo4sANh6ynCwyoldtz00MbFvz9IiOgG+Wy8qtC8uQScnL929fdOND7VtS0IDWGWo0cq7SUgJ+Qwr8hptDSPAxFJHknWpzHTM4zO3iKClavWusqVgAxsTKib/fCaEGreUWi2LReTPoWtKNUqWgsT35NTpNd239a6LDl738MMk5aUE+BffZIvzCqJxb3j3b3HbDsjyKlSk8khFepdPhJmZBLGa8cNgpWMVMEmZEdGNIN2K78VXRR9FvfhhZ02rAinj+4oon1iYpFAz619FYSz03DxfyqYw+lDUueHqso7N7J2dveWDH4UIkZr0d6tb69jVggiEd1zy8d+c23TNXDtcVokVx6UgGbV4rlr0rCzABzaVdaXIboJ0orlao4jmSWgv2pOax8KGhxEyM4BlTYsZhPJPr/kYH5lV3otWbTFssWBpBDwnoBCerWMrvGXXfb8G7NyHBbyoN8u92FUBznFq12vvluvveE2z3BJAo0kYT4g+4nMK+pUUe0ACkiTIqzF2WmCyFoh87AbhnbkMiDchnddoPC2vycy4kLMjhVlJBC8px1oPlxo9S0vdYwJW8RAZKjfvfNV7gS2z+EyjnZbVrY21KyiA8W1TN76faEhHYdwUmQFFy4EN0XIoZTJ9TGFYBoNg5FQUe0NmTAbw7PNo0ptzkJOykzYLaBiZeW5vwY2oLBc54EmWCZXwvjRtWckACoRSod5YT1Z1Ta/ZcduW1135wJtFhDzMn4NhcQEg4W9/469z++XjWB6E4pX0hnx5M5oBBdm/xJEsYMVWjJonLB4RVLfCjiR7t2C0J2RmRsOocmbReLtCR9Po3TIszFow6lBUTD+uUmgNn6wbikboMFzV3vS+S3bd/PtvAjWE0N3qVp0ZdCLC/Rf/7v1bJq++auDXCBe1K1iZw4JS1Jiy7kTYri+JKKSElgJlX5pC3QxgCGyrAGAR0FMwSthsI2FzXQlQMxCqjtgcmMNPz5B5DMcarcwHfUspWTtL6otKK5vGJ3nzpQceBDATWZZcCGA5AJwALtUr9t0/VIfW+9BfMLEbFODIYVgJwCtgKllCMUJ6MZLabB1ZwrVc/2dDNGM2hTkWlRm0PB6QypclxrcFlaqJYNW9wQJkBrboidFUnzVEvz/FTRff9QAAzMe5cN3qloEsAHA7t97x3olmFiHQkmwdXw9CycxZu6xqM2iRWdTsJTV+K1WrWbEOCfM2LXuTVntKGUMTHnoqfOXBKnqXzzYJVNlJG0p6I8p7At4DrVe0LeE93OqK4rKLbtp38UU33RxqdQ9fCGAdBkTYbLvh1W7PDTux4ilwLpgoU4dP07YlfQjWS2XCrgq8oreEKvkDGrUzZD3MZBqtGZVGxM8G0BxM12ZUJCtDDu8YOimmtIYWwZ6aMoUFmDIom/8h0cDYHOEavyL9yYtft3nz/h1LS+JxAWUG3fr/Hw4+uuQ8gNktk3vuUQ4B0UZMiSBsKBdDPRVkr1PJzFkXe/FhJXam0BImarEnIGtYzGCVQ0pKeCRthlGNRSL+MQK/prDQeLuKkM+yrRKIpS2VmJsS3odMpfeEbwnfCpZXBrpj0xXNbZcfvB9Aszi/cAGAxQUAEN52312y4wrXbwfaiwXGUAMOhjkVvxTW+6hsGFexGIyEZGLyp7U3K1kPqo4NSZMyDMyCmxhdKpUCVSGqOddcVJ3bNAfElOjREh9vLYFWIaqAF/GDge9v3r155pr3vgkAcGChM5J2K3KreUcQN+z+2J3TE7vnWj9QQWOyUwmiCmhlcKl8VMxBG43ulIqVS1JLK1NoBsD0fGIziIwWh+LJSmGhV1/MpEao1+L8yfYIq3dlYDKhZLj+a7ZntFGgD0XbEUqixQFtIzs3X/UWAP0HHu35jcLCjQBL0PQUwCbdff097PfgvEpp32LSmYY1peZ39nf0WjEua+svzGtE/2Ltn7L3l3AQtZVhVLivAnCMZCi1DlWrsC/cISYridEwkSW5oJ4YDoYENmN85upXApD5HQtdQXS3ImItAgB2b7n9lnHZCt8OtaT8a+3HZggTcGkVEtYmTrD2O5avvBXnkQErcbpiGrXPyREmlxgTCrNCDBmzOG9fT0K4qKiEeJ99WYHQZO2KUpf4hvOS4QC8bGr/tl5vx6/EQa7nBViAb2UamJArb52A3xhIsg6VrA1qTKCVDSGChsn6iSnXyYMmWIddYHHMV72siHW1h850d4DRpFg73DCS8zVpEq0sEXWCwDIv1kZUBUTV0RMi4/cB4NKjje+yhd0CII8GljCu8G+lBxTeAdYoasVz1u1gWIAqu9wToCXJgsXFlUPMESc61GYircZUO+JHy3aUG/xuNLRMLvv4nhKgqZrMZMpCotgcvMR2NC6WHDnAjTlReF40ecmOq7a9ajdBzGPxfADrsECEg5nrDzbjk9c0Qyghztsqbi0FzJrc57T1f8bOoKl3etGmUIno8UOuVLwEBkFvojGWSuzDnsEtJRRGQ0GP0vdKU1EzKkOqMyPGYM5XyuUhPy5kCsWEpOHxDRx6OsT49JXjADbbJjvdelmv5EJemx5/xTSlBZwtwUl94hi91aVWsCqtobnPhG3r3e7xWLPFQ8hYRPvsZkfN8pQ1MCXThAfXm0tZPF5eFS3V/F5N1tA8b/R0eWN/sGBICYMwtGk5PTnLSzbtvwsAFjm/ziq0HrCSAfKme3/st1wsHA5KBsPaFSqOGp3kueRFRlocS5XRs6U4xX8lmbGleBzRy1F3YAgnYzuP5tpF5UhrmcK4aM2jJky0mlgCKnoaKwVLLyLTPsf04nKOQ3Vwl0/veNv+cOx8p2N1y5GK6f7evf1myywxDIUgNqyz5cxSsyTzowrZvGmilzQmGtlEtQY5mGu7lUIqRhXBJu1nNeGhj6+RTrqI7sZWYVvg5Ezg+kwlqgJrKfWH0Z/V0qOHnmzuT936Mz/UdfcsRHvE5v72thnDYNjGuQ+aY2crtmcWpchvlmo0LhPz2mOtA72yOeTuhmJiZtSdHPxoJ1E749C44yM7S4K7mN7tHHXIq6kpTIBpM4ixG2r+3/fFSuFbT9ebcZt2HRgP2kVnb+gE93kBgB3T11/XoL/da6t1+/QRy4IWsMltkjJTstqWKXqm1YZHuzlgpMtCAEUPbGAOZVVkUu1DkwTIAFTpYMznXcT7aCy35UMoIWXqXFqitpA5HA7IdgBcs+PO/wKApUPBXmU/1966T3oJDkDD5589pMEGwAaxTaGptVPTeSGBQ56Ak2J0wrCx2PEwtyPWEEpm5Y11G5l4bEhXJr2KxVGmqJie7d4gxjFvawHTa1mGVJlGUULRfE7mskhzHvkclPDeQ3o9TG3eLke7vdqtCFnAEmZmbjjjmh5VPepmxYU92fEOhGH0JOhCr/QS7Ul8TPyZMn9JqI+DTxN4henMUobBZIanhdjFlsgOJZKIcQwEhEoZPFyGwUgOQUUCcLpY0+jMO3WRSYWXiR1PM4IG/Sp1MaUHhg5o4DYB6D3waK8FqjGMGwDWfPzlxOQcpAdoS+QXMm/YtCtm9EPZabRQmBFf8cPP83Mki4FlJBCqPvAwfdxt4z4xJTxiAI9axtMD9XTpVFYTwsxUmF1GhsEAkqR6w5zONG1kR84vcWdVL84J0J7ZAgCx5Uy3XsZrH8J3YMxNN0IRpRdI0JQkT5Yxw/+kNA+g6dWW8Su3Rw5tjph+5qnEYiEPCQaq9sqx8XuGJTETd1jK7VIrJdteiWagRAJTSZxFg3iewExRaiQJZmtiYohCM4fHx3k/Aqj3znvgxLmj1wK4GMD/vjRgBUvDwPUmINID6CtkHikpLyCkJrsRWQph2s8AAJ0BtTJuKwFSY54XOU3KepxXzjoadpXCONMjvlC8dHViYYAwDfrNIFVRa7ST3GLGuuTzsIrcvdE2TENXmtOtavV7kyLaQAmIKx0/ExqJ7XueOhpIAS3kVu4ZSjI+MfEZsw+FEvFBIwCKGcwlyOPAEuiVIXhFHxbbNBCZEblISpzEGfcAoJr3JwuWFbIhzK+ZArXEEyFhAIYYjkIAg/bc1QCmNspdrQcs3wpE6Dj2o57Inc4JSBfevpraaxbkpt3UakHC9KFKYaNtPVPVJUSWNMKM6nCt6FC2qR+zkbQ45UfDP5r5h3ZIa2keaIa1wnR2qM0vZsI08vAMCekfSG98udui3QKAJ7EkAHB25YTzkwqHHgGtx+DZ8IvM05azfJIJTpmgI5IkFzGDIcyWSmAXJz9REENEQ8QMQ7Khafl7HFyoMVwsuxwisYA5N/C02y0BnMsb2zOOC5Oy75lGgsFMqxZBI07Hemxm+jv/HcAzXv26kXobie4BOD2XmtVz0mt60lAANiBdVfsXep5rLmepOnRWGb6iMxXVccSKQHOl0RH9STWL5hLnEbr07zy6HnnsvIxqV5GF0VgipK7uzGCbp/gwlvAYFpeYnMRMYlIoG2kEq2f0zNPfOQUAOHKo82G9zNcSfkAAePrkd55f9afXXNNIGv5gi55Dtk+ztccK66XvnLUlqHlsKl2rqgOroS+o7BKaHe6lcWAt1ofta9rZlPYsJrlVNm4S49NAijwKTFkXW8f7dLShZhxo5qRBb6xh0xMcO/vMTwGcS1j04oB1RAhxGHv8b56Up753ajjWF7a+WGdhs3BxoCm1LpcxAyFSgy+wpDRzG5rsyi1muHqGoQnRslmUhnIaTxZNz/YEqEBViC1qx9KXTB+0BrfKGe8DKGdTakwBB2c/0A7Uk+NYPv3UD5979i+eICnAUjfS/mW/jihJOX767x4/s3r0Cegk/JBevd3gccgETCeFqosDchBX6gZRdXXIwyWMPT310qqmRNm2LlZrtvu6KrQuyTPrYLIaNU2zTtssEBmYk3ZM46WsXe7I9yn6bhzPrx3j949/azFA2cK6LMVGmgvxae9Orx37b/23f/xCu9bKKvrqh6sEh6EvekL13JuneCsIl09gI78WU8M/07GM5kOAllFDmeNGz1boyY4NS3TW36R2z9vODr4wLBmpZxStp0unbCW9VgAXzrdlI2NKXXGnjn778wCGcmhpXSq2Wy/PJbLkAMj/PP+3Xzw3POpE+xy2Ay2gZC6CsCZLVpYAiW1xbWWhmhI4n0AqMZi4qRLbKqAVGv0RRVsqHRY0M7lSIoRqVBhYTKfl+m4SU5LmFTLXSBabQ9rOI2VIKvDeYzjg0KHpPf7sNx/7/nN/9Q2SgiPr535ubHB87AhAyvA37vlWf2z2Zrnm9n3ek/BDD2WYS5tRSmPmgqX9iiQGZQsEWQnYtkhQ7DA0Y1HImblciIzSNib+znEUfEzYl87PJ9c8ILG+0ZHFAU+FM7MSkcNc1h4uDalfIeng/FizqWmaiebsC4999pknP/QlzC82WDrku63arRgYEqA7sXLwPycmts/MTe27uyd9IdoWUsTwnIkz2XBidKYm6rDPAkb2W6UC51HRquy9NAC1qjjJA6/EMDEZfWHUY1ZtLrJkKWmScZWXKOtbDP6HCJLqRWXY45Tb3Pv+qX/49lcff/gQ+cLZeJ58adE9624iWCRXD8lHNrVnnna3vOuhduf1rjJaBtckBApXtLwwZLvvzIzBwLjExNchaRjebJOe0zGHmyLBDa+OcXp3BJwoJrr4vkXLfSiVDoYJsUy6VUXjkEt8IIA4o6uZ8WNJ6wt9r8p/rNChkTFphG5t5emzJ48/8cfP/OD9n8NhOhyRDqy6NcqzVMTpvz792YfbtcGzV+2495HZTXu3CBt4HYaGASjKdfguS+xIF8ToUmORBG1kl0OaSSBOSp2uSG67LGnAccYVZ/OCVYJMIqCJREyJr5VfPyWlpEyWblz4t3PpHE0iy0RAzgnECVy8NY3AsYGoNKfan+Cff/yX//T1H37kPQB+IrLgTKoNo2mKF/20IQFFNu28/S3+wO+8GzN73oBtl/YwNqbqwy538MZTJSLSAHAQUhBnlKWxspKACw0gDo4QoaBJ9XsEaUI/p0AYKSaCcFxkyMJerMJ0qhHe0/CI2NpQXYwthVDCUcUlf5gGc5lA6ABSKaJgNuBp+O64iKPx8sV2cLppB8eea4fP/v3zP/rK15aXv/cvEazYhYLd+ln7KPqmON3fu3f/JR/47anepW+dHJubbdyEV1XJwJTwBhAFHUEKXQgv6NI1HhHTJIGJE4nJehERSjpOXBMycuEXEZCE4kBRShxsHvWhcBoUigBw4mKA6BINCZAZnQ8QJw5haLVEU6TTYhSFUsPzBPuFOAfXODRNjy3X3PPLT4+fWX32se8+982v/vCnX/+GQIbEpx1wRH82IJ3Hhw3ngmIOYBOwawwzKz1c7AFgiHNjHsMeNm8SOTfm+9DBGM54h0vYYsV5DFyIPfvqcJzATjgco2K7YCfQtmvOuSZs9GNADycVAFq0TjErhJcTaAg0xJyXmeMTTTM7ridOnCJ2TfmdOpT26Jprsdo02KmYBUROkZwR79eccz06d1YBQI9POeAkYtkyw3P3FThOYE7CT2AnAMWc+NmBA2aBE8CJnaseR8cIPNGPn8sLQBiOudSFgd06jzWPxWYJ+bsyE/bf1QoM3dzcWX+83/cAsL3d6gaDcz3VycadWfGnMOGx/QRxzBG7HKEqONo6zFJwIscbxE4AbetmuTVwhxMq2AqoesEpCjElMnOWzvVUgikMJ+QktztH1VkhvQCA98OsbTvX8KQbU7gTBIA5VVGdceGi3joAOHXqXLsV6k4CmMUcT6QSll1PDfObVwh0uwDA9OrY+JkzP/YAZgE8BQBOGmh4/V/KRV9w+LAD6UaMJC/T66XD/DybbrRXty58HXbz82xEuq9OYIYN4ph6Ob/H/Dyv87KPfDYWBLvVrQv9EtkqwpfhR7Be2e9Wt7rVrW51q1vd6la3utWtbnVr4/V/WPD/iE/fpfYAAAAASUVORK5CYII=";

function Logo({ height = 26 }) {
  return <img src={LOGO_DATA_URI} alt="HeartLeak" style={{ height, width: "auto", display: "block", objectFit: "contain" }} />;
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
const ANON_ADJECTIVES = ["Calm", "Gentle", "Quiet", "Kind", "Soft", "Brave", "Warm", "Thoughtful"];
const ANON_NOUNS = ["Willow", "Lantern", "Cloud", "River", "Sparrow", "Moon", "Pebble", "Dawn"];
function anonymousHandleFor(id) {
  const compact = String(id || "anonymous").replaceAll("-", "");
  let hash = 0;
  for (const char of compact) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `${ANON_ADJECTIVES[hash % ANON_ADJECTIVES.length]} ${ANON_NOUNS[(hash >>> 3) % ANON_NOUNS.length]}`;
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

  // #5 — "how HeartLeak works" disappears 2 days after account creation.
  // Swap accountCreatedAt for the real signup timestamp from your auth/DB.
  const [accountCreatedAt] = useState(() => Date.now());
  const [demoOldAccount, setDemoOldAccount] = useState(false); // prototype-only preview toggle, remove in production
  const daysSinceSignup = demoOldAccount ? 3 : (Date.now() - accountCreatedAt) / (1000 * 60 * 60 * 24);

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

  // #2/#4 — Profile tab: switch between the Anonymous and Connected profile pages
  // (each with its own background theme — connected is dark, anonymous is untouched)
  const [profileTab, setProfileTab] = useState("anon"); // "anon" | "connected"
  const [editingConnectedProfile, setEditingConnectedProfile] = useState(false);
  const [connectedDraft, setConnectedDraft] = useState(emptyProfile);

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

  useEffect(() => {
    if (!authUserId) return;

    async function loadSavedPosts() {
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, mood, body, expires_at, is_pinned, created_at")
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
      const [{ data: messageData, error: messageError }, { data: profileData }, { data: connectedProfileData }, { data: notificationData, error: notificationError }] = await Promise.all([
        supabase.from("messages").select("id, connection_id, sender_id, body, created_at, edited_at, deleted_at, seen_at").in("connection_id", connectionIds).order("created_at", { ascending: true }),
        supabase.from("profiles").select("id, anonymous_handle").in("id", otherIds),
        // RLS only returns rows for people you're actually mutually connected with.
        supabase.from("connected_profiles").select("id, username, bio").in("id", otherIds),
        supabase.from("notifications").select("id, type, connection_id, created_at").eq("recipient_id", authUserId).order("created_at", { ascending: false }),
      ]);
      if (messageError) {
        console.error("Could not load messages:", messageError.message);
        return;
      }

      const handles = new Map((profileData || []).map((profile) => [profile.id, profile.anonymous_handle]));
      const connectedProfiles = new Map((connectedProfileData || []).map((p) => [p.id, p]));
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
        return [{
          id: notification.id,
          type: notification.type,
          threadId: thread.id,
          text: notification.type === "connected"
            ? `${thread.otherUser} accepted your friend request`
            : `${thread.otherUser} wants to add you as a friend`,
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

    async function loadPrivateProfile() {
      const { data, error } = await supabase
        .from("private_profiles")
        .select("username, age, gender, bio, private_bio")
        .eq("id", authUserId)
        .maybeSingle();

      if (error) {
        console.error("Could not load private profile:", error.message);
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
        privateBio: data.private_bio || "",
      };
      setConnectedProfile(profile);
      setOnboardDraft(profile);
      setHasOnboarded(Boolean(profile.username && profile.age && profile.gender));
      setIsProfileLoading(false);
    }

    loadPrivateProfile();
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
    if (hasBannedWord(msgDraft)) { setToast("Please rephrase to keep HeartLeak kind."); return; }

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
    if (hasBannedWord(msgDraft)) { setToast("Please rephrase to keep HeartLeak kind."); return; }

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

  async function blockPerson(name) {
    if (authUserId && activeThread?.otherUserId) {
      const { error } = await supabase.from("blocks").upsert({ blocker_id: authUserId, blocked_id: activeThread.otherUserId });
      if (error) {
        setToast(`Couldn't block this person: ${error.message}`);
        return;
      }
      await supabase.from("connections").update({ status: "blocked" }).eq("id", activeThread.id);
      setThreads((prev) => prev.filter((thread) => thread.id !== activeThread.id));
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
      private_bio: onboardDraft.privateBio.trim() || null,
    });
    if (error) {
      console.error("Could not save private profile:", error.message);
      setToast(`Profile couldn't be saved: ${error.message}`);
      return;
    }
    setConnectedProfile(onboardDraft);
    setHasOnboarded(true);
    setToast("Welcome to HeartLeak");
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
      private_bio: connectedDraft.privateBio.trim() || null,
    });
    if (error) {
      console.error("Could not update private profile:", error.message);
      setToast(`Profile couldn't be updated: ${error.message}`);
      return;
    }
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
    if (hasBannedWord(permanentDraft)) { setToast("Let's keep HeartLeak kind — please rephrase."); return; }
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
    if (hasBannedWord(composeText)) { setToast("Please rephrase to keep HeartLeak kind."); return; }

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
    setTimeout(() => {
      setOpenerResults(buildOpeners(openerForm));
      setIsGeneratingOpeners(false);
    }, 550);
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
            <p className="font-semibold text-[18px] mt-3" style={{ color: DARKTEXT }}>Welcome to HeartLeak</p>
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
              <label className="text-[12px] font-medium mb-1 flex items-center gap-1.5" style={{ color: DARKMUTED }}><EyeOff size={12} /> Private thoughts (only you can see this)</label>
              <textarea value={onboardDraft.privateBio} onChange={(e) => handlePrivateBioChange(e, setOnboardDraft)} rows={3} placeholder="Unjudged, unfiltered — whatever you want to keep just for yourself"
                className="w-full rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
              <p className="text-[11px] mt-1 text-right" style={{ color: DARKMUTED }}>{wordCount(onboardDraft.privateBio)}/{BIO_WORD_LIMIT} words</p>
            </div>
          </div>

          <button onClick={completeOnboarding}
            className="mt-4 w-full py-3 rounded-xl font-medium text-sm active:scale-[0.98] transition flex items-center justify-center gap-2" style={{ background: logoGradient(), color: "#fff", boxShadow: `0 6px 16px ${LOGO_PURPLE}44` }}>
            Continue
          </button>
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
          <p className="text-[13px] mb-6" style={{ color: MUTED }}>Everything you shared on HeartLeak is gone. We're sorry to see you go.</p>
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
              <span className="font-bold text-[15px] tracking-tight" style={{ color: darkMode ? DARKTEXT : CHARCOAL }}>HeartLeak</span>
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
            {[...posts].sort((a, b) => (b.isPermanent ? 1 : 0) - (a.isPermanent ? 1 : 0)).map((p) => {
              const m = MOODS[p.mood]; const MIcon = m.Icon; const t = threadForPost(p.id);
              const myReplies = p.isMine ? repliesForPost(p.id) : [];
              const dur = DURATIONS.find((d) => d.key === p.duration) || DURATIONS[3];
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
                  <button onClick={() => setOpenerResults(buildOpeners(openerForm))}
                    className="text-[11.5px] font-medium px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition shrink-0"
                    style={{ backgroundColor: CHARCOAL + "0F", color: CHARCOAL }}>
                    <RefreshCw size={12} /> 3 aur banao
                  </button>
                </div>
                {openerResults.map((o, i) => (
                  <div key={i} className="rounded-2xl bg-white p-4" style={{ border: `1px solid ${MUTED}1F`, boxShadow: "0 2px 10px rgba(58,46,42,0.05)" }}>
                    <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "#B8860B" }}>{o.style}</span>
                    <div className="mt-2 mb-2.5 rounded-2xl rounded-bl-md px-4 py-3 text-[14.5px] font-medium leading-relaxed" style={{ background: gradient(AMBER), color: "#4A3708" }}>
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
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: gradient(n.type === "connected" ? TEAL : n.type === "friend_request" ? AMBER : CORAL), boxShadow: glow(n.type === "connected" ? TEAL : n.type === "friend_request" ? AMBER : CORAL, "33") }}>
                  {n.type === "friend_request" ? <UserPlus size={14} color="#fff" /> : n.type === "reached_post" ? <MessageCircle size={14} color="#fff" /> : <Bell size={14} color="#fff" />}
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

                {daysSinceSignup < 2 && (
                  <div className="rounded-2xl p-4 bg-white mb-4" style={{ border: `1px solid ${MUTED}22` }}>
                    <p className="font-semibold text-[14px] mb-3" style={{ color: CHARCOAL }}>How HeartLeak works</p>
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

                  {/* private, unjudged thoughts — 300 word cap */}
                  <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: DARKSURFACE, border: `1px solid ${DARKBORDER}` }}>
                    <p className="font-semibold text-[14px] mb-2 flex items-center gap-1.5" style={{ color: DARKTEXT }}><EyeOff size={13} style={{ color: LOGO_PURPLE }} /> Private, unjudged thoughts</p>
                    {editingConnectedProfile ? (
                      <>
                        <textarea value={connectedDraft.privateBio} onChange={(e) => handlePrivateBioChange(e, setConnectedDraft)} rows={4} placeholder="Only you can see this"
                          className="w-full rounded-lg p-2.5 text-[13px] outline-none" style={{ backgroundColor: DARKBG, border: `1px solid ${DARKBORDER}`, color: DARKTEXT }} />
                        <p className="text-[11px] mt-1.5 text-right" style={{ color: DARKMUTED }}>{wordCount(connectedDraft.privateBio)}/{BIO_WORD_LIMIT} words</p>
                      </>
                    ) : (
                      <p className="text-[13px] leading-relaxed flex items-start gap-1.5" style={{ color: connectedProfile.privateBio ? DARKTEXT : DARKMUTED }}>
                        <Lock size={11} className="mt-0.5 shrink-0" />
                        {connectedProfile.privateBio || "Only you can see this — nothing set yet."}
                      </p>
                    )}
                  </div>
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
                    HeartLeak never shows your real name to anyone until you and they both add each other back. You can block or report anyone from their profile page at any time.
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

              <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${MUTED}22` }}>
                <button onClick={() => setSettingsPanel(settingsPanel === "logout" ? null : "logout")} className="w-full px-4 py-3.5 flex items-center justify-between">
                  <span className="text-[13.5px] flex items-center gap-2.5" style={{ color: CHARCOAL }}><LogOut size={16} style={{ color: MUTED }} /> Log out</span>
                  <ChevronRight size={15} style={{ color: MUTED }} />
                </button>
                {settingsPanel === "logout" && (
                  <div className="px-4 pb-3.5 flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: MUTED }}>Log out of HeartLeak?</span>
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

              <div className="rounded-2xl bg-white overflow-hidden px-4 py-3.5" style={{ border: `1px dashed ${MUTED}44` }}>
                <p className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>PROTOTYPE TESTING (remove before launch)</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px]" style={{ color: CHARCOAL }}>Simulate account 2+ days old</span>
                  <button onClick={() => setDemoOldAccount((s) => !s)} className="w-10 h-6 rounded-full flex items-center px-0.5 transition" style={{ backgroundColor: demoOldAccount ? TEAL : MUTED + "55" }}>
                    <span className="w-5 h-5 rounded-full bg-white transition" style={{ marginLeft: demoOldAccount ? 16 : 0 }} />
                  </button>
                </div>
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
