import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { parseDumpWithAI } from "../../services/ai";
import { getTasks, saveTasks } from "../../services/storage";
import { Task } from "../../types/task";

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [dumpText, setDumpText] = useState("");
  const [loading, setLoading] = useState(false);

  // Cargar tareas al abrir la app
  useEffect(() => {
    loadSavedTasks();
  }, []);

  const loadSavedTasks = async () => {
    const loaded = await getTasks();
    setTasks(loaded);
  };

  // Marcar/desmarcar tarea
  const toggleTask = async (id: string) => {
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    setTasks(updated);
    await saveTasks(updated);
  };

  // Procesar con IA
  const handleProcessDump = async () => {
    if (!dumpText.trim()) return;

    setLoading(true);
    try {
      const newTasks = await parseDumpWithAI(dumpText);
      const combined = [...newTasks, ...tasks];
      setTasks(combined);
      await saveTasks(combined);

      setDumpText("");
      setModalVisible(false);
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo conectar con la IA. Revisa tu API key e inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  // La tarea principal es la primera pendiente
  const activeTask = tasks.find((t) => !t.completed);

  return (
    <SafeAreaView style={styles.container}>
      {/* SECCIÓN 1: MODO ENFOQUE (Mono-tarea) */}
      <View style={styles.focusSection}>
        <Text style={styles.sectionLabel}>ENFOQUE ACTUAL</Text>
        {activeTask ? (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => toggleTask(activeTask.id)}
          >
            <Text style={styles.cardTitle}>{activeTask.title}</Text>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>
                {activeTask.priority.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.cardHint}>
              Toca para marcar como completada ✓
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>¡Todo despejado por ahora!</Text>
            <Text style={styles.emptySubtitle}>
              Haz un vaciado de pendientes con el botón inferior.
            </Text>
          </View>
        )}
      </View>

      {/* SECCIÓN 2: OTRAS TAREAS PENDIENTES */}
      <View style={styles.listSection}>
        <Text style={styles.sectionLabel}>SIGUIENTES TAREAS</Text>
        <FlatList
          data={tasks.filter((t) => t.id !== activeTask?.id)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.taskRow, item.completed && styles.taskRowDone]}
              onPress={() => toggleTask(item.id)}
            >
              <Text
                style={[styles.taskRowText, item.completed && styles.strike]}
              >
                {item.completed ? "✓ " : "○ "} {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* BOTÓN FLOTANTE */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+ Vaciar mente</Text>
      </TouchableOpacity>

      {/* MODAL BRAIN DUMP */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Vaciado Mental</Text>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={styles.dismissKeyboardText}>
                    Ocultar teclado
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Escribe todo lo que tienes pendiente sin preocuparte por el
                orden. La IA extraerá tus 3 prioridades.
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder="Ej: Terminar reporte, comprar leche, responder correos..."
                placeholderTextColor="#737373"
                multiline
                numberOfLines={5}
                value={dumpText}
                onChangeText={setDumpText}
              />

              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#ffffff"
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnCancel]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setModalVisible(false);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
  },
  focusSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#0284c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  tagText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardHint: {
    color: "#94a3b8",
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  listSection: {
    flex: 1,
  },
  taskRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  taskRowDone: {
    opacity: 0.4,
  },
  taskRowText: {
    color: "#cbd5e1",
    fontSize: 15,
  },
  strike: {
    textDecorationLine: "line-through",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  fabText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dismissKeyboardText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    color: "#f8fafc",
    textAlignVertical: "top",
    fontSize: 14,
    height: 120,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#334155",
  },
  btnConfirm: {
    backgroundColor: "#2563eb",
  },
  btnTextCancel: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  btnTextConfirm: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
