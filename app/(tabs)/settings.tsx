import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppTheme } from "../../constants/theme";
import { useAppTheme } from "../../contexts/ThemeContext";
import { requestNotificationPermissions, cancelAllReminders } from "../../services/notifications";
import {
  clearAllData,
  getLists,
  getSettings,
  getTasks,
  saveChatHistory,
  saveLists,
  saveSettings,
  saveTasks,
} from "../../services/storage";
import { DEFAULT_LIST_ID, TaskList } from "../../types/list";
import { ThemePreference } from "../../types/settings";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

export default function SettingsScreen() {
  const { theme, themePreference, setThemePreference } = useAppTheme();
  const styles = createStyles(theme);

  const [lists, setLists] = useState<TaskList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [loadedLists, settings] = await Promise.all([getLists(), getSettings()]);
        setLists(loadedLists);
        setNotificationsEnabled(settings.notificationsEnabled);
      })();
    }, []),
  );

  const handleAddList = async () => {
    const name = newListName.trim();
    if (!name) return;

    const color = theme.listPalette[lists.length % theme.listPalette.length];
    const updated = [...lists, { id: `${Date.now()}`, name, color }];
    setLists(updated);
    await saveLists(updated);
    setNewListName("");
  };

  const handleDeleteList = (list: TaskList) => {
    if (list.id === DEFAULT_LIST_ID) return;

    Alert.alert(
      "Eliminar lista",
      `Las tareas de "${list.name}" se moverán a General.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const updatedLists = lists.filter((l) => l.id !== list.id);
            setLists(updatedLists);
            await saveLists(updatedLists);

            const tasks = await getTasks();
            const reassigned = tasks.map((t) =>
              t.listId === list.id ? { ...t, listId: DEFAULT_LIST_ID } : t,
            );
            await saveTasks(reassigned);
          },
        },
      ],
    );
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permiso denegado",
          "Activa las notificaciones para Focus desde los ajustes del sistema.",
        );
        return;
      }
    }
    setNotificationsEnabled(value);
    const settings = await getSettings();
    await saveSettings({ ...settings, notificationsEnabled: value });
  };

  const handleClearData = () => {
    Alert.alert(
      "Borrar todos los datos",
      "Se eliminarán todas tus tareas, listas y el historial del asistente. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Borrar todo",
          style: "destructive",
          onPress: async () => {
            await cancelAllReminders();
            await clearAllData();
            await saveChatHistory([]);
            const defaultLists = await getLists();
            setLists(defaultLists);
            Alert.alert("Listo", "Tus datos se borraron correctamente.");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.brand}>Ajustes</Text>

        <Text style={styles.sectionLabel}>APARIENCIA</Text>
        <View style={styles.segmented}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.segmentedOption,
                themePreference === opt.value && { backgroundColor: theme.accent },
              ]}
              onPress={() => setThemePreference(opt.value)}
            >
              <Text
                style={{
                  color: themePreference === opt.value ? theme.accentText : theme.textSecondary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>NOTIFICACIONES</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <SymbolView
              name={{ ios: "bell", android: "notifications", web: "notifications" }}
              tintColor={theme.textSecondary}
              size={18}
            />
            <Text style={styles.rowText}>Recordatorios de tareas</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ true: theme.accent, false: theme.border }}
          />
        </View>

        <Text style={styles.sectionLabel}>LISTAS</Text>
        <View style={styles.listCard}>
          {lists.map((list) => (
            <View key={list.id} style={styles.listRow}>
              <View style={[styles.listSwatch, { backgroundColor: list.color }]} />
              <Text style={styles.listName}>{list.name}</Text>
              {list.id !== DEFAULT_LIST_ID && (
                <TouchableOpacity onPress={() => handleDeleteList(list)} hitSlop={8}>
                  <SymbolView
                    name={{ ios: "trash", android: "delete", web: "delete" }}
                    tintColor={theme.textTertiary}
                    size={16}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <View style={styles.addListRow}>
            <TextInput
              style={styles.addListInput}
              placeholder="Nueva lista"
              placeholderTextColor={theme.textTertiary}
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={handleAddList}
            />
            <TouchableOpacity style={styles.addListBtn} onPress={handleAddList}>
              <SymbolView
                name={{ ios: "plus", android: "add", web: "add" }}
                tintColor={theme.accentText}
                size={16}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>DATOS</Text>
        <TouchableOpacity style={styles.dangerRow} onPress={handleClearData}>
          <SymbolView
            name={{ ios: "trash", android: "delete", web: "delete" }}
            tintColor={theme.danger}
            size={18}
          />
          <Text style={styles.dangerText}>Borrar todos los datos</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>ACERCA DE</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>Focus</Text>
          <Text style={styles.aboutVersion}>
            Versión {Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>
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
    brand: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      marginTop: 12,
      marginBottom: 20,
    },
    sectionLabel: {
      color: theme.textTertiary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1.2,
      marginBottom: 10,
      marginTop: 8,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 4,
      marginBottom: 8,
    },
    segmentedOption: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: "center",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 8,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    rowText: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
    listCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 8,
      gap: 10,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    listSwatch: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    listName: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
    addListRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    addListInput: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.textPrimary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    addListBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    dangerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.dangerBg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
    },
    dangerText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: "700",
    },
    aboutCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 40,
    },
    aboutText: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    aboutVersion: {
      color: theme.textTertiary,
      fontSize: 12,
      marginTop: 2,
    },
  });
