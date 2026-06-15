// =============================================================
// FILE: src/screens/AddEditTaskScreen.js
//
// PURPOSE: A dual-mode form screen. In "Add" mode it creates a
// new task; in "Edit" mode it pre-fills from the existing task.
//
// HOW THE MODE IS DETERMINED:
//   This screen is navigated to with:
//     navigation.navigate('AddEditTask', { task: null })   → Add mode
//     navigation.navigate('AddEditTask', { task: existingTask }) → Edit mode
//   The `route.params.task` being null or an object is the flag.
//
// LOCAL STATE STRATEGY:
//   This screen uses useState for form fields — NOT useReducer.
//   WHY? Each field is independent. There are no complex transitions
//   between fields. useState(initialValue) per field is the right
//   tool here and keeps the code simple.
//
// DATA FLOW (Add Mode):
//   User fills form → presses Save → handleSave() → addTask(formData)
//   → TaskContext reducer → new task in state.tasks → TaskListScreen re-renders
//
// DATA FLOW (Edit Mode):
//   route.params.task → useState initialValues → user edits → editTask()
// =============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTaskContext }        from '../context/TaskContext';
import { COLORS, CATEGORIES, PRIORITIES } from '../utils/constants';

export default function AddEditTaskScreen({ navigation, route }) {
  // ── DETERMINE MODE ─────────────────────────────────────
  // route.params is set when navigating to this screen.
  // Optional chaining (?.) safely handles the case where
  // no params were passed at all.
  const existingTask = route.params?.task ?? null;
  const isEditMode   = existingTask !== null;

  // ── CONTEXT ────────────────────────────────────────────
  const { addTask, editTask } = useTaskContext();

  // ── LOCAL FORM STATE ───────────────────────────────────
  // Each field is its own useState call.
  // INITIAL VALUES: In edit mode, pre-fill from existingTask.
  //                 In add mode, use sensible defaults.
  const [title,       setTitle]       = useState(existingTask?.title       ?? '');
  const [description, setDescription] = useState(existingTask?.description ?? '');
  const [category,    setCategory]    = useState(existingTask?.category    ?? 'cs');
  const [priority,    setPriority]    = useState(existingTask?.priority    ?? 'medium');
  const [dueDate,     setDueDate]     = useState(existingTask?.dueDate     ?? null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── HEADER TITLE ───────────────────────────────────────
  // We dynamically set the navigator header title based on mode.
  // This useEffect runs once (on mount) since navigation and isEditMode
  // don't change during this screen's lifecycle.
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? '✏️ Edit Task' : '➕ New Task',
    });
  }, [navigation, isEditMode]);

  // ── DATE PICKER HANDLER ──────────────────────────────
  const handleDateChange = useCallback((event, selectedDate) => {
    // On Android, the picker closes immediately after selecting a date
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      // Set time to end of day (11:59 PM) so the whole day counts
      selectedDate.setHours(23, 59, 0, 0);
      setDueDate(selectedDate.toISOString());
    }
  }, []);

  // ── VALIDATION ─────────────────────────────────────────
  // Simple, explicit validation. Returns an error string or null.
  function validate() {
    if (!title.trim()) {
      return 'Task title is required.';
    }
    if (title.trim().length > 120) {
      return 'Title must be 120 characters or fewer.';
    }
    return null; // null = no errors
  }

  // ── SAVE HANDLER ───────────────────────────────────────
  const handleSave = useCallback(() => {
    const error = validate();
    if (error) {
      // Alert.alert() is React Native's built-in modal dialog.
      // Using it for validation errors keeps the UX native and
      // doesn't require any extra UI state (like an error banner).
      Alert.alert('Cannot Save', error, [{ text: 'OK' }]);
      return;
    }

    const taskData = {
      title:       title.trim(),
      description: description.trim(),
      category,
      priority,
      dueDate,
    };

    if (isEditMode) {
      // In edit mode, we MUST pass the existing id so the reducer
      // knows which task to update (EDIT_TASK action uses id to find it).
      editTask({ ...taskData, id: existingTask.id });
    } else {
      // In add mode, the id is generated inside addTask() (in context)
      addTask(taskData);
    }

    // Return to the previous screen (TaskListScreen)
    navigation.goBack();
  }, [title, description, category, priority, dueDate, isEditMode]);

  // ── RENDER ─────────────────────────────────────────────
  return (
    // KeyboardAvoidingView pushes the form up when the software
    // keyboard appears, so text inputs aren't hidden.
    // `behavior` differs by platform — a common React Native gotcha.
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" // Taps on buttons while keyboard is open work correctly
      >

        {/* ── TITLE FIELD ─────────────────────────────── */}
        <FormField label="Task Title *">
          <TextInput
            style={styles.input}
            placeholder="e.g. Submit Lab Report"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={120}           // Hard limit — enforced by the input itself
            returnKeyType="next"      // Shows "Next" on keyboard instead of "Done"
            autoFocus={!isEditMode}   // Focus automatically in Add mode
          />
          {/* Character counter — shows when user is close to the limit */}
          {title.length > 80 && (
            <Text style={styles.charCount}>{title.length}/120</Text>
          )}
        </FormField>

        {/* ── DESCRIPTION FIELD ───────────────────────── */}
        <FormField label="Description (optional)">
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Add more details..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline              // Allows line breaks
            numberOfLines={3}
            textAlignVertical="top" // Android: start text at top of multiline input
          />
        </FormField>

        {/* ── CATEGORY SELECTOR ───────────────────────── */}
        <FormField label="Category">
          {/* We filter out the 'all' tab — it's not a real category to assign */}
          <OptionGroup
            options={CATEGORIES.filter(c => c.id !== 'all')}
            selected={category}
            onSelect={setCategory}
            accentColor={COLORS.accentPrimary}
          />
        </FormField>

        {/* ── PRIORITY SELECTOR ───────────────────────── */}
        <FormField label="Priority">
          <OptionGroup
            options={PRIORITIES}
            selected={priority}
            onSelect={setPriority}
            accentColor={PRIORITY_COLOR_MAP[priority]}
          />
        </FormField>

        {/* ── DUE DATE FIELD ──────────────────────────── */}
        <FormField label="Due Date (optional)">
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[
                styles.dateButton,
                dueDate ? styles.dateButtonActive : null
              ]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dateButtonText,
                dueDate ? styles.dateButtonTextActive : null
              ]}>
                {dueDate 
                  ? `📅 ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` 
                  : '📅 Set Due Date'}
              </Text>
            </TouchableOpacity>

            {dueDate && (
              <TouchableOpacity
                style={styles.clearDateBtn}
                onPress={() => {
                  setDueDate(null);
                  setShowDatePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearDateBtnText}>✕ Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate ? new Date(dueDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant="dark"
              onChange={handleDateChange}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              style={styles.doneDateBtn}
              onPress={() => setShowDatePicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.doneDateBtnText}>Confirm Date</Text>
            </TouchableOpacity>
          )}
        </FormField>

        {/* ── SAVE BUTTON ─────────────────────────────── */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>
            {isEditMode ? '💾 Save Changes' : '✅ Add Task'}
          </Text>
        </TouchableOpacity>

        {/* Bottom padding so save button isn't right at the edge */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// FormField — layout wrapper for a label + input
// Keeps the label-above-input pattern DRY across all fields.
// ─────────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// OptionGroup — renders a row of selectable option chips
// Used for both Category and Priority selection.
// ─────────────────────────────────────────────────────────────
function OptionGroup({ options, selected, onSelect, accentColor }) {
  return (
    <View style={optionStyles.row}>
      {options.map(option => {
        const isSelected = option.id === selected;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              optionStyles.chip,
              isSelected && {
                backgroundColor: accentColor,
                borderColor:     accentColor,
              },
            ]}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              optionStyles.chipText,
              isSelected && optionStyles.chipTextSelected,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Maps priority id → accent color (for the OptionGroup highlight)
const PRIORITY_COLOR_MAP = {
  high:   COLORS.accentDanger,
  medium: COLORS.accentWarning,
  low:    COLORS.accentSuccess,
};

// ── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap:     20,
  },
  input: {
    backgroundColor:  COLORS.bgInput,
    color:            COLORS.textPrimary,
    borderRadius:     12,
    paddingHorizontal: 16,
    paddingVertical:   12,
    fontSize:          15,
    borderWidth:        1,
    borderColor:        COLORS.bgInput,
  },
  inputMultiline: {
    height:  90,
    paddingTop: 12,
  },
  inputError: {
    borderColor: COLORS.accentDanger,
  },
  charCount: {
    color:     COLORS.textMuted,
    fontSize:  11,
    textAlign: 'right',
    marginTop:  4,
  },
  errorText: {
    color:     COLORS.accentDanger,
    fontSize:  12,
    marginTop:  4,
  },
  saveBtn: {
    backgroundColor: COLORS.accentPrimary,
    borderRadius:    14,
    padding:         16,
    alignItems:      'center',
    marginTop:        8,
  },
  saveBtnText: {
    color:      COLORS.textPrimary,
    fontSize:   16,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.bgInput,
  },
  dateButtonActive: {
    borderColor: COLORS.accentPrimary,
  },
  dateButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  dateButtonTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  clearDateBtn: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.accentDanger,
  },
  clearDateBtnText: {
    color: COLORS.accentDanger,
    fontSize: 14,
    fontWeight: '600',
  },
  doneDateBtn: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: COLORS.accentPrimary,
  },
  doneDateBtnText: {
    color: COLORS.accentPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});

const fieldStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    color:      COLORS.textSecondary,
    fontSize:   13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

const optionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:            8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:    8,
    borderRadius:      20,
    borderWidth:        1.5,
    borderColor:        COLORS.textMuted,
    backgroundColor:   COLORS.bgInput,
  },
  chipText: {
    color:    COLORS.textSecondary,
    fontSize: 13,
  },
  chipTextSelected: {
    color:      COLORS.textPrimary,
    fontWeight: '700',
  },
});
