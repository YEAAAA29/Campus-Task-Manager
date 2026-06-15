// =============================================================
// FILE: src/components/CategoryFilter.js
//
// PURPOSE: A horizontal scrollable row of filter tabs. Tapping
// a tab calls `setActiveCategory` from context, which triggers
// `filteredTasks` to recompute in the context via useMemo.
//
// COMPONENT TYPE: Lightly "Connected" Presentational
//   - Reads:   { categories, activeCategory, setActiveCategory }
//     directly from context (instead of prop drilling through
//     TaskListScreen). This is acceptable because CategoryFilter
//     is tightly coupled to the filtering concept — it would be
//     verbose to thread 3 props through the screen just to avoid
//     one context call.
//   - Manages: no local state
//
// TRADE-OFF TO MENTION:
//   Some teams enforce that ONLY screen-level components call
//   useContext, and all children receive props. This maximises
//   testability but increases prop drilling in deeper trees.
//   The pragmatic choice (used here) is: connect components
//   that are semantically inseparable from a context concept.
// =============================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { useTaskContext }  from '../context/TaskContext';
import { COLORS }          from '../utils/constants';

export default function CategoryFilter() {
  // Destructure only what this component needs.
  // Destructuring a subset (not the whole context) is important:
  // if other fields in the context change, this component won't
  // re-render because it didn't subscribe to them.
  // (NOTE: With React Context, any context value change re-renders
  //  all consumers regardless. This is why we useMemo the context
  //  value in TaskContext.js — to minimise spurious changes.)
  const { categories, activeCategory, setActiveCategory, taskCountByCategory } = useTaskContext();

  // useCallback memoises the onPress handler factory.
  // Without it, a new inline function is created per-render per-category
  // tab — which invalidates the memo() on each FilterTab child.
  const handleCategoryPress = useCallback((categoryId) => {
    setActiveCategory(categoryId);
  }, [setActiveCategory]);

  return (
    // ── CONTAINER ──────────────────────────────────────────
    // We wrap in a plain View so we can add a border-bottom separator
    // above the task list without putting it inside the ScrollView.
    <View style={styles.container}>
      {/* horizontal ScrollView creates the scrollable tab strip.
          showsHorizontalScrollIndicator={false} hides the scrollbar
          for a cleaner look. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Render one FilterTab per category.
            key={category.id} is required by React for list reconciliation.
            Using `id` (not index) means if the order of CATEGORIES
            changes, React won't destroy and recreate the wrong tabs. */}
        {categories.map(category => {
          // Look up the task count for this category.
          // For the 'all' tab, sum every value in the counts object.
          // For a specific category, read directly from the map.
          // The ?? 0 fallback handles categories with no tasks yet.
          const count = category.id === 'all'
            ? Object.values(taskCountByCategory).reduce((sum, n) => sum + n, 0)
            : (taskCountByCategory[category.id] ?? 0);

          return (
            <FilterTab
              key={category.id}
              label={category.label}
              count={count}
              isActive={category.id === activeCategory}
              onPress={() => handleCategoryPress(category.id)}
            />
          );
        })}
      </ScrollView>

      {/* Bottom separator line */}
      <View style={styles.separator} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// FilterTab — local sub-component (not exported)
//
// WHY A SUB-COMPONENT INSTEAD OF INLINE JSX?
//   It receives `isActive` as a prop and can be wrapped in
//   React.memo() independently. If `activeCategory` changes,
//   only the TWO tabs that changed (old active + new active)
//   re-render — not all 6 tabs.
// ─────────────────────────────────────────────────────────────
const FilterTab = React.memo(function FilterTab({ label, count, isActive, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tab, isActive && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tabInner}>
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
        {/* Count badge — only shown when count > 0.
            Rendering null when count is 0 avoids a floating "0"
            on categories the user hasn't used yet. */}
        {count > 0 && (
          <View style={[
            styles.countBadge,
            isActive ? styles.countBadgeActive : null,
          ]}>
            <Text style={[
              styles.countBadgeText,
              isActive ? styles.countBadgeTextActive : null,
            ]}>
              {count}
            </Text>
          </View>
        )}
      </View>
      {/* Active indicator dot under the label */}
      {isActive && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical:   12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:      20,
    backgroundColor:   COLORS.bgInput,
    alignItems:        'center',
  },
  tabActive: {
    backgroundColor: COLORS.accentPrimary,
  },
  tabInner: {
    // Row layout so label and badge sit side-by-side
    flexDirection: 'row',
    alignItems:    'center',
    gap:            6,
  },
  tabText: {
    color:      COLORS.textSecondary,
    fontSize:   13,
    fontWeight: '600',
  },
  tabTextActive: {
    color:      COLORS.textPrimary,
    fontWeight: '700',
  },
  // Count bubble — the small circular number pill
  countBadge: {
    minWidth:          18,
    height:            18,
    borderRadius:       9,   // Perfect circle for single digits
    backgroundColor:   COLORS.bgDark,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal:  5,
  },
  countBadgeActive: {
    // On active (purple) tab, use a white badge for contrast
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeText: {
    color:      COLORS.textSecondary,
    fontSize:   10,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: COLORS.textPrimary,
  },
  activeIndicator: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: COLORS.textPrimary,
    marginTop:       4,
  },
  separator: {
    height:          1,
    backgroundColor: COLORS.bgInput,
  },
});
