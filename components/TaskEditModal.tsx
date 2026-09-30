import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppTheme } from '../constants/theme';
import { TaskList } from '../types/list';
import { Priority } from '../types/task';

export interface TaskEditValues {
  title: string;
  priority: Priority;
  listId: string;
  reminderAt?: number;
}

interface TaskEditModalProps {
  visible: boolean;
  theme: AppTheme;
  lists: TaskList[];
  initial?: TaskEditValues;
  onClose: () => void;
  onSave: (values: TaskEditValues) => void;
  onDelete?: () => void;
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export default function TaskEditModal({
  visible,
  theme,
  lists,
  initial,
  onClose,
  onSave,
  onDelete,
}: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [listId, setListId] = useState(lists[0]?.id ?? '');
  const [reminderAt, setReminderAt] = useState<number | undefined>(undefined);
  const [showIosPicker, setShowIosPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setPriority(initial?.priority ?? 'medium');
      setListId(initial?.listId ?? lists[0]?.id ?? '');
      setReminderAt(initial?.reminderAt);
      setShowIosPicker(false);
    }
  }, [visible, initial, lists]);

  const styles = createStyles(theme);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), priority, listId, reminderAt });
  };

  const handleToggleReminder = () => {
    if (reminderAt) {
      setReminderAt(undefined);
      return;
    }

    const defaultDate = new Date(Date.now() + 60 * 60 * 1000);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: defaultDate,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (_event, pickedDate) => {
          if (!pickedDate) return;
          DateTimePickerAndroid.open({
            value: pickedDate,
            mode: 'time',
            onChange: (_timeEvent, pickedTime) => {
              if (!pickedTime) return;
              setReminderAt(pickedTime.getTime());
            },
          });
        },
      });
    } else {
      setReminderAt(defaultDate.getTime());
      setShowIosPicker(true);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Eliminar tarea', '¿Seguro que quieres eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{initial ? 'Editar tarea' : 'Nueva tarea'}</Text>
              <TouchableOpacity onPress={onClose}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  tintColor={theme.textSecondary}
                  size={20}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Título de la tarea"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Prioridad</Text>
            <View style={styles.row}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        priority === p ? theme.priority[p].color : theme.surfaceAlt,
                      borderColor: theme.priority[p].color,
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={{
                      color: priority === p ? theme.accentText : theme.priority[p].color,
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {theme.priority[p].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Lista</Text>
            <View style={styles.row}>
              {lists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: listId === list.id ? list.color : theme.surfaceAlt,
                      borderColor: list.color,
                    },
                  ]}
                  onPress={() => setListId(list.id)}
                >
                  <Text
                    style={{
                      color: listId === list.id ? '#FFFFFF' : theme.textPrimary,
                      fontWeight: '600',
                      fontSize: 12,
                    }}
                  >
                    {list.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Recordatorio</Text>
            <TouchableOpacity style={styles.reminderRow} onPress={handleToggleReminder}>
              <SymbolView
                name={
                  reminderAt
                    ? { ios: 'bell.fill', android: 'notifications_active', web: 'notifications_active' }
                    : { ios: 'bell', android: 'notifications', web: 'notifications' }
                }
                tintColor={reminderAt ? theme.accent : theme.textTertiary}
                size={18}
              />
              <Text style={styles.reminderText}>
                {reminderAt
                  ? new Date(reminderAt).toLocaleString()
                  : 'Sin recordatorio · toca para agregar'}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && showIosPicker && reminderAt && (
              <DateTimePicker
                value={new Date(reminderAt)}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  if (date) setReminderAt(date.getTime());
                }}
              />
            )}

            <View style={styles.actions}>
              {onDelete && (
                <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                  <SymbolView
                    name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                    tintColor={theme.danger}
                    size={18}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!title.trim()}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    content: {
      backgroundColor: theme.surface,
      padding: 24,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    input: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 14,
      color: theme.textPrimary,
      fontSize: 15,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 18,
    },
    label: {
      color: theme.textTertiary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 18,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 100,
      borderWidth: 1,
    },
    reminderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 18,
    },
    reminderText: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    deleteBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.dangerBg,
    },
    saveBtn: {
      flex: 1,
      backgroundColor: theme.accent,
      paddingVertical: 15,
      borderRadius: 100,
      alignItems: 'center',
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: theme.accentText,
      fontWeight: '800',
      fontSize: 15,
    },
  });
