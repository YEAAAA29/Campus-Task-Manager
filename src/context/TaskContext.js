// =============================================================
// FILE: src/context/TaskContext.js
// PURPOSE: The global state store for the entire application.
//
// THIS FILE CONTAINS THREE THINGS:
//   1. TaskContext    — the "container" React creates for us
//   2. TaskProvider   — the component that HOLDS and MANAGES state
//   3. useTaskContext — a custom hook for consuming the context
//
// DATA FLOW EXPLAINED:
//   TaskProvider wraps the entire app (set in App.js).
//   Any component inside the app calls useTaskContext() and
//   gets back { tasks, addTask, editTask, deleteTask, ... }.
//   When a task is added, the state updates, and React
//   automatically re-renders every component that used the context.
//
// WHY NOT REDUX?
//   Redux adds real value at enterprise scale (100+ actions,
//   time-travel debugging). For this app, the Context API +
//   useReducer achieves identical results with far less boilerplate
//   and is much easier to explain in an interview/presentation.
// =============================================================

import React, {
  createContext,  // Creates the context object
  useContext,     // Lets any child component read the context
  useReducer,     // Manages complex state transitions predictably
  useCallback,    // Memoizes functions so they don't re-create on every render
  useMemo,        // Memoizes the context value object itself
  useEffect,      // Runs side effects (loading/saving data)
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES } from '../utils/constants';


// ─────────────────────────────────────────────────────────────
// SECTION 1: CONTEXT CREATION
//
// createContext() returns an object with two properties:
//   - Context.Provider  → wraps components, "broadcasts" the value
//   - Context.Consumer  → older way to read context (we'll use the hook instead)
//
// We pass `undefined` as the default. This lets us detect when
// a component tries to use the context WITHOUT a Provider —
// we throw a helpful error in useTaskContext() below.
// ─────────────────────────────────────────────────────────────
const TaskContext = createContext(undefined);


// ─────────────────────────────────────────────────────────────
// SECTION 2: INITIAL STATE & SEED DATA
//
// This is the exact shape of our state object.
// Having seed data means the app is never blank on first launch
// — helpful for demos and presentations.
// ─────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  // `tasks` is an array of task objects. Each task has:
  //   id        — unique string (Date.now() based), used as React key
  //   title     — string
  //   description — string (optional)
  //   category  — one of the CATEGORIES ids ('cs', 'math', etc.)
  //   priority  — 'high' | 'medium' | 'low'
  //   dueDate   — ISO date string or null
  //   isComplete — boolean
  //   createdAt  — ISO date string
  tasks: [
    {
      id: '1',
      title: 'Implement Binary Search Tree',
      description: 'Complete the insert, delete, and traversal methods for the BST lab assignment.',
      category: 'cs',
      priority: 'high',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Due in 1 day
      isComplete: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Chapter 5 Problem Sets',
      description: 'Integration by parts — problems 5.1 through 5.15.',
      category: 'math',
      priority: 'medium',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // Due in 4 days
      isComplete: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Essay: "The Great Gatsby" Theme Analysis',
      description: 'Minimum 1500 words. Focus on the theme of the American Dream.',
      category: 'english',
      priority: 'low',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // OVERDUE by 2 days
      isComplete: false,
      createdAt: new Date().toISOString(),
    },
  ],

  // `activeCategory` tracks which filter tab the user has selected.
  // 'all' means show every task regardless of category.
  activeCategory: 'all',
};


// ─────────────────────────────────────────────────────────────
// SECTION 3: REDUCER FUNCTION
//
// WHAT IS A REDUCER?
//   A reducer is a pure function: (currentState, action) → newState
//   It NEVER mutates state directly. It ALWAYS returns a new object.
//   This predictability is the core benefit over useState for
//   complex state: every change is an explicit, named "action".
//
// WHY useReducer OVER useState HERE?
//   We have multiple operations on the same piece of state (the
//   tasks array). With useState we'd have one setter function.
//   With useReducer, each operation has a named action type —
//   making the code self-documenting and easier to debug.
//
// TRADE-OFF TO MENTION IN PRESENTATION:
//   useReducer requires more initial boilerplate. The payoff is
//   that adding a new operation (e.g., "ARCHIVE_TASK") is a
//   single new case in the switch — you don't need to trace
//   state through many useState calls.
// ─────────────────────────────────────────────────────────────
function taskReducer(state, action) {
  switch (action.type) {

    case 'LOAD_TASKS':
      return {
        ...state,
        tasks: action.payload,
      };

    // ── ADD_TASK ──────────────────────────────────────────────
    // action.payload = the full new task object
    // We spread the existing tasks array [...state.tasks] to
    // create a new array (never mutate), then append the new task.
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };

    // ── EDIT_TASK ─────────────────────────────────────────────
    // action.payload = the updated task object (must include `id`)
    // .map() returns a new array. For the matching task, we spread
    // its existing properties and overwrite with the new values.
    // For all other tasks, we return them unchanged.
    case 'EDIT_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id
            ? { ...task, ...action.payload } // Merge: keep old fields, overwrite with new
            : task
        ),
      };

    // ── DELETE_TASK ───────────────────────────────────────────
    // action.payload = the id string of the task to remove
    // .filter() returns a new array containing only tasks whose
    // id does NOT match, effectively removing the target task.
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };

    // ── TOGGLE_COMPLETE ───────────────────────────────────────
    // action.payload = the task id to toggle
    // Flips the isComplete boolean for one task.
    // Using !task.isComplete avoids needing to pass the new value
    // — the reducer derives it from current state.
    case 'TOGGLE_COMPLETE':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload
            ? { ...task, isComplete: !task.isComplete }
            : task
        ),
      };

    // ── SET_ACTIVE_CATEGORY ───────────────────────────────────
    // action.payload = category id string (e.g., 'cs')
    // Updates the active filter without touching the tasks array.
    // This is why having everything in one reducer is powerful —
    // related state changes together atomically.
    case 'SET_ACTIVE_CATEGORY':
      return {
        ...state,
        activeCategory: action.payload,
      };

    // Default: if an unknown action is dispatched, return state
    // unchanged. This prevents silent bugs.
    default:
      return state;
  }
}


// ─────────────────────────────────────────────────────────────
// SECTION 4: THE PROVIDER COMPONENT
//
// TaskProvider is a standard React component. Its ONLY job is:
//   1. Hold the state (via useReducer)
//   2. Expose action functions (via useCallback)
//   3. Compute derived data (via useMemo)
//   4. Pass all of the above down to children via Context
//
// It renders { children } — meaning it wraps whatever is inside
// it without rendering any visible UI of its own.
// ─────────────────────────────────────────────────────────────
export function TaskProvider({ children }) {
  // useReducer returns [currentState, dispatchFunction]
  // `dispatch` is called with an action object: { type, payload }
  // React then calls taskReducer(currentState, action) and sets
  // the return value as the new state.
  const [state, dispatch] = useReducer(taskReducer, INITIAL_STATE);

  // ── TASK PERSISTENCE (AsyncStorage) ──────────────────────
  // Load tasks on mount
  useEffect(() => {
    async function loadStoredTasks() {
      try {
        const stored = await AsyncStorage.getItem('@campus_tasks');
        if (stored !== null) {
          const parsedTasks = JSON.parse(stored);
          dispatch({ type: 'LOAD_TASKS', payload: parsedTasks });
        }
      } catch (e) {
        console.error('Failed to load tasks from AsyncStorage:', e);
      }
    }
    loadStoredTasks();
  }, []);

  // Save tasks on change
  useEffect(() => {
    async function saveTasks() {
      try {
        await AsyncStorage.setItem('@campus_tasks', JSON.stringify(state.tasks));
      } catch (e) {
        console.error('Failed to save tasks to AsyncStorage:', e);
      }
    }
    saveTasks();
  }, [state.tasks]);



  // ── ACTION CREATORS (wrapped in useCallback) ─────────────
  //
  // WHY useCallback?
  //   Without it, these functions are RE-CREATED on every render
  //   of TaskProvider. Since we pass them as props/context values,
  //   child components would see a "new" function reference every
  //   render, triggering unnecessary re-renders of those children.
  //   useCallback memoizes the function; it only re-creates when
  //   its dependency array changes. Here, `dispatch` never changes
  //   (guaranteed by React), so the empty array [] is correct.
  //
  // POTENTIAL INTERVIEW QUESTION: "When would you NOT use useCallback?"
  //   Answer: When the function isn't passed as a prop/context value,
  //   or when the component it's in re-renders infrequently anyway.
  //   Premature memoization adds complexity without benefit.

  const addTask = useCallback((taskData) => {
    // We generate the ID here (in the action creator) rather than
    // in the reducer, because the reducer should be a PURE function
    // with no side effects. Date.now() is a side effect.
    const newTask = {
      ...taskData,
      id: Date.now().toString(), // Simple unique ID. In production: uuid library.
      isComplete: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);

  const editTask = useCallback((updatedTask) => {
    // updatedTask must already contain the correct `id` so
    // the reducer knows which task to update.
    dispatch({ type: 'EDIT_TASK', payload: updatedTask });
  }, []);

  const deleteTask = useCallback((taskId) => {
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  }, []);

  const toggleComplete = useCallback((taskId) => {
    dispatch({ type: 'TOGGLE_COMPLETE', payload: taskId });
  }, []);

  const setActiveCategory = useCallback((categoryId) => {
    dispatch({ type: 'SET_ACTIVE_CATEGORY', payload: categoryId });
  }, []);


  // ── DERIVED STATE (computed with useMemo) ─────────────────
  //
  // `filteredTasks` is NOT stored in state — it's computed FROM state.
  // This is a crucial architectural principle: avoid storing data
  // that can be derived from existing data (avoids sync bugs).
  //
  // WHY useMemo?
  //   .filter() runs on every render. useMemo caches the result and
  //   only re-runs when `state.tasks` or `state.activeCategory` change.
  //   For large task lists, this is a meaningful performance win.
  //
  // TRADE-OFF: useMemo has a small memory cost (caching the result).
  //   For a list this small, it's negligible. At 10,000+ items,
  //   you'd want virtualization (e.g., FlatList is already virtualised).
  const filteredTasks = useMemo(() => {
    if (state.activeCategory === 'all') {
      return state.tasks;
    }
    return state.tasks.filter(task => task.category === state.activeCategory);
  }, [state.tasks, state.activeCategory]);


  // ── STEP 3: CATEGORY ANALYTICS ────────────────────────────
  //
  // taskCountByCategory: { cs: 2, math: 1, english: 1, ... }
  //
  // HOW IT WORKS:
  //   Array.reduce() iterates every task once (O(n)) and builds
  //   an object where each key is a category id and the value
  //   is how many tasks belong to it.
  //
  // WHY reduce() INSTEAD OF multiple filter() calls?
  //   If we called tasks.filter(t => t.category === 'cs').length
  //   for each category, we'd loop through the full array once
  //   PER category — O(n × categories). One reduce() does it in
  //   a single O(n) pass. More efficient and cleaner.
  //
  // useMemo dependency: only `state.tasks` — category names never
  // change at runtime, so we don't need activeCategory here.
  const taskCountByCategory = useMemo(() => {
    return state.tasks.reduce((acc, task) => {
      // acc (accumulator) starts as {}
      // For each task: if the key exists, increment; if not, start at 1
      acc[task.category] = (acc[task.category] ?? 0) + 1;
      return acc;
    }, {});
  }, [state.tasks]);


  // ── STEP 3: SECTION LIST DATA ─────────────────────────────
  //
  // categorySections: array shaped for React Native's SectionList
  //
  // SectionList expects:  [{ title: string, data: Task[], key: string }]
  // We only populate sections that actually have tasks — empty
  // categories are filtered out to avoid blank section headers.
  //
  // This is only used by TaskListScreen when activeCategory === 'all'.
  // In single-category view, FlatList + filteredTasks is used instead.
  //
  // WHY COMPUTE HERE AND NOT IN THE SCREEN?
  //   If two screens ever needed grouped data (e.g., a calendar view),
  //   they'd both benefit from this single computation. Centralising
  //   derived data in context avoids duplication and keeps screens thin.
  const categorySections = useMemo(() => {
    // We use the CATEGORIES array (from constants) to guarantee a
    // consistent section order, regardless of task insertion order.
    return CATEGORIES
      .filter(cat => cat.id !== 'all')   // 'all' is a UI concept, not a real category
      .map(cat => ({
        key:   cat.id,                   // Unique key for SectionList
        title: cat.label,               // Section header label (e.g. "💻 Computer Science")
        data:  state.tasks.filter(t => t.category === cat.id),
      }))
      .filter(section => section.data.length > 0); // Drop empty sections
  }, [state.tasks]);


  // ── THE CONTEXT VALUE OBJECT ──────────────────────────────
  //
  // This object is what every consumer receives when they call
  // useTaskContext(). We memoize it so that if neither the tasks
  // array nor the action functions change, the context value
  // reference stays the same — preventing needless re-renders
  // in all consumers.
  const contextValue = useMemo(() => ({
    // RAW STATE
    tasks:          state.tasks,
    activeCategory: state.activeCategory,
    categories:     CATEGORIES,

    // DERIVED STATE — Step 1 & 2
    filteredTasks,                    // Pre-filtered list for the active category

    // DERIVED STATE — Step 3 (category analytics)
    taskCountByCategory,              // { cs: 2, math: 1, ... }
    categorySections,                 // [{ key, title, data: Task[] }] for SectionList

    // ACTIONS
    addTask,
    editTask,
    deleteTask,
    toggleComplete,
    setActiveCategory,
  }), [
    state.tasks,
    state.activeCategory,
    filteredTasks,
    taskCountByCategory,
    categorySections,
    addTask,
    editTask,
    deleteTask,
    toggleComplete,
    setActiveCategory,
  ]);


  // TaskContext.Provider "broadcasts" contextValue to all
  // descendant components. `children` is whatever is nested
  // inside <TaskProvider> ... </TaskProvider> in App.js.
  return (
    <TaskContext.Provider value={contextValue}>
      {children}
    </TaskContext.Provider>
  );
}


// ─────────────────────────────────────────────────────────────
// SECTION 5: CUSTOM HOOK — useTaskContext()
//
// WHAT IT DOES:
//   This is the public API for consuming our context.
//   Instead of writing `useContext(TaskContext)` in every file,
//   screens call `useTaskContext()` — cleaner and safer.
//
// WHY THE ERROR GUARD?
//   If a developer forgets to wrap a component in <TaskProvider>,
//   `useContext(TaskContext)` returns `undefined` (our default).
//   Without the guard, you'd get cryptic "Cannot read property
//   of undefined" errors. With it, you get a clear, actionable message.
//   This is a professional-grade pattern worth mentioning in your eval.
// ─────────────────────────────────────────────────────────────
export function useTaskContext() {
  const context = useContext(TaskContext);

  if (context === undefined) {
    throw new Error(
      'useTaskContext must be used within a <TaskProvider>. ' +
      'Wrap your component tree with <TaskProvider> in App.js.'
    );
  }

  return context;
}

// We do NOT export TaskContext itself. Components should ONLY
// access state through the useTaskContext hook. This encapsulates
// the implementation detail and lets us swap out the internals
// (e.g., switch to Zustand) without changing any consumer code.
