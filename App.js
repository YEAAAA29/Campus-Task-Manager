// =============================================================
// FILE: App.js (Root of the Application)
// PURPOSE: The entry point. Does three things ONLY:
//   1. Wraps the app in TaskProvider (global state)
//   2. Sets up navigation (Stack Navigator)
//   3. Defines the screen → component mapping
//
// ARCHITECTURE PRINCIPLE: App.js should be "thin". It wires
// things together but contains ZERO business logic. If this
// file grows too large, that's a smell that logic belongs
// in a screen, component, or context file instead.
// =============================================================

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { TaskProvider } from './src/context/TaskContext';
import { COLORS }       from './src/utils/constants';

// Screen imports — we'll build these in Step 2
// For now they are placeholder references
import TaskListScreen   from './src/screens/TaskListScreen';
import AddEditTaskScreen from './src/screens/AddEditTaskScreen';

// createNativeStackNavigator() returns an object with two
// components: Stack.Navigator (the container) and Stack.Screen
// (each route definition). This is the standard RN Navigation pattern.
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // ── PROVIDER LAYER ────────────────────────────────────────
    // TaskProvider must sit ABOVE NavigationContainer so that
    // screens rendered by the navigator can access the context.
    // If you place it INSIDE a screen, only that screen's
    // subtree gets access — a common mistake.
    <TaskProvider>
      {/* StatusBar styling — matches our dark theme */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />

      {/* NavigationContainer manages the navigation state.
          It must wrap all navigator components. */}
      <NavigationContainer>
        <Stack.Navigator
          // initialRouteName sets the first screen shown on launch.
          initialRouteName="TaskList"
          screenOptions={{
            // These options apply to ALL screens unless overridden.
            headerStyle:      { backgroundColor: COLORS.bgCard },
            headerTintColor:  COLORS.textPrimary,
            headerTitleStyle: { fontWeight: '700', fontSize: 18 },
            contentStyle:     { backgroundColor: COLORS.bgDark },
            // animation: 'slide_from_right gives a native-feel transition
            animation: 'slide_from_right',
          }}
        >
          {/* ── SCREEN DEFINITIONS ─────────────────────────── */}
          {/* Each Stack.Screen maps a `name` (string used in
              navigation.navigate()) to a `component`. */}
          <Stack.Screen
            name="TaskList"
            component={TaskListScreen}
            options={{ title: '📚 Campus Tasks' }}
          />
          <Stack.Screen
            name="AddEditTask"
            component={AddEditTaskScreen}
            // The title is set dynamically in the screen itself
            // using navigation.setOptions(), because it differs
            // between "Add Task" and "Edit Task" modes.
            options={{ title: 'Task Details' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TaskProvider>
  );
}
