// =============================================================
// FILE: src/components/TaskCard.js
//
// PURPOSE: Renders a single task as a visually rich card.
//
// COMPONENT TYPE: Presentational (with one callback prop)
//   - Receives:  { task, onToggleComplete, onEdit, onDelete }
//   - No useContext calls — zero awareness of global state
//   - This isolation means: if you change the global state shape,
//     you ONLY update the screen that passes props here. TaskCard
//     itself never needs to change.
//
// DATA FLOW INTO THIS COMPONENT:
//   TaskListScreen
//     → reads filteredTasks from context
//     → for each task, renders: <TaskCard task={t} onToggleComplete={...} />
//
// WHY ISOLATE CARDS FROM CONTEXT?
//   Testability: you can render <TaskCard task={mockTask} /> in a
//   test without wrapping in any providers.
//   Performance: React.memo() (added at bottom) prevents re-render
//   unless the specific `task` object reference changes.
// =============================================================

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

import { COLORS, CATEGORIES, PRIORITIES } from '../utils/constants';
import { getDeadlineStatus, formatDueDate, getDaysRemaining } from '../utils/dateHelpers';
import DeadlineBadge from './DeadlineBadge';

// ─────────────────────────────────────────────────────────────
// Props:
//   task             — the task object (full shape defined in TaskContext)
//   onToggleComplete — (taskId: string) => void
//   onEdit           — (task: object) => void — navigates to edit screen
//   onDelete         — (taskId: string) => void
// ─────────────────────────────────────────────────────────────
function TaskCard({ task, onToggleComplete, onEdit, onDelete }) {
  // ── DERIVE DISPLAY DATA FROM TASK PROPS ─────────────────
  // We compute everything we need for the UI here, at the top,
  // so the JSX below stays clean and declarative.

  // Find the priority config object so we can get its label + rank
  const priorityConfig = PRIORITIES.find(p => p.id === task.priority) || PRIORITIES[1];

  // Find the category config to get its emoji label
  const categoryConfig = CATEGORIES.find(c => c.id === task.category);
  const categoryLabel  = categoryConfig ? categoryConfig.label : task.category;

  // Run deadline logic (pure functions from dateHelpers.js)
  const deadlineStatus  = getDeadlineStatus(task.dueDate);
  const formattedDate   = formatDueDate(task.dueDate);
  const daysRemaining   = getDaysRemaining(task.dueDate);

  // Priority → left accent bar color
  const priorityAccentColor = PRIORITY_ACCENT_COLORS[task.priority] || COLORS.textMuted;

  // ── DELETE CONFIRMATION HANDLER ──────────────────────────
  // We show a native Alert before deleting — good UX practice.
  // The Alert is launched FROM the card, but the actual delete
  // is executed by calling `onDelete(task.id)`, which routes
  // up to the context's deleteTask() action.
  // This is the "Lift State Up" pattern: card doesn't manage state,
  // it delegates decisions upward.
  function handleDeletePress() {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(task.id),
        },
      ],
      { cancelable: true }
    );
  }

  return (
    // ── ROOT CONTAINER ───────────────────────────────────────
    // TouchableOpacity makes the whole card tappable (→ Edit screen).
    // activeOpacity: 0.85 gives a subtle press feedback.
    <TouchableOpacity
      style={[
        styles.card,
        task.isComplete && styles.cardComplete, // Dim completed tasks
      ]}
      onPress={() => onEdit(task)}
      activeOpacity={0.85}
    >
      {/* ── LEFT ACCENT BAR ─────────────────────────────────
          A colored vertical strip that visually maps to priority.
          Pure CSS — no extra component needed for this. */}
      <View style={[styles.priorityBar, { backgroundColor: priorityAccentColor }]} />

      {/* ── CARD BODY ────────────────────────────────────── */}
      <View style={styles.body}>

        {/* ── TOP ROW: Checkbox + Title + Actions ─────────── */}
        <View style={styles.topRow}>
          {/* CHECKBOX BUTTON
              Calls onToggleComplete — does not touch state directly. */}
          <TouchableOpacity
            style={[styles.checkbox, task.isComplete && styles.checkboxChecked]}
            onPress={() => onToggleComplete(task.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // Larger touch target
          >
            {task.isComplete && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          {/* TITLE
              numberOfLines={2} prevents a very long title from
              overflowing the card — handles the "long text" edge case. */}
          <Text
            style={[styles.title, task.isComplete && styles.titleComplete]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {task.title}
          </Text>

          {/* DELETE BUTTON */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeletePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── DESCRIPTION (optional) ──────────────────────── */}
        {/* Only renders if description exists — avoids empty space.
            This is a common conditional rendering pattern. */}
        {task.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        {/* ── META ROW: Category + Priority ───────────────── */}
        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{categoryLabel}</Text>
          </View>
          <View style={[styles.chip, { borderColor: priorityAccentColor }]}>
            <Text style={[styles.chipText, { color: priorityAccentColor }]}>
              {priorityConfig.label}
            </Text>
          </View>
        </View>

        {/* ── DUE DATE ROW ────────────────────────────────── */}
        {task.dueDate ? (
          <View style={styles.dueDateRow}>
            <Text style={styles.dueDateText}>🗓 {formattedDate}</Text>
            {/* DeadlineBadge is a pure component — we pass derived data,
                not the raw dueDate string, keeping it decoupled. */}
            <DeadlineBadge
              status={deadlineStatus}
              daysRemaining={daysRemaining}
            />
          </View>
        ) : null}

      </View>
    </TouchableOpacity>
  );
}

// Priority → accent color map (kept module-level, not inside component,
// so it's created once, not on every render)
const PRIORITY_ACCENT_COLORS = {
  high:   COLORS.accentDanger,
  medium: COLORS.accentWarning,
  low:    COLORS.accentSuccess,
};

// ── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    flexDirection:  'row',
    backgroundColor: COLORS.bgCard,
    borderRadius:   16,
    marginHorizontal: 16,
    marginVertical:   6,
    overflow:       'hidden',         // Clips the priority bar to card corners
    // Shadow (iOS)
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.3,
    shadowRadius:   8,
    // Shadow (Android)
    elevation: 6,
  },
  cardComplete: {
    opacity: 0.55, // Visually deemphasise completed tasks
  },
  priorityBar: {
    width: 5,
  },
  body: {
    flex:    1,
    padding: 14,
    gap:     8,  // Consistent vertical spacing between rows
  },
  topRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
  },
  checkbox: {
    width:        22,
    height:       22,
    borderRadius: 11,          // Perfect circle
    borderWidth:  2,
    borderColor:  COLORS.textMuted,
    justifyContent: 'center',
    alignItems:     'center',
    marginTop: 2,              // Align with first line of title text
    flexShrink: 0,             // Don't compress when title is long
  },
  checkboxChecked: {
    backgroundColor: COLORS.accentPrimary,
    borderColor:     COLORS.accentPrimary,
  },
  checkmark: {
    color:      '#FFF',
    fontSize:   13,
    fontWeight: '800',
  },
  title: {
    flex:       1,             // Takes remaining space between checkbox and delete btn
    color:      COLORS.textPrimary,
    fontSize:   15,
    fontWeight: '700',
    lineHeight: 21,
  },
  titleComplete: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  deleteBtn: {
    padding:    4,
    marginTop:  1,
  },
  deleteBtnText: {
    color:    COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    color:      COLORS.textSecondary,
    fontSize:   13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius:      20,
    borderWidth:        1,
    borderColor:        COLORS.textMuted,
  },
  chipText: {
    color:      COLORS.textSecondary,
    fontSize:   11,
    fontWeight: '600',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           8,
  },
  dueDateText: {
    color:    COLORS.textSecondary,
    fontSize: 12,
  },
});

// ── PERFORMANCE OPTIMISATION ─────────────────────────────────
// memo() wraps the component in a shallow comparison.
// TaskCard only re-renders if one of its props actually changes.
// In a FlatList with many tasks, this significantly reduces work.
//
// TRADE-OFF: memo() itself has a small cost (the comparison).
// For components that always change (e.g., a real-time clock),
// memo() would waste CPU. For list items that rarely change, it wins.
export default memo(TaskCard);
