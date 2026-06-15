# Campus Task Manager — Developer Notes & Technical Reference

This document serves as a personal guide and reference for the Campus Task Manager React Native application. It details the architecture choices, state management design, and implementation decisions made during development.

---

## 1. Project Folder Structure

I chose a modular, layer-separated structure to keep the business logic separated from the UI layout. This makes files easier to read, test, and maintain.

```
CampusTaskManager/
├── App.js                         # Root wrapper (navigation + context providers)
├── package.json                   # Project scripts and dependencies
├── src/
│   ├── context/
│   │   └── TaskContext.js         # Global state logic (Reducer, CRUD actions, AsyncStorage)
│   ├── screens/
│   │   ├── TaskListScreen.js      # Main screen: orchestrates filtered & grouped lists
│   │   └── AddEditTaskScreen.js   # Dual-mode form: validates, parses dates, saves tasks
│   ├── components/
│   │   ├── TaskCard.js            # Presentational card component for individual tasks
│   │   ├── CategoryFilter.js      # Filter bar with item counts
│   │   ├── CategorySummaryCard.js # Collapsible breakdown of course urgency
│   │   └── DeadlineBadge.js       # Pill badge mapping urgency to colors
│   └── utils/
│       ├── constants.js           # Shared static tokens (colors, categories, thresholds)
│       └── dateHelpers.js         # Pure JS functions for date formatting & comparisons
```

### Folder Separation Rules
* **`utils/`**: Zero React imports. Contains only pure JavaScript helper functions. This ensures they are fully unit-testable and don't depend on components rendering.
* **`context/`**: Holds all state transitions, global action handlers, and storage sync effects. Avoids rendering JSX elements.
* **`components/`**: Presentational (dumb) components. They receive props and render UI. They don't make direct calls to mutate global state.
* **`screens/`**: Container (smart) components. They subscribe to Context, orchestrate child presentation components, and handle screen-to-screen navigation.

---

## 2. State & Data Flow Architecture

The app uses **Unidirectional Data Flow** with a centralized state pattern to ensure state updates remain clean and predictable.

```
TaskContext (State Store & Actions)
     │
     ├─► exposes: { tasks, filteredTasks, taskCountByCategory, categorySections, ... }
     └─► exposes: { addTask, editTask, deleteTask, toggleComplete, setActiveCategory }
           │
           ▼
TaskListScreen / AddEditTaskScreen (Container Screens)
     │
     ├─► Passes props down to presentational components
     ▼
TaskCard / CategoryFilter / CategorySummaryCard
     │
     └─► User action triggers callback (e.g. onToggleComplete)
           │
           ▼
Calls Context action ──► Dispatches Action to Reducer ──► Updates State ──► React Re-renders UI
```

### Context API + `useReducer` vs. `useState`
Instead of using several `useState` hooks to manage tasks and filter states, I consolidated them into a single `useReducer` store in `TaskContext.js`. 
* **Self-Documenting Transitions**: Every state change has a named type (`ADD_TASK`, `EDIT_TASK`, `LOAD_TASKS`, etc.), which makes debugging easier since you can trace why state changed.
* **No Direct Mutations**: React components cannot modify the tasks list directly; they must dispatch actions. This prevents components from accidentally desynced states.
* **Clean Code**: As the app grows, adding a new action (like archiving a task) is as simple as adding a `case` block inside the reducer function.

---

## 3. Detailed File Walkthrough

### 3.1 `src/context/TaskContext.js`
This is the core state container of the app.
* **Task Persistence (`AsyncStorage`)**:
  * An effect runs once on mount to fetch saved tasks from storage. If it finds saved tasks, it dispatches `LOAD_TASKS`. If not, it defaults to seed data so the app isn't blank on first launch.
  * A second effect runs whenever `state.tasks` changes, saving the updated array to storage as a JSON string.
* **Derived State with `useMemo`**:
  * `filteredTasks`: Runs a `.filter()` on tasks only when `tasks` or `activeCategory` changes.
  * `taskCountByCategory`: Builds a count mapping (e.g., `{ cs: 2, math: 1 }`) in a single $O(n)$ pass using `Array.reduce()`. This is much more efficient than running `.filter().length` 6 different times.
  * `categorySections`: Groups tasks by category into a list formatted for React Native's `SectionList`. It automatically hides empty subjects so we don't display empty section headers.
* **Action Memoization**: All action dispatchers (`addTask`, `editTask`, `deleteTask`) are wrapped in `useCallback` with empty dependency arrays. Since `dispatch` is guaranteed stable by React, these functions never change reference, avoiding unnecessary re-renders in children that receive them as props.

### 3.2 `src/utils/dateHelpers.js`
Handles all calculations for deadlines without importing React.
* **`getDeadlineStatus`**: Compares the ISO due date string with `Date.now()`. It returns a status string (`'overdue'`, `'urgent'`, `'approaching'`, or `'normal'`) based on time thresholds configured in `constants.js`.
* **No External Libraries**: I chose to use the native `Intl.DateTimeFormat` API for date formatting instead of bringing in a heavy package like `moment.js` or `date-fns`. This shows how to build lean apps by relying on built-in browser/JS features.

### 3.3 `src/components/DeadlineBadge.js`
A presentational UI pill badge that styles itself based on the task's deadline status:
* **Overdue**: Red background, 🚨 icon, displays days past due (e.g., `"2d ago"`).
* **Urgent** (due within 24 hours): Yellow background, ⚡ icon, displays `"Today"` or `"Tomorrow"`.
* **Approaching** (due within 3 days): Purple background, 📅 icon, displays days left (e.g., `"In 3d"`).
* **Normal**: Returns `null`, meaning no badge is rendered (keeps UI clean when tasks have distant due dates).

### 3.4 `src/components/TaskCard.js`
Renders details for a single task.
* **Render Guard (`React.memo`)**: Wrapped in `memo` to perform shallow prop comparisons. If a task's properties haven't changed, it completely skips re-rendering. In a long list of items, this keeps the scroll performance buttery smooth.
* **Safety First**: Implements a native `Alert` verification dialog when a user triggers the delete action, preventing accidental task deletion.

### 3.5 `src/screens/TaskListScreen.js`
The main view of the app. It decides what list component to render based on the active category:
* **SectionList**: Used in `"All Tasks"` mode to group tasks under their course headers (e.g., "Computer Science", "Mathematics").
* **FlatList**: Used when viewing a specific category. Since there's only one category group, switching back to a simple `FlatList` avoids the rendering overhead that `SectionList` has for handling section indices.

### 3.6 `src/screens/AddEditTaskScreen.js`
A dual-mode screen that serves both for adding new tasks and editing existing ones.
* **Local vs. Global State**: While tasks are managed globally, this form uses local `useState` hooks for each input field. Since the inputs are isolated to this form and don't affect other screens until the user taps "Save", keeping it in local state is the correct design.
* **Keyboard Management**: Uses `KeyboardAvoidingView` configured with a platform-specific `behavior` (`'padding'` on iOS, `'height'` on Android) to prevent the virtual keyboard from covering inputs.

---

## 4. Key Engineering Decisions & Trade-offs

### 1. `useReducer` vs. Redux
I went with the React Context API paired with `useReducer` instead of installing a global library like Redux Toolkit. For an application of this scale, Context API gives us clean, centralized state management with zero third-party dependencies. Redux would introduce extra package overhead and boilerplate code that is hard to justify for a task manager app.

### 2. Native Date Picker Integration
The form uses the native `@react-native-community/datetimepicker` component for selecting dates.
* *Trade-off*: A date picker provides standard native calendar picking which matches the platform's UI guidelines and prevents keyboard typing errors. I chose this package and linked it during installation, rather than using standard text fields, to ensure a high-quality user experience.

### 3. Local Expand State for Summary Card
The expanded/collapsed state of the `CategorySummaryCard` is managed via local component state. Storing this in the global task context would be an anti-pattern, because the expand toggle is purely a display concern for that single UI card. Keeping it local prevents the entire app container from re-rendering every time the card is toggled.
