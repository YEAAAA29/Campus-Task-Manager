// =============================================================
// FILE: src/utils/constants.js
// PURPOSE: Single source of truth for all app-wide static data.
//
// WHY A SEPARATE FILE?
//   If you ever rename a category (e.g. "CS101" → "Algorithms"),
//   you change it in ONE place. Every file that imports from here
//   updates automatically. This is the DRY principle.
// =============================================================

// ── TASK CATEGORIES ──────────────────────────────────────────
// Each object has an `id` (used internally as a key) and a
// `label` (shown to the user). Adding a new course is a
// one-line change here — no other file needs to be touched.
export const CATEGORIES = [
  { id: 'all',       label: '📋 All Tasks'   },
  { id: 'cs',        label: '💻 Computer Science' },
  { id: 'math',      label: '📐 Mathematics' },
  { id: 'physics',   label: '⚛️  Physics'     },
  { id: 'english',   label: '📝 English'      },
  { id: 'elective',  label: '🎯 Elective'     },
];

// ── PRIORITY LEVELS ──────────────────────────────────────────
// Used both for UI display (label) and business logic (urgency
// ranking during sort). `rank` is a numeric sort key: lower = higher priority.
export const PRIORITIES = [
  { id: 'high',   label: '🔴 High',   rank: 1 },
  { id: 'medium', label: '🟡 Medium', rank: 2 },
  { id: 'low',    label: '🟢 Low',    rank: 3 },
];

// ── DEADLINE THRESHOLDS (in milliseconds) ────────────────────
// Used in dateHelpers.js to classify how urgent a deadline is.
// Keeping them here as named constants prevents "magic numbers"
// scattered across the codebase — a common code quality concern.
export const DEADLINE_THRESHOLDS = {
  OVERDUE:      0,                   // Past current time
  URGENT:       24 * 60 * 60 * 1000, // Within 24 hours (1 day)
  APPROACHING:  3  * 24 * 60 * 60 * 1000, // Within 3 days
};

// ── UI COLOR TOKENS ──────────────────────────────────────────
// Centralising colors prevents "style drift" where the same
// semantic concept (e.g., "danger") gets different hex values
// across different files.
export const COLORS = {
  // Backgrounds
  bgDark:        '#0F1117',
  bgCard:        '#1A1D2E',
  bgInput:       '#252836',

  // Accent
  accentPrimary: '#6C63FF',  // Purple — primary brand color
  accentSuccess: '#4CAF50',  // Green
  accentWarning: '#FFC107',  // Amber
  accentDanger:  '#FF5252',  // Red

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#A0A3B1',
  textMuted:     '#5C5F70',
};
