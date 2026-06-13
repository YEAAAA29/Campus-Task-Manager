// =============================================================
// FILE: src/utils/dateHelpers.js
// PURPOSE: Pure utility functions for all date/deadline logic.
//
// WHY PURE FUNCTIONS IN A SEPARATE FILE?
//   These functions have ZERO side effects — they take inputs,
//   return outputs, and never touch React state. This means:
//   1. They are trivially unit-testable (no mocking needed).
//   2. They can be reused from any screen or component.
//   3. Business logic stays OUT of the UI layer.
// =============================================================

import { DEADLINE_THRESHOLDS } from './constants';

// ─────────────────────────────────────────────────────────────
// getDeadlineStatus(dueDateString)
//
// WHAT IT DOES:
//   Takes an ISO date string (e.g. "2026-06-10T23:59:00"),
//   compares it to RIGHT NOW, and returns a status string.
//
// RETURNS: 'overdue' | 'urgent' | 'approaching' | 'normal'
//
// WHY THIS APPROACH:
//   Returning a string "status" rather than a boolean lets
//   callers use a simple switch/object-map for styling without
//   chaining multiple if-else blocks. Easier to extend later.
// ─────────────────────────────────────────────────────────────
export function getDeadlineStatus(dueDateString) {
  // Guard clause: if no due date is set, we have nothing to warn about.
  if (!dueDateString) return 'normal';

  // Date.now() returns current timestamp in milliseconds.
  // new Date(dueDateString).getTime() converts the stored string
  // to a comparable millisecond timestamp.
  const now = Date.now();
  const dueTime = new Date(dueDateString).getTime();

  // Calculate the difference: positive = time remaining, negative = overdue
  const msRemaining = dueTime - now;

  if (msRemaining < DEADLINE_THRESHOLDS.OVERDUE) {
    // dueTime is in the past
    return 'overdue';
  } else if (msRemaining <= DEADLINE_THRESHOLDS.URGENT) {
    // Due within the next 24 hours
    return 'urgent';
  } else if (msRemaining <= DEADLINE_THRESHOLDS.APPROACHING) {
    // Due within the next 3 days
    return 'approaching';
  }

  return 'normal';
}

// ─────────────────────────────────────────────────────────────
// formatDueDate(dueDateString)
//
// WHAT IT DOES:
//   Converts an ISO date string into a human-readable label
//   like "Mon, Jun 10 · 11:59 PM".
//
// WHY NOT USE A LIBRARY (like moment.js)?
//   The Intl.DateTimeFormat API is built into JavaScript —
//   no extra package weight, no version maintenance. For an
//   internship project, demonstrating native API knowledge
//   is a stronger signal than adding dependencies.
// ─────────────────────────────────────────────────────────────
export function formatDueDate(dueDateString) {
  if (!dueDateString) return 'No due date';

  const date = new Date(dueDateString);

  // Intl.DateTimeFormat is the modern, locale-aware way to
  // format dates without external libraries.
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', // "Mon"
    month:   'short', // "Jun"
    day:     'numeric', // "10"
  });

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour:   'numeric',
    minute: '2-digit',
    hour12: true, // "11:59 PM"
  });

  return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
}

// ─────────────────────────────────────────────────────────────
// getDaysRemaining(dueDateString)
//
// WHAT IT DOES:
//   Returns a signed integer representing days until deadline.
//   Negative numbers mean the task is overdue.
//
// EXAMPLE: -2 means "2 days overdue", +5 means "5 days left"
// ─────────────────────────────────────────────────────────────
export function getDaysRemaining(dueDateString) {
  if (!dueDateString) return null;

  const now = Date.now();
  const dueTime = new Date(dueDateString).getTime();
  const msRemaining = dueTime - now;

  // Math.ceil ensures we round "up" — e.g. 25.1 hours = 2 days
  // (showing 1 would be misleading). For negative (overdue),
  // Math.ceil(-1.5) = -1, which correctly shows "-1 day".
  return Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
}
