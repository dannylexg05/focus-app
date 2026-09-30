import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TaskEditModal, { TaskEditValues } from "../../components/TaskEditModal";
import { AppTheme } from "../../constants/theme";
import { useAppTheme } from "../../contexts/ThemeContext";
import { parseDumpWithAI } from "../../services/ai";
import { cancelTaskReminder, scheduleTaskReminder } from "../../services/notifications";
import { getLists, getTasks, saveTasks } from "../../services/storage";
import { TaskList } from "../../types/list";
import { Task } from "../../types/task";

const PRIORITY_ORDER: Record<Task["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");

  const [dumpModalVisible, setDumpModalVisible] = useState(false);
  const [dumpText, setDumpText] = useState("");
  const [loading, setLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<Task | "new" | null>(null);

  const loadAll = useCallback(async () => {
    const [loadedTasks, loadedLists] = await Promise.all([getTasks(), getLists()]);
    setTasks(loadedTasks);
    setLists(loadedLists);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const persistTasks = async (updated: Task[]) => {
    setTasks(updated);
    await saveTasks(updated);
  };

  const toggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const willComplete = !target.completed;
    if (willComplete && target.notificationId) {
      await cancelTaskReminder(target.notificationId);
    }

    const updated = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            completed: willComplete,
            notificationId: willComplete ? undefined : t.notificationId,
            updatedAt: Date.now(),
          }
        : t,
    );
    await persistTasks(updated);
  };

  const deleteTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (target?.notificationId) {
      await cancelTaskReminder(target.notificationId);
    }
    await persistTasks(tasks.filter((t) => t.id !== id));
  };

  const applyReminder = async (
    previous: Task | undefined,
    reminderAt: number | undefined,
    title: string,
  ): Promise<string | undefined> => {
    if (previous?.notificationId) {
      await cancelTaskReminder(previous.notificationId);
    }
    if (!reminderAt) return undefined;

    const id = await scheduleTaskReminder(title, new Date(reminderAt));
    if (!id) {
      Alert.alert(
        "Notificaciones desactivadas",
        "Activa los permisos de notificaciones para recibir recordatorios.",
      );
    }
    return id ?? undefined;
  };

  const handleSaveTask = async (values: TaskEditValues) => {
    const now = Date.now();

    if (editTarget && editTarget !== "new") {
      const notificationId = await applyReminder(editTarget, values.reminderAt, values.title);
      const updated = tasks.map((t) =>
        t.id === editTarget.id
          ? {
              ...t,
              title: values.title,
              priority: values.priority,
              listId: values.listId,
              reminderAt: values.reminderAt,
              notificationId,
              updatedAt: now,
            }
          : t,
      );
      await persistTasks(updated);
    } else {
      const notificationId = await applyReminder(undefined, values.reminderAt, values.title);
      const newTask: Task = {
        id: `${now}`,
        title: values.title,
        completed: false,
        priority: values.priority,
        listId: values.listId,
        reminderAt: values.reminderAt,
        notificationId,
        createdAt: now,
        updatedAt: now,
      };
      await persistTasks([newTask, ...tasks]);
    }
    setEditTarget(null);
  };

  const handleDeleteFromModal = async () => {
    if (editTarget && editTarget !== "new") {
      await deleteTask(editTarget.id);
    }
    setEditTarget(null);
  };

  const handleProcessDump = async () => {
    if (!dumpText.trim()) return;

    const targetListId = selectedListId === "all" ? lists[0]?.id : selectedListId;
    if (!targetListId) return;

    setLoading(true);
    try {
      const newTasks = await parseDumpWithAI(dumpText, targetListId);
      await persistTasks([...newTasks, ...tasks]);

      setDumpText("");
      setDumpModalVisible(false);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "No se pudo conectar con la IA. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleTasks =
    selectedListId === "all" ? tasks : tasks.filter((t) => t.listId === selectedListId);

  const activeTask = [...visibleTasks]
    .filter((t) => !t.completed)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0];

  const pendingCount = visibleTasks.filter((t) => !t.completed).length;

  const listById = (id: string) => lists.find((l) => l.id === id);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.brand}>Focus</Text>
        <View style={styles.headerRight}>
          <View style={styles.pendingChip}>
            <Text style={styles.pendingChipText}>
              {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setEditTarget("new")}
            disabled={lists.length === 0}
          >
            <SymbolView
              name={{ ios: "plus", android: "add", web: "add" }}
              tintColor={theme.accentText}
              size={18}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTRO DE LISTAS */}
      {lists.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedListId === "all" ? theme.textPrimary : theme.surfaceAlt,
              },
            ]}
            onPress={() => setSelectedListId("all")}
          >
            <Text
              style={{
                color: selectedListId === "all" ? theme.bg : theme.textSecondary,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              Todas
            </Text>
          </TouchableOpacity>
          {lists.map((list) => (
            <TouchableOpacity
              key={list.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedListId === list.id ? list.color : theme.surfaceAlt,
                },
              ]}
              onPress={() => setSelectedListId(list.id)}
            >
              <Text
                style={{
                  color: selectedListId === list.id ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {list.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* SECCIÓN 1: MODO ENFOQUE (Mono-tarea) */}
      <View style={styles.focusSection}>
        <Text style={styles.sectionLabel}>ENFOQUE ACTUAL</Text>
        {activeTask ? (
          <TouchableOpacity
            style={[
              styles.card,
              { borderLeftColor: theme.priority[activeTask.priority].color },
            ]}
            activeOpacity={0.85}
            onPress={() => toggleTask(activeTask.id)}
            onLongPress={() => setEditTarget(activeTask)}
          >
            <View
              style={[
                styles.tagBadge,
                { backgroundColor: theme.priority[activeTask.priority].bg },
              ]}
            >
              <Text
                style={[styles.tagText, { color: theme.priority[activeTask.priority].color }]}
              >
                {theme.priority[activeTask.priority].label.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.cardTitle}>{activeTask.title}</Text>

            <View style={styles.cardHintRow}>
              <SymbolView
                name={{ ios: "circle", android: "radio_button_unchecked", web: "radio_button_unchecked" }}
                tintColor={theme.textTertiary}
                size={16}
              />
              <Text style={styles.cardHint}>Toca para completar · mantén presionado para editar</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBadge}>
              <SymbolView
                name={{ ios: "checkmark", android: "check_circle", web: "check_circle" }}
                tintColor={theme.accentText}
                size={22}
              />
            </View>
            <Text style={styles.emptyTitle}>Todo despejado por ahora</Text>
            <Text style={styles.emptySubtitle}>
              Agrega una tarea o haz un vaciado de pendientes con IA.
            </Text>
          </View>
        )}
      </View>

      {/* SECCIÓN 2: OTRAS TAREAS PENDIENTES */}
      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>SIGUIENTES TAREAS</Text>
        <FlatList
          data={visibleTasks.filter((t) => t.id !== activeTask?.id)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.taskRow, item.completed && styles.taskRowDone]}>
              <TouchableOpacity onPress={() => toggleTask(item.id)}>
                <SymbolView
                  name={
                    item.completed
                      ? { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }
                      : { ios: "circle", android: "radio_button_unchecked", web: "radio_button_unchecked" }
                  }
                  tintColor={item.completed ? theme.accent : theme.textTertiary}
                  size={20}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.taskRowMain} onPress={() => setEditTarget(item)}>
                {selectedListId === "all" && listById(item.listId) && (
                  <View
                    style={[styles.listDot, { backgroundColor: listById(item.listId)!.color }]}
                  />
                )}
                <Text
                  style={[styles.taskRowText, item.completed && styles.strike]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>

              {item.reminderAt && (
                <SymbolView
                  name={{ ios: "bell.fill", android: "notifications_active", web: "notifications_active" }}
                  tintColor={theme.accent}
                  size={14}
                />
              )}

              <View
                style={[styles.dot, { backgroundColor: theme.priority[item.priority].color }]}
              />

              <TouchableOpacity onPress={() => deleteTask(item.id)} hitSlop={8}>
                <SymbolView
                  name={{ ios: "trash", android: "delete", web: "delete" }}
                  tintColor={theme.textTertiary}
                  size={16}
                />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* BOTÓN FLOTANTE */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setDumpModalVisible(true)}
      >
        <SymbolView
          name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
          tintColor={theme.accentText}
          size={18}
        />
        <Text style={styles.fabText}>Vaciar mente</Text>
      </TouchableOpacity>

      {/* MODAL BRAIN DUMP */}
      <Modal visible={dumpModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Vaciado Mental</Text>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={styles.dismissKeyboardText}>Ocultar teclado</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Escribe todo lo que tienes pendiente sin preocuparte por el orden. La IA
                extraerá tus 3 prioridades.
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder="Ej: Terminar reporte, comprar leche, responder correos..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={5}
                value={dumpText}
                onChangeText={setDumpText}
              />

              {loading ? (
                <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnCancel]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setDumpModalVisible(false);
                    }}
                  >
                    <Text style={styles.btnTextCancel}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, styles.btnConfirm]}
                    onPress={() => {
                      Keyboard.dismiss();
                      handleProcessDump();
                    }}
                  >
                    <Text style={styles.btnTextConfirm}>Organizar con IA</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <TaskEditModal
        visible={editTarget !== null}
        theme={theme}
        lists={lists}
        initial={
          editTarget && editTarget !== "new"
            ? {
                title: editTarget.title,
                priority: editTarget.priority,
                listId: editTarget.listId,
                reminderAt: editTarget.reminderAt,
              }
            : undefined
        }
        onClose={() => setEditTarget(null)}
        onSave={handleSaveTask}
        onDelete={editTarget && editTarget !== "new" ? handleDeleteFromModal : undefined}
      />
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
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brand: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "800",
    },
    pendingChip: {
      backgroundColor: theme.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
    },
    pendingChipText: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: "700",
    },
    addBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    filterRow: {
      marginTop: 16,
      flexGrow: 0,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 100,
    },
    focusSection: {
      marginTop: 20,
      marginBottom: 24,
    },
    sectionLabel: {
      color: theme.textTertiary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.2,
      marginBottom: 10,
    },
    card: {
      backgroundColor: theme.surfaceAlt,
      padding: 24,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
    },
    cardTitle: {
      color: theme.textPrimary,
      fontSize: 21,
      fontWeight: "700",
      marginTop: 14,
      marginBottom: 16,
    },
    tagBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 100,
    },
    tagText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    cardHintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    cardHint: {
      color: theme.textTertiary,
      fontSize: 12,
    },
    emptyCard: {
      backgroundColor: theme.surfaceAlt,
      padding: 28,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    emptyIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    emptySubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      textAlign: "center",
      marginTop: 4,
    },
    listSection: {
      flex: 1,
    },
    listContent: {
      gap: 8,
      paddingBottom: 110,
    },
    taskRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    taskRowDone: {
      opacity: 0.5,
    },
    taskRowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    listDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    taskRowText: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: "500",
    },
    strike: {
      textDecorationLine: "line-through",
      color: theme.textSecondary,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    fab: {
      position: "absolute",
      bottom: 30,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.accent,
      paddingHorizontal: 26,
      paddingVertical: 16,
      borderRadius: 100,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    fabText: {
      color: theme.accentText,
      fontWeight: "800",
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalContent: {
      backgroundColor: theme.surface,
      padding: 24,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dismissKeyboardText: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: "700",
    },
    modalTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: "800",
    },
    modalSubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      marginTop: 4,
      marginBottom: 16,
    },
    textArea: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      padding: 16,
      color: theme.textPrimary,
      textAlignVertical: "top",
      fontSize: 14,
      height: 120,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
      gap: 12,
    },
    btn: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: 100,
      alignItems: "center",
    },
    btnCancel: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.borderStrong,
    },
    btnConfirm: {
      backgroundColor: theme.accent,
    },
    btnTextCancel: {
      color: theme.textSecondary,
      fontWeight: "700",
    },
    btnTextConfirm: {
      color: theme.accentText,
      fontWeight: "800",
    },
  });
