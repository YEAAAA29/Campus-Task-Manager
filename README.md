# Campus Task Manager

Campus Task Manager is a React Native app built for students who need a simple way to track assignments, deadlines, and course-specific work. It was designed as a polished mini-hackathon project with a clean dark UI, local persistence, and an architecture that is easy to explain in an interview.

## Highlights

- Add, edit, complete, and delete tasks
- Organize tasks by course category
- Filter by category with live task counts
- See task urgency through deadline badges
- Persist task data locally with AsyncStorage
- Group tasks in an all-tasks view for faster scanning
- Keep the UI responsive with memoized components and derived state

## Tech Stack

- React Native 0.76
- React 18
- React Navigation
- AsyncStorage
- Native date handling with `Intl.DateTimeFormat`
- Android and iOS support

## Screens

- **Task List** - main dashboard with task counts, filters, grouped lists, and quick actions
- **Add / Edit Task** - form for creating or updating tasks

## Project Structure

- `App.js` - application entry point and navigation setup
- `src/context/TaskContext.js` - global task state, reducer, persistence, and actions
- `src/screens/` - task list and add/edit flows
- `src/components/` - reusable UI pieces like task cards, filters, and badges
- `src/utils/` - shared constants and date helpers

## Getting Started

### Prerequisites

- Node.js 18 or newer
- React Native development environment set up for Android and/or iOS
- Android Studio and Xcode if you want to run on both platforms

### Install dependencies

```bash
npm install
```

### Start the Metro bundler

```bash
npm start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

## Notes

- Task data is stored locally on the device with AsyncStorage.
- The app ships with seed tasks so the UI is never empty on first launch.
- Deadline states are computed from the due date and displayed with color-coded urgency.
- The all-tasks view uses grouped sections, while category views use a flat list for simpler rendering.

## Documentation

For a deeper technical walkthrough of the architecture, data flow, and implementation choices, see [DOCUMENTATION.md](DOCUMENTATION.md).
