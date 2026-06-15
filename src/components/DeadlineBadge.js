// =============================================================
// FILE: src/components/DeadlineBadge.js
//
// PURPOSE: A pure presentational component that visually signals
// how urgent a task's deadline is. It has NO logic — it receives
// a `status` string as a prop and maps it to colors + label.
//
// COMPONENT TYPE: "Dumb" / Presentational
//   - Receives: props only
//   - Manages: no state whatsoever
//   - Side effects: none
//   This is the ideal design for leaf-level UI atoms.
//   Easier to test, easier to reuse, easier to restyle.
//
// DATA FLOW:
//   getDeadlineStatus(task.dueDate)      ← called in TaskCard
//         │
//         ▼ returns 'urgent' | 'overdue' | 'approaching' | 'normal'
//   <DeadlineBadge status="urgent" daysRemaining={1} />
//         │
//         ▼ renders colored pill with matching text
// =============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

// STATUS_CONFIG maps each deadline status to a visual style.
// Using an object map instead of if/else chains is faster to
// read and trivial to extend — add a new status, add one entry.
const STATUS_CONFIG = {
  overdue: {
    backgroundColor: COLORS.accentDanger,   // Red
    textColor:       '#FFFFFF',
    icon:            '🚨',
    label:           'OVERDUE',
  },
  urgent: {
    backgroundColor: COLORS.accentWarning,  // Amber
    textColor:       '#1A1A1A',             // Dark text on light bg for contrast
    icon:            '⚡',
    label:           'DUE SOON',
  },
  approaching: {
    backgroundColor: '#3A3A5C',             // Subtle purple-grey
    textColor:       COLORS.accentPrimary,  // Purple text
    icon:            '📅',
    label:           'UPCOMING',
  },
  normal: null,  // `null` means we render nothing — no badge needed
};

// ─────────────────────────────────────────────────────────────
// Props:
//   status       — string: 'overdue' | 'urgent' | 'approaching' | 'normal'
//   daysRemaining — number | null: signed int from getDaysRemaining()
// ─────────────────────────────────────────────────────────────
export default function DeadlineBadge({ status, daysRemaining }) {
  // Look up the config for this status
  const config = STATUS_CONFIG[status];

  // If no config (status is 'normal' or unknown), render nothing.
  // Returning null is valid React — it renders no DOM node at all.
  if (!config) return null;

  // Build a human-readable days label
  const daysLabel = buildDaysLabel(daysRemaining);

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
      {daysLabel ? (
        <Text style={[styles.daysText, { color: config.textColor }]}>
          {daysLabel}
        </Text>
      ) : null}
    </View>
  );
}

// ── HELPER (local to this file — not exported) ───────────────
// Builds the subtitle string. Kept out of JSX for readability.
// Negative daysRemaining means overdue.
function buildDaysLabel(days) {
  if (days === null || days === undefined) return '';
  if (days < 0)  return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',        // Icon + label + days sit side by side
    alignItems:     'center',
    alignSelf:      'flex-start', // Don't stretch to full width
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:   20,           // Pill shape
    gap: 4,                       // Space between icon, label, days
    marginTop: 6,
  },
  icon: {
    fontSize: 11,
  },
  label: {
    fontSize:    10,
    fontWeight:  '800',           // Extra-bold for urgency
    letterSpacing: 0.5,
  },
  daysText: {
    fontSize:  10,
    fontWeight: '500',
    opacity:    0.8,
  },
});
