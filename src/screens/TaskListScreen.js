// =============================================================
// FILE: src/screens/TaskListScreen.js
//
// PURPOSE: The main screen. Orchestrates the list view.
//
// COMPONENT TYPE: "Smart" / Container
//   - Reads from context (filteredTasks, etc.)
//   - Passes handlers down to TaskCard as props
//   - Delegates navigation to AddEditTaskScreen
//
// THIS SCREEN'S RESPONSIBILITIES:
//   1. Read filtered tasks from context
//   2. Render the category filter bar (via CategoryFilter)
//   3. Render the task list (via FlatList + TaskCard)
//   4. Handle the empty state (no tasks)
//   5. Provide the "Add Task" FAB (floating action button)
//   6. Wire up navigation to the Add/Edit screen
//
// DATA FLOW:
//   TaskContext → filteredTasks, toggleComplete, deleteTask
//       ↓
//   TaskListScreen (reads context, coordinates components)
//       ↓
//   FlatList → renders TaskCard for each task
//       ↓
//   TaskCard (pure UI, receives task + callbacks as props)
// =============================================================

import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,          // Step 3: used for grouped 'All Tasks' view
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

import { useTaskContext }  from '../context/TaskContext';
import { COLORS, PRIORITIES } from '../utils/constants';
import TaskCard            from '../components/TaskCard';
import CategoryFilter      from '../components/CategoryFilter';
import CategorySummaryCard from '../components/CategorySummaryCard'; // Step 3

export default function TaskListScreen({ navigation }) {
  // Read from context — now including categorySections for Step 3
  const { filteredTasks, categorySections, activeCategory, toggleComplete, deleteTask } = useTaskContext();

  // ── NAVIGATION: Configure header button ───────────────
  // useEffect with [navigation] dependency runs once on mount.
  // We use navigation.setOptions() to add a header button WITHOUT
  // re-creating the entire Stack.Screen definition.
  //
  // WHY NOT USE options={{ headerRight }} on Stack.Screen in App.js?
  //   Because the button needs access to the `navigation` object
  //   which is only available inside the screen component.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={headerStyles.addBtn}
          onPress={() => navigation.navigate('AddEditTask', { task: null })}
        >
          <Text style={headerStyles.addBtnText}>＋ New</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // ── SECTION HEADERS (for SectionList in 'all' mode) ──────
  // When the user is in 'all' mode, we render a SectionList
  // instead of a FlatList. SectionList requires a `renderSectionHeader`
  // function that returns the header JSX for each section.
  //
  // WHY SWITCH COMPONENTS based on activeCategory?
  //   SectionList is slightly heavier than FlatList — it has to
  //   manage section indices and sticky header logic. When viewing
  //   a single category, there's only one group of items, so
  //   the grouping overhead is pointless. FlatList is the right tool.
  //   This conditional switch is a deliberate performance trade-off.
  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
      </View>
    </View>
  ), []);

  // sortedSections: apply the same sort logic to each section's data
  // so tasks within each category also appear High → Medium → Low.
  const sortedSections = useMemo(() => {
    return categorySections.map(section => ({
      ...section,
      data: [...section.data].sort((a, b) => {
        if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
        const rankA = PRIORITIES.find(p => p.id === a.priority)?.rank ?? 99;
        const rankB = PRIORITIES.find(p => p.id === b.priority)?.rank ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }),
    }));
  }, [categorySections]);

  // FlatList uses the same source but as a flat sorted array
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // Completed tasks always sink to bottom
      if (a.isComplete !== b.isComplete) {
        return a.isComplete ? 1 : -1;
      }

      // Among incomplete: sort by priority rank (lower = higher priority)
      const rankA = PRIORITIES.find(p => p.id === a.priority)?.rank ?? 99;
      const rankB = PRIORITIES.find(p => p.id === b.priority)?.rank ?? 99;
      if (rankA !== rankB) return rankA - rankB;

      // Same priority: sort by due date (soonest first)
      // null due dates go to the end
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [filteredTasks]);

  // ── TASK CARD HANDLERS ────────────────────────────────
  // These are passed as props to TaskCard. useCallback prevents
  // them from being recreated on every render.
  //
  // WHY NOT PASS context functions directly to TaskCard?
  //   We could. But if we ever need to add logic before the context
  //   call (e.g., logging, analytics), this wrapper is the right place.
  //   It also makes TaskCard's props interface cleaner — TaskCard
  //   doesn't need to know about navigation either.
  const handleToggleComplete = useCallback((taskId) => {
    toggleComplete(taskId);
  }, [toggleComplete]);

  const handleDelete = useCallback((taskId) => {
    deleteTask(taskId);
  }, [deleteTask]);

  const handleEdit = useCallback((task) => {
    // Navigate to AddEditTask, passing the task object as a route param.
    // The receiving screen uses route.params.task to pre-fill the form.
    navigation.navigate('AddEditTask', { task });
  }, [navigation]);

  // ── FLATLIST renderItem ──────────────────────────────
  // This function is called by FlatList for each item.
  // useCallback is essential here: without it, FlatList's internal
  // optimisations (like windowSize) can't prevent unnecessary re-renders
  // because the renderItem prop changes reference every render.
  const renderTask = useCallback(({ item }) => (
    <TaskCard
      task={item}
      onToggleComplete={handleToggleComplete}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ), [handleToggleComplete, handleEdit, handleDelete]);

  // FlatList requires a stable keyExtractor.
  // Using task.id (not array index) ensures React Native correctly
  // animates add/remove/reorder operations without visual glitches.
  const keyExtractor = useCallback((item) => item.id, []);

  // ── SUMMARY STATS (shown in header) ──────────────────
  const completedCount = filteredTasks.filter(t => t.isComplete).length;
  const totalCount     = filteredTasks.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* ── STATS HEADER ─────────────────────────────── */}
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {completedCount}/{totalCount} tasks completed
          </Text>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  // Compute width as a percentage. Math.max prevents
                  // a 0/0 division giving NaN, which would crash the layout.
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* ── CATEGORY FILTER BAR ──────────────────────── */}
        <CategoryFilter />

        {/* ── CATEGORY SUMMARY CARD (Step 3) ────────
            Only shown in 'all' mode. In single-category view
            it's redundant — the filter already scopes the list. */}
        {activeCategory === 'all' && <CategorySummaryCard />}

        {/* ── TASK LIST ──────────────────────────────────
            Conditionally render SectionList (grouped, 'all' mode)
            or FlatList (single category mode). Both share the same
            renderItem, keyExtractor, and performance props. */}
        {activeCategory === 'all' ? (
          <SectionList
            sections={sortedSections}
            renderItem={renderTask}
            keyExtractor={keyExtractor}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState />}
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            stickySectionHeadersEnabled={false} // Sticky headers are distracting here
            ListFooterComponent={<View style={{ height: 80 }} />}
          />
        ) : (
          <FlatList
            data={sortedTasks}
            renderItem={renderTask}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState />}
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={5}
            ListFooterComponent={<View style={{ height: 80 }} />}
          />
        )}

        {/* ── FLOATING ACTION BUTTON (FAB) ─────────────── */}
        {/* Fixed-position "Add Task" button — always accessible */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddEditTask', { task: null })}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// EmptyState — shown when filteredTasks is empty
// Isolated as its own component for readability.
// ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>📭</Text>
      <Text style={emptyStyles.title}>No tasks here</Text>
      <Text style={emptyStyles.subtitle}>
        Tap the ＋ button to add your first task, or switch categories above.
      </Text>
    </View>
  );
}

// ── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  statsBar: {
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   COLORS.bgCard,
    gap: 8,
  },
  statsText: {
    color:    COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    height:       4,
    borderRadius: 2,
    backgroundColor: COLORS.bgInput,
    overflow: 'hidden',
  },
  progressFill: {
    height:          4,
    borderRadius:    2,
    backgroundColor: COLORS.accentPrimary,
  },
  listContent: {
    paddingTop: 8,
  },

  // ── Section header styles (Step 3 — SectionList) ──────────
  // The header row that appears above each category group
  // in the 'All Tasks' view.
  sectionHeader: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 20,
    paddingTop:        18,
    paddingBottom:      6,
  },
  sectionHeaderText: {
    color:       COLORS.textSecondary,
    fontSize:    12,
    fontWeight:  '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // Small task-count pill next to the section title
  sectionBadge: {
    backgroundColor:  COLORS.bgInput,
    borderRadius:     10,
    paddingHorizontal: 8,
    paddingVertical:   2,
  },
  sectionBadgeText: {
    color:      COLORS.textMuted,
    fontSize:   11,
    fontWeight: '600',
  },
  fab: {
    position:        'absolute',
    bottom:          28,
    right:           20,
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: COLORS.accentPrimary,
    justifyContent:  'center',
    alignItems:      'center',
    // Elevation for Android
    elevation: 8,
    // Shadow for iOS
    shadowColor:   '#6C63FF',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius:  8,
  },
  fabText: {
    color:    COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2, // Optical alignment
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color:      COLORS.textPrimary,
    fontSize:   20,
    fontWeight: '700',
  },
  subtitle: {
    color:     COLORS.textSecondary,
    fontSize:  14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// Header button styles — kept separate to avoid polluting main StyleSheet
const headerStyles = StyleSheet.create({
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical:    6,
    borderRadius:      20,
    backgroundColor:   COLORS.accentPrimary,
    marginRight:       4,
  },
  addBtnText: {
    color:      COLORS.textPrimary,
    fontWeight: '700',
    fontSize:   14,
  },
});
