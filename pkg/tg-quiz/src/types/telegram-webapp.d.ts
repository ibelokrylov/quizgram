/**
 * Типы для Telegram WebApp API
 * Документация: https://core.telegram.org/bots/webapps
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  // Основные методы
  ready(): void;
  expand(): void;
  close(): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  openInvoice(url: string, callback?: (status: string) => void): void;
  
  // Fullscreen методы
  requestFullscreen(): void;
  exitFullscreen(): void;
  
  // BackButton
  BackButton: BackButton;
  
  // MainButton (теперь BottomButton)
  MainButton: MainButton;
  
  // SettingsButton
  SettingsButton: SettingsButton;
  
  // HapticFeedback
  HapticFeedback: HapticFeedback;
  
  // CloudStorage
  CloudStorage: CloudStorage;
  
  // BiometricManager
  BiometricManager: BiometricManager;
  
  // ThemeParams
  themeParams: ThemeParams;
  
  // Viewport
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  headerColor: string;
  backgroundColor: string;
  
  // Safe Area (Bot API 8.0+)
  safeAreaInset?: SafeAreaInset;
  contentSafeAreaInset?: SafeAreaInset;
  isActive?: boolean;
  isFullscreen?: boolean;
  
  // User
  initData: string;
  initDataUnsafe: InitDataUnsafe;
  version: string;
  platform: string;
  
  // Состояние
  isClosingConfirmationEnabled: boolean;
  isVerticalSwipesEnabled: boolean;
  
  // Методы управления
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  enableVerticalSwipes(): void;
  disableVerticalSwipes(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  
  // События
  onEvent(eventType: string, eventHandler: (event: unknown) => void): void;
  offEvent(eventType: string, eventHandler: (event: unknown) => void): void;
  
  // Дополнительные методы
  showPopup(params: PopupParams, callback?: (id: string) => void): void;
  showAlert(message: string, callback?: () => void): void;
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void;
  showScanQrPopup(params: ScanQrPopupParams, callback?: (text: string) => void): void;
  closeScanQrPopup(): void;
  readTextFromClipboard(callback?: (text: string) => void): void;
  requestWriteAccess(callback?: (granted: boolean) => void): void;
  requestContact(callback?: (granted: boolean) => void): void;
  switchInlineQuery(query: string, choose_chat_types?: string[]): void;
  shareToStory(url: string, callback?: (success: boolean) => void): void;
  shareMessage(text: string, callback?: (success: boolean) => void): void;
  downloadFile(url: string, callback?: (success: boolean) => void): void;
  addToHomeScreen(callback?: (success: boolean) => void): void;
  checkHomeScreenStatus(callback?: (status: HomeScreenStatus) => void): void;
  setEmojiStatus(emoji: string, duration?: number, callback?: (success: boolean) => void): void;
  requestEmojiStatusAccess(callback?: (granted: boolean) => void): void;
  lockOrientation(orientation: 'portrait' | 'landscape' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary'): void;
  unlockOrientation(): void;
  setBottomBarColor(color: string): void;
  hideKeyboard(): void;
}

export interface BackButton {
  isVisible: boolean;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
}

export interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText(text: string): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  setParams(params: MainButtonParams): void;
}

export interface SettingsButton {
  isVisible: boolean;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
}

export interface HapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

export interface CloudStorage {
  setItem(key: string, value: string, callback?: (error: Error | null, success: boolean) => void): void;
  getItem(key: string, callback: (error: Error | null, value: string | null) => void): void;
  getItems(keys: string[], callback: (error: Error | null, values: Record<string, string>) => void): void;
  removeItem(key: string, callback?: (error: Error | null, success: boolean) => void): void;
  removeItems(keys: string[], callback?: (error: Error | null, success: boolean) => void): void;
  getKeys(callback: (error: Error | null, keys: string[]) => void): void;
}

export interface BiometricManager {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: 'finger' | 'face' | 'unknown';
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  isAccessDenied: boolean;
  init(callback?: (success: boolean) => void): void;
  requestAccess(params: BiometricRequestParams, callback?: (granted: boolean) => void): void;
  authenticate(params: BiometricAuthParams, callback?: (success: boolean) => void): void;
  updateBiometricToken(token: string): void;
}

export interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  [key: string]: string | undefined;
}

export interface InitDataUnsafe {
  query_id?: string;
  user?: WebAppUser;
  receiver?: WebAppUser;
  chat?: WebAppChat;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export interface WebAppUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
}

export interface WebAppChat {
  id: number;
  type: 'group' | 'supergroup' | 'channel';
  title: string;
  username?: string;
  photo_url?: string;
}

export interface PopupParams {
  title?: string;
  message: string;
  buttons?: PopupButton[];
}

export interface PopupButton {
  id?: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text?: string;
}

export interface ScanQrPopupParams {
  text?: string;
}

export interface MainButtonParams {
  text?: string;
  color?: string;
  text_color?: string;
  is_active?: boolean;
  is_visible?: boolean;
}

export interface BiometricRequestParams {
  reason?: string;
}

export interface BiometricAuthParams {
  reason?: string;
}

export interface HomeScreenStatus {
  isAdded: boolean;
  canAdd: boolean;
}

export interface SafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export { };

