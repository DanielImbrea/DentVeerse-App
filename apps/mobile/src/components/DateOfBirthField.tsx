import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  defaultBirthDatePickerValue,
  formatRomanianDateLong,
  isoDateToLocalDate,
  localDateToIsoDate,
  maxBirthDate,
  MIN_BIRTH_DATE,
} from '@mobile/lib/patientDate';

type Props = {
  value: string | null;
  onChange: (isoDate: string) => void;
  label?: string;
  placeholder?: string;
};

export function DateOfBirthField({
  value,
  onChange,
  label = 'Data nașterii',
  placeholder = 'Alege data nașterii',
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() =>
    value ? isoDateToLocalDate(value) : defaultBirthDatePickerValue()
  );

  const displayValue = useMemo(
    () => (value ? formatRomanianDateLong(value) : ''),
    [value]
  );

  function openPicker() {
    setDraftDate(value ? isoDateToLocalDate(value) : defaultBirthDatePickerValue());
    setShowPicker(true);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    setShowPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(localDateToIsoDate(selected));
  }

  function confirmIos() {
    onChange(localDateToIsoDate(draftDate));
    setShowPicker(false);
  }

  return (
    <>
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-text-primary">{label} *</Text>
        <Pressable
          onPress={openPicker}
          className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-md py-3.5 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={value ? `Data nașterii: ${displayValue}` : placeholder}
        >
          <Text className={`text-base flex-1 ${value ? 'text-text-primary' : 'text-text-secondary'}`}>
            {displayValue || placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={22} color="#0F6B66" />
        </Pressable>
      </View>

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          maximumDate={maxBirthDate()}
          minimumDate={MIN_BIRTH_DATE}
          locale="ro-RO"
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowPicker(false)}>
            <Pressable className="bg-surface rounded-t-3xl px-xl pt-3 pb-2" onPress={(e) => e.stopPropagation()}>
              <View className="items-center pb-3">
                <View className="w-10 h-1 rounded-full bg-border" />
              </View>

              <View className="flex-row items-center justify-between mb-2">
                <Pressable onPress={() => setShowPicker(false)} hitSlop={12}>
                  <Text className="text-base text-text-secondary">Anulează</Text>
                </Pressable>
                <Text className="text-base font-semibold text-text-primary">Data nașterii</Text>
                <Pressable onPress={confirmIos} hitSlop={12}>
                  <Text className="text-base font-semibold text-primary">Gata</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                onChange={(_event, selected) => {
                  if (selected) setDraftDate(selected);
                }}
                maximumDate={maxBirthDate()}
                minimumDate={MIN_BIRTH_DATE}
                locale="ro-RO"
                themeVariant="light"
                style={{ height: 220 }}
              />

              <View className="h-6" />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}
