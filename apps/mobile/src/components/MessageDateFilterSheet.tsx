import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { buildCalendarCells, formatDateKeyRo, toLocalDateKey } from '@dental/utils';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Props = {
  visible: boolean;
  messageDates: string[];
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  onClose: () => void;
};

export function MessageDateFilterSheet({
  visible,
  messageDates,
  selectedDate,
  onSelectDate,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const dateSet = useMemo(() => new Set(messageDates), [messageDates]);

  const initialMonth = useMemo(() => {
    const anchor = selectedDate ?? messageDates[0] ?? toLocalDateKey(new Date().toISOString());
    const [year, month] = anchor.split('-').map(Number);
    return { year, month };
  }, [messageDates, selectedDate, visible]);

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  React.useEffect(() => {
    if (!visible) return;
    setViewYear(initialMonth.year);
    setViewMonth(initialMonth.month);
  }, [visible, initialMonth.year, initialMonth.month]);

  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('ro-RO', {
    month: 'long',
    year: 'numeric',
  });

  const quickDates = useMemo(() => {
    const today = toLocalDateKey(new Date().toISOString());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateKey(yesterdayDate.toISOString());
    return [
      { key: null as string | null, label: 'Toate mesajele' },
      ...(dateSet.has(today) ? [{ key: today, label: 'Astăzi' }] : []),
      ...(dateSet.has(yesterday) ? [{ key: yesterday, label: 'Ieri' }] : []),
    ];
  }, [dateSet]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth() + 1);
  }

  function handlePick(dateKey: string) {
    if (!dateSet.has(dateKey)) return;
    onSelectDate(dateKey);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/45" onPress={onClose}>
        <Pressable
          className="mt-auto bg-surface rounded-t-[28px] overflow-hidden"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          <View className="px-xl pb-md flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-semibold text-text-primary">Filtrează după dată</Text>
              <Text className="text-sm text-text-secondary mt-1">Alege o zi cu mesaje din conversație</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Închide"
            >
              <Ionicons name="close" size={20} color="#6B6F76" />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}>
            {quickDates.map((item) => {
              const active = selectedDate === item.key || (item.key === null && !selectedDate);
              return (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    onSelectDate(item.key);
                    onClose();
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    active ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-text-primary'}`}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View className="mx-xl bg-background border border-border rounded-2xl p-md">
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => shiftMonth(-1)}
                className="w-9 h-9 rounded-full items-center justify-center active:bg-surface"
                accessibilityRole="button"
                accessibilityLabel="Luna anterioară"
              >
                <Ionicons name="chevron-back" size={22} color="#0F6B66" />
              </Pressable>
              <Text className="text-base font-semibold text-text-primary capitalize">{monthLabel}</Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                className="w-9 h-9 rounded-full items-center justify-center active:bg-surface"
                accessibilityRole="button"
                accessibilityLabel="Luna următoare"
              >
                <Ionicons name="chevron-forward" size={22} color="#0F6B66" />
              </Pressable>
            </View>

            <View className="flex-row mb-2">
              {WEEKDAYS.map((label, index) => (
                <View key={`${label}-${index}`} className="flex-1 items-center">
                  <Text className="text-xs font-semibold text-text-secondary">{label}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap">
              {cells.map((cell) => {
                const hasMessages = dateSet.has(cell.dateKey);
                const isSelected = selectedDate === cell.dateKey;
                const isToday = cell.dateKey === toLocalDateKey(new Date().toISOString());

                return (
                  <Pressable
                    key={`${cell.dateKey}-${cell.inMonth ? 'in' : 'out'}`}
                    disabled={!hasMessages}
                    onPress={() => handlePick(cell.dateKey)}
                    className="w-[14.2857%] aspect-square items-center justify-center"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !hasMessages, selected: isSelected }}
                  >
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        isSelected
                          ? 'bg-primary'
                          : hasMessages
                            ? 'bg-primary/10'
                            : 'bg-transparent'
                      } ${isToday && !isSelected ? 'border border-primary/40' : ''}`}
                    >
                      <Text
                        className={`text-sm ${
                          isSelected
                            ? 'text-white font-semibold'
                            : cell.inMonth
                              ? hasMessages
                                ? 'text-primary font-semibold'
                                : 'text-text-primary'
                              : 'text-text-secondary/50'
                        }`}
                      >
                        {cell.day}
                      </Text>
                    </View>
                    {hasMessages && !isSelected ? (
                      <View className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selectedDate ? (
            <View className="px-xl pt-md">
              <Text className="text-sm text-text-secondary text-center">
                Filtru activ: {formatDateKeyRo(selectedDate, { weekday: true })}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
