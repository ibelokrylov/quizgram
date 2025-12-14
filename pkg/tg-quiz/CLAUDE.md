# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Management**: This project uses **bun** as the package manager
- **Install dependencies**: `bun install` - Install project dependencies
- **Add dependency**: `bun add <package>` - Add new dependency
- **Add dev dependency**: `bun add -d <package>` - Add development dependency
- **Development**: `bun run dev` - Start development server
- **Build**: `bun run build` - Build the project
- **Format/Lint**: `bun run lint` - Run linter/formatter

## Architecture Overview

This is a **Telegram Mini App** built with React 19 and TypeScript that runs inside Telegram WebView.

### Tech Stack
- **React 19** with TypeScript
- **@telegram-apps/sdk-react** - React SDK for Telegram Mini Apps (v3.x)
- **@telegram-apps/telegram-ui** - UI components in Telegram style
- **Vite** for building
- **Bun** as package manager

### Key Features
- Runs inside Telegram WebView
- Access to Telegram user data and native features
- Native Telegram UI components
- Integration with Telegram navigation (back button)

## SDK Initialization

**IMPORTANT**: SDK initialization is mandatory in `main.tsx`:

```typescript
import { init, backButton } from '@telegram-apps/sdk-react';

// SDK initialization (required)
init();

// Mount components (e.g., backButton)
backButton.mount();
```

**Note**: The `@telegram-apps/sdk-react` package fully re-exports `@telegram-apps/sdk`, so no need to install it separately.

## Essential React Hooks

### `useLaunchParams`
Gets application launch parameters (with `tgWebApp` prefix):

```typescript
import { useLaunchParams } from '@telegram-apps/sdk-react';

function Component() {
  const launchParams = useLaunchParams();
  // {
  //   tgWebAppBotInline: false,
  //   tgWebAppData: { user: {...}, auth_date: Date(...), ... },
  //   ...
  // }
}
```

### `useRawLaunchParams`
Returns launch parameters in raw format:

```typescript
import { useRawLaunchParams } from '@telegram-apps/sdk-react';

function Component() {
  const rawParams = useRawLaunchParams();
  // 'tgWebAppBotInline=0&tgWebAppData=%7B%22user%22%3A%7D...'
}
```

### `useRawInitData`
Gets init data in original format:

```typescript
import { useRawInitData } from '@telegram-apps/sdk-react';

function Component() {
  const initData = useRawInitData();
  // '{"user":...,"auth_date":...,"query_id":...,...}'
}
```

### `useSignal`
Hook for working with SDK signals. Returns current value and updates on signal change:

```typescript
import { useEffect } from 'react';
import { backButton, useSignal } from '@telegram-apps/sdk-react';

function Component() {
  const isVisible = useSignal(backButton.isVisible);

  useEffect(() => {
    console.log('Back button is', isVisible ? 'visible' : 'invisible');
  }, [isVisible]);

  useEffect(() => {
    backButton.show();
    return () => backButton.hide();
  }, []);

  return null;
}
```

### `useAndroidDeviceData`
Gets Android device data from `navigator.userAgent`:

```typescript
import { useAndroidDeviceData } from '@telegram-apps/sdk-react';

function Component() {
  const deviceData = useAndroidDeviceData();
  // {
  //   manufacturer: 'Samsung',
  //   performanceClass: 'AVERAGE',
  //   model: 'SM-A155F',
  //   androidVersion: '14',
  //   sdkVersion: 34,
  // }
}
```

## Component Usage Example

```typescript
// main.tsx
import { backButton, init } from '@telegram-apps/sdk-react';
import { AppRoot, Placeholder } from '@telegram-apps/telegram-ui';

init();
backButton.mount();

// In components
import { useLaunchParams, useSignal } from '@telegram-apps/sdk-react';

function MyComponent() {
  const launchParams = useLaunchParams();
  const isVisible = useSignal(backButton.isVisible);

  return (
    <AppRoot>
      <Placeholder header="Title" description="Description">
        Content
      </Placeholder>
    </AppRoot>
  );
}
```

## Development Guidelines

### 1. Working Inside Telegram
- Application runs in Telegram WebView
- Has access to user data via Telegram SDK
- Can use native Telegram features (payments, notifications, etc.)

### 2. UI Components
- Use components from `@telegram-apps/telegram-ui` for native look
- Import styles: `import '@telegram-apps/telegram-ui/dist/styles.css'`
- Wrap app in `<AppRoot>` for proper operation

### 3. Navigation
- Use `backButton` from SDK for back navigation
- Button automatically integrates with Telegram navigation

### 4. User Data Access
Telegram SDK provides access to:
- User data (`WebAppUser`)
- Theme parameters (`ThemeParams`)
- Init data (`initData`)
- Other platform capabilities

## Rules

### ALWAYS:
✅ Initialize SDK via `init()` in `main.tsx`
✅ Mount components via `.mount()` (e.g., `backButton.mount()`)
✅ Use React hooks from `@telegram-apps/sdk-react` for SDK interaction
✅ Use `useSignal` for reactive work with SDK signals
✅ Use Telegram UI components for native look
✅ Handle navigation via `backButton`
✅ Test inside Telegram - app works only in Telegram context

### NEVER:
❌ Don't use regular web components without Telegram UI wrapper
❌ Don't forget to import Telegram UI styles
❌ Don't test in regular browser without Telegram environment emulation
❌ Don't install `@telegram-apps/sdk` separately - it's included in `@telegram-apps/sdk-react`

## Documentation

### Main Sources:
- **Telegram Mini Apps API**: https://core.telegram.org/bots/webapps
- **@telegram-apps/sdk-react v3.x**: https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk-react/3-x

### Main SDK Classes and Methods:
- **WebApp** / **MiniApp** - Main class for Mini App work
- **WebAppUser** - User data
- **ThemeParams** - Theme parameters (light/dark)
- **MainButton** / **BottomButton** - Control buttons
- **BackButton** - Back button
- **CloudStorage** - Cloud storage
- **BiometricManager** - Biometric authentication
- **Popup** - Pop-up windows
- **QRScanner** - QR code scanner
- **Invoice** - Payments
- And many other capabilities

### React Hooks (v3.x):
- **`useLaunchParams()`** - Application launch parameters
- **`useRawLaunchParams()`** - Launch parameters in raw format
- **`useRawInitData()`** - Init data in original format
- **`useSignal(signal)`** - Work with SDK signals
- **`useAndroidDeviceData()`** - Android device data
- **`useAndroidDeviceDataFrom(userAgent)`** - Parse device data from custom userAgent