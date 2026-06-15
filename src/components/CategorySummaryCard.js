// =============================================================
// FILE: src/components/CategorySummaryCard.js
//
// PURPOSE: A collapsible banner at the top of the task list
// that gives the user an at-a-glance overview of which subject
// has the most urgent/overdue work.
//
// COMPONENT TYPE: Connected presentational.
//   - Reads: categorySections, taskCountByCategory from context
//   - Manages: one piece of local state: `isExpanded` (boolean)
//     WHY LOCAL STATE here and not in context?
//     Because "is this card expanded" is purely a UI preference
//     for THIS component. No other screen cares about it. Putting
//     transient UI state in global context is an anti-pattern —
//     it pollutes the global store with display-layer concerns.
//
// DATA FLOW:
//   TaskContext → categorySections (already grouped + counted)
//       ↓
//   CategorySummaryCard computes urgency per section
//       ↓
//   Renders a collapsible list of category stats
// =============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation, // Animates layout changes on iOS/Android without Animated API
  Platform,
  UIManager,
} from 'react-native';

import { useTaskContext } from '../context/TaskContext';
import { COLORS }         from '../utils/constants';
import { getDeadlineStatus } from '../utils/dateHelpers';

// LayoutAnimation requires this flag on Android to enable smooth
// expand/collapse animations. On iOS it works automatically.
// This is a common React Native gotcha — safe to explain in eval.
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function CategorySummaryCard() {
  const { categorySections } = useTaskContext();

  // ── LOCAL UI STATE ──────────────────────────────────────────
  // isExpanded controls whether the card shows all categories
  // or just the most urgent one. Default: collapsed.
  const [isExpanded, setIsExpanded] = useState(false);

  // ── COMPUTE URGENCY SCORES PER CATEGORY ──────────────────
  // For each category section, we count how many tasks are
  // overdue or urgent. The category with the highest count
  // is the one we highlight in collapsed mode.
  //
  // WHY useMemo HERE?
  //   categorySections changes only when tasks change.
  //   getDeadlineStatus() runs for every task in every section
  //   on every render — without useMemo this is pure waste.
  const categoryStats = useMemo(() => {
    return categorySections.map(section => {
      let overdueCount    = 0;
      let urgentCount     = 0;
      let completedCount  = 0;

      section.data.forEach(task => {
        if (task.isComplete) {
          completedCount++;
          return; // Skip deadline checks for completed tasks
        }
        const status = getDeadlineStatus(task.dueDate);
        if (status === 'overdue')  overdueCount++;
        if (status === 'urgent')   urgentCount++;
      });

      const totalCount = section.data.length;

      // urgencyScore is used to sort categories: overdue counts
      // double (more critical) + urgent counts once.
      const urgencyScore = (overdueCount * 2) + urgentCount;

      return {
        key:           section.key,
        title:         section.title,
        totalCount,
        completedCount,
        overdueCount,
        urgentCount,
        urgencyScore,
        completionRate: totalCount > 0 ? completedCount / totalCount : 0,
      };
    });
    // Sort by urgency descending: most urgent category first
  }, [categorySections]).sort((a, b) => b.urgencyScore - a.urgencyScore);

  // Nothing to show if there are no tasks at all
  if (categoryStats.length === 0) return null;

  // In collapsed mode we only show the top-urgency category.
  // In expanded mode we show all.
  const visibleStats = isExpanded ? categoryStats : categoryStats.slice(0, 1);

  // Toggle with smooth animation
  function handleToggle() {
    // LayoutAnimation.easeInEaseOut() tells React Native:
    // "on the next layout change, animate all view size/position
    // transitions automatically." No manual Animated API needed.
    LayoutAnimation.easeInEaseOut();
    setIsExpanded(prev => !prev);
  }

  return (
    <View style={styles.card}>
      {/* ── HEADER ROW ──────────────────────────────────── */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>📊 Category Overview</Text>
        {/* Chevron rotates to indicate expand/collapse state */}
        <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* ── CATEGORY ROWS ───────────────────────────────── */}
      {visibleStats.map(stat => (
        <CategoryStatRow key={stat.key} stat={stat} />
      ))}

      {/* ── EXPAND TOGGLE (only shown when more than 1 category) */}
      {categoryStats.length > 1 && (
        <TouchableOpacity style={styles.expandBtn} onPress={handleToggle}>
          <Text style={styles.expandBtnText}>
            {isExpanded
              ? 'Show less ▲'
              : `Show ${categoryStats.length - 1} more ▼`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// CategoryStatRow — renders stats for one category
// Extracted as its own component for clarity and potential
// future memoization.
// ─────────────────────────────────────────────────────────────
function CategoryStatRow({ stat }) {
  // Build the urgency label shown on the right side
  const urgencyLabel = buildUrgencyLabel(stat.overdueCount, stat.urgentCount);
  const urgencyColor = stat.overdueCount > 0
    ? COLORS.accentDanger    // Red if any overdue
    : stat.urgentCount > 0
      ? COLORS.accentWarning // Amber if any urgent
      : COLORS.accentSuccess; // Green if all clear

  return (
    <View style={styles.statRow}>
      {/* Left: category title */}
      <Text style={styles.statTitle} numberOfLines={1}>{stat.title}</Text>

      {/* Middle: completion progress bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            { width: `${stat.completionRate * 100}%` },
          ]} />
        </View>
        <Text style={styles.progressText}>
          {stat.completedCount}/{stat.totalCount}
        </Text>
      </View>

      {/* Right: urgency indicator */}
      {urgencyLabel ? (
        <Text style={[styles.urgencyLabel, { color: urgencyColor }]}>
          {urgencyLabel}
        </Text>
      ) : (
        <Text style={[styles.urgencyLabel, { color: COLORS.accentSuccess }]}>
          ✓ clear
        </Text>
      )}
    </View>
  );
}

// Builds a compact urgency string, e.g. "2 overdue", "1 urgent"
function buildUrgencyLabel(overdueCount, urgentCount) {
  if (overdueCount > 0) return `${overdueCount} overdue`;
  if (urgentCount  > 0) return `${urgentCount} urgent`;
  return null;
}

// ── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 16,
    marginTop:        10,
    marginBottom:      4,
    borderRadius:     16,
    overflow:         'hidden',
    // Subtle left border accent
    borderLeftWidth:  4,
    borderLeftColor:  COLORS.accentPrimary,
    // Shadow
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.2,
    shadowRadius:   6,
    elevation:      4,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgInput,
  },
  headerTitle: {
    color:      COLORS.textPrimary,
    fontSize:   14,
    fontWeight: '700',
  },
  chevron: {
    color:    COLORS.textMuted,
    fontSize: 11,
  },
  statRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 14,
    paddingVertical:   10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgInput,
  },
  statTitle: {
    color:    COLORS.textSecondary,
    fontSize: 12,
    width:    90,          // Fixed width keeps columns aligned
    flexShrink: 0,
  },
  progressWrapper: {
    flex:          1,       // Takes remaining space
    flexDirection: 'row',
    alignItems:    'center',
    gap:            6,
  },
  progressTrack: {
    flex:            1,
    height:          4,
    borderRadius:    2,
    backgroundColor: COLORS.bgInput,
    overflow:        'hidden',
  },
  progressFill: {
    height:          4,
    borderRadius:    2,
    backgroundColor: COLORS.accentPrimary,
  },
  progressText: {
    color:    COLORS.textMuted,
    fontSize: 10,
    width:    28,           // Fixed width prevents layout shift
    textAlign: 'right',
  },
  urgencyLabel: {
    fontSize:   11,
    fontWeight: '700',
    width:      60,         // Fixed width for alignment
    textAlign:  'right',
  },
  expandBtn: {
    paddingVertical:   10,
    alignItems:        'center',
  },
  expandBtnText: {
    color:    COLORS.accentPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
