import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTheme } from "../../constants/theme";
import { useAppTheme } from "../../contexts/ThemeContext";
import { sendChatMessage } from "../../services/ai";
import { cancelTaskReminder } from "../../services/notifications";
import {
  getChatHistory,
  getTasks,
  saveChatHistory,
  saveTasks,
} from "../../services/storage";
import { DEFAULT_LIST_ID } from "../../types/list";
import { ChatMessage } from "../../types/chat";
import { Task } from "../../types/task";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "model",
  text: "Hola, soy tu asistente de Focus. Puedes pedirme que agregue, complete o repriorice tareas, o simplemente platicar sobre cómo organizar tu día.",
  createdAt: 0,
};

export default function ChatScreen() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [history, loadedTasks] = await Promise.all([getChatHistory(), getTasks()]);
        setMessages(history.length > 0 ? history : [WELCOME_MESSAGE]);
        setTasks(loadedTasks);
      })();
    }, []),
  );

  const applyActions = async (actions: Awaited<ReturnType<typeof sendChatMessage>>["actions"]) => {
    let current = [...tasks];
    const now = Date.now();

    for (const action of actions) {
      if (action.type === "add_task") {
        current = [
          {
            id: `${now}-${current.length}`,
            title: action.title,
            completed: false,
            priority: action.priority,
            listId: DEFAULT_LIST_ID,
            createdAt: now,
            updatedAt: now,
          },
          ...current,
        ];
      } else if (action.type === "complete_task") {
        const target = current.find((t) => t.id === action.id);
        if (target?.notificationId) await cancelTaskReminder(target.notificationId);
        current = current.map((t) =>
          t.id === action.id ? { ...t, completed: true, updatedAt: now } : t,
        );
      } else if (action.type === "delete_task") {
        const target = current.find((t) => t.id === action.id);
        if (target?.notificationId) await cancelTaskReminder(target.notificationId);
        current = current.filter((t) => t.id !== action.id);
      } else if (action.type === "update_priority") {
        current = current.map((t) =>
          t.id === action.id ? { ...t, priority: action.priority, updatedAt: now } : t,
        );
      }
    }

    setTasks(current);
    await saveTasks(current);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      role: "user",
      text,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const result = await sendChatMessage(nextMessages, tasks);

      const modelMessage: ChatMessage = {
        id: `${Date.now()}-model`,
        role: "model",
        text: result.reply || "Listo.",
        createdAt: Date.now(),
      };

      const finalMessages = [...nextMessages, modelMessage];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);

      if (result.actions.length > 0) {
        await applyActions(result.actions);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: "model",
        text:
          error instanceof Error
            ? error.message
            : "No pude conectarme con la IA. Intenta de nuevo en unos segundos.",
        createdAt: Date.now(),
      };
      setMessages([...nextMessages, errorMessage]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Asistente</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.bubbleUser : styles.bubbleModel,
              ]}
            >
              <Text style={item.role === "user" ? styles.bubbleUserText : styles.bubbleModelText}>
                {item.text}
              </Text>
            </View>
          )}
        />

        {sending && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={theme.textTertiary} />
            <Text style={styles.typingText}>Pensando…</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <SymbolView
              name={{ ios: "arrow.up", android: "send", web: "send" }}
              tintColor={theme.accentText}
              size={18}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      paddingHorizontal: 20,
    },
    header: {
      marginTop: 12,
      marginBottom: 8,
    },
    brand: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "800",
    },
    messages: {
      paddingVertical: 12,
      gap: 10,
    },
    bubble: {
      maxWidth: "85%",
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleUser: {
      alignSelf: "flex-end",
      backgroundColor: theme.accent,
      borderBottomRightRadius: 4,
    },
    bubbleModel: {
      alignSelf: "flex-start",
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomLeftRadius: 4,
    },
    bubbleUserText: {
      color: theme.accentText,
      fontSize: 15,
    },
    bubbleModelText: {
      color: theme.textPrimary,
      fontSize: 15,
    },
    typingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingBottom: 8,
    },
    typingText: {
      color: theme.textTertiary,
      fontSize: 12,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
      paddingVertical: 12,
    },
    input: {
      flex: 1,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: theme.textPrimary,
      fontSize: 15,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
  });
