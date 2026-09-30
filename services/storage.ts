// services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../types/chat';
import { DEFAULT_LIST_ID, TaskList } from '../types/list';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { Task } from '../types/task';

const TASKS_KEY = '@focus_tasks';
const LISTS_KEY = '@focus_lists';
const SETTINGS_KEY = '@focus_settings';
const CHAT_KEY = '@focus_chat';

const DEFAULT_LISTS: TaskList[] = [
  { id: DEFAULT_LIST_ID, name: 'General', color: '#5E6AD2' },
];

export const getTasks = async (): Promise<Task[]> => {
  try {
    const json = await AsyncStorage.getItem(TASKS_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Error al leer tareas', e);
    return [];
  }
};

export const saveTasks = async (tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error al guardar tareas', e);
  }
};

export const getLists = async (): Promise<TaskList[]> => {
  try {
    const json = await AsyncStorage.getItem(LISTS_KEY);
    if (json == null) {
      await saveLists(DEFAULT_LISTS);
      return DEFAULT_LISTS;
    }
    const parsed: TaskList[] = JSON.parse(json);
    return parsed.length > 0 ? parsed : DEFAULT_LISTS;
  } catch (e) {
    console.error('Error al leer listas', e);
    return DEFAULT_LISTS;
  }
};

export const saveLists = async (lists: TaskList[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  } catch (e) {
    console.error('Error al guardar listas', e);
  }
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json != null ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('Error al leer ajustes', e);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error al guardar ajustes', e);
  }
};

export const getChatHistory = async (): Promise<ChatMessage[]> => {
  try {
    const json = await AsyncStorage.getItem(CHAT_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Error al leer el historial del chat', e);
    return [];
  }
};

export const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Error al guardar el historial del chat', e);
  }
};

export const clearAllData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TASKS_KEY, LISTS_KEY, CHAT_KEY]);
  } catch (e) {
    console.error('Error al borrar los datos', e);
  }
};
