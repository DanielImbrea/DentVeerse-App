import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { findNearbyClinics, findNearbyLaboratories } from '@dental/api';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState } from '@dental/ui';
import { supabase } from '@mobile/lib/supabase';

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#FAF9F7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B6F76' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FAF9F7' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#E6E3DF' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFE3E2' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const BUCHAREST_REGION: Region = { latitude: 44.4268, longitude: 26.1025, latitudeDelta: 0.15, longitudeDelta: 0.15 };

type MapEntity =
  | { kind: 'clinic'; id: string; name: string; city: string; latitude: number; longitude: number; is_verified: boolean; rating_avg: number; distance_m: number }
  | { kind: 'laboratory'; id: string; name: string; city: string; latitude: number; longitude: number; is_verified: boolean; distance_m: number };

function clusterEntities(entities: MapEntity[], cellSizeDegrees: number) {
  const cells = new Map<string, MapEntity[]>();
  for (const entity of entities) {
    const cellKey = `${Math.round(entity.latitude / cellSizeDegrees)}:${Math.round(entity.longitude / cellSizeDegrees)}`;
    const existing = cells.get(cellKey) ?? [];
    existing.push(entity);
    cells.set(cellKey, existing);
  }
  return Array.from(cells.values()).map((group) => ({
    latitude: group.reduce((sum, e) => sum + e.latitude, 0) / group.length,
    longitude: group.reduce((sum, e) => sum + e.longitude, 0) / group.length,
    entities: group,
  }));
}

function CustomMarkerIcon({ kind, isVerified }: { kind: 'clinic' | 'laboratory'; isVerified: boolean }) {
  const backgroundColor = kind === 'laboratory' ? '#C98A3B' : '#0F6B66';
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: isVerified ? 3 : 1,
        borderColor: isVerified ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
      }}
    >
      <Text style={{ fontSize: 16 }}>{kind === 'laboratory' ? '🧪' : '🦷'}</Text>
    </View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState<Region>(BUCHAREST_REGION);
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState({ clinics: true, laboratories: true });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permisiune locație refuzată — afișăm Bucureștiul implicit.');
        return;
      }
      try {
        const position = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        });
      } catch {
        setLocationError('Nu am putut determina locația — afișăm Bucureștiul implicit.');
      }
    })();
  }, []);

  const { data: clinicsData, isLoading: clinicsLoading, isError: clinicsError } = useQuery({
    queryKey: ['nearby-clinics', region.latitude, region.longitude],
    queryFn: () => findNearbyClinics(supabase, { lat: region.latitude, lng: region.longitude, radiusMeters: 50000 }),
    enabled: visibleTypes.clinics,
  });

  const { data: laboratoriesData, isLoading: laboratoriesLoading, isError: laboratoriesError } = useQuery({
    queryKey: ['nearby-laboratories', region.latitude, region.longitude],
    queryFn: () => findNearbyLaboratories(supabase, { lat: region.latitude, lng: region.longitude, radiusMeters: 50000 }),
    enabled: visibleTypes.laboratories,
  });

  const entities: MapEntity[] = useMemo(() => {
    const clinics: MapEntity[] = visibleTypes.clinics
      ? ((clinicsData?.data as MapEntity[] | undefined) ?? []).map((c) => ({ kind: 'clinic' as const, ...c }))
      : [];
    const laboratories: MapEntity[] = visibleTypes.laboratories
      ? ((laboratoriesData?.data as MapEntity[] | undefined) ?? []).map((l) => ({ kind: 'laboratory' as const, ...l }))
      : [];
    return [...clinics, ...laboratories];
  }, [clinicsData, laboratoriesData, visibleTypes]);

  const clusters = useMemo(() => clusterEntities(entities, Math.max(region.latitudeDelta / 20, 0.001)), [entities, region.latitudeDelta]);
  const isLoading = (visibleTypes.clinics && clinicsLoading) || (visibleTypes.laboratories && laboratoriesLoading);
  const isError = (visibleTypes.clinics && clinicsError) || (visibleTypes.laboratories && laboratoriesError);

  if (isError) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <ErrorState message="Nu am putut încărca rezultatele din apropiere." retryLabel="Încearcă din nou" onRetry={() => {}} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        initialRegion={region}
        customMapStyle={MAP_STYLE}
        onRegionChangeComplete={setRegion}
        showsUserLocation
      >
        {clusters.map((cluster, index) =>
          cluster.entities.length === 1 ? (
            <Marker
              key={`${cluster.entities[0].kind}-${cluster.entities[0].id}`}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              onPress={() => setSelectedEntity(cluster.entities[0])}
            >
              <CustomMarkerIcon kind={cluster.entities[0].kind} isVerified={cluster.entities[0].is_verified} />
            </Marker>
          ) : (
            <Marker
              key={`cluster-${index}`}
              coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
              onPress={() =>
                setRegion((prev) => ({
                  ...prev,
                  latitude: cluster.latitude,
                  longitude: cluster.longitude,
                  latitudeDelta: prev.latitudeDelta / 2,
                  longitudeDelta: prev.longitudeDelta / 2,
                }))
              }
            >
              <View className="bg-primary rounded-full w-9 h-9 items-center justify-center border-2 border-white">
                <Text className="text-white font-body text-caption font-medium">{cluster.entities.length}</Text>
              </View>
            </Marker>
          )
        )}
      </MapView>

      <View className="absolute left-4 right-4 flex-row items-center gap-sm" style={{ top: insets.top + 8 }}>
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center">
          <Ionicons name="chevron-back" size={22} color="#0F6B66" />
        </Pressable>
        <View className="flex-1 flex-row gap-xs">
          <Pressable
            onPress={() => setVisibleTypes((prev) => ({ ...prev, clinics: !prev.clinics }))}
            className={`rounded-full px-md py-2 ${visibleTypes.clinics ? 'bg-primary' : 'bg-surface border border-border'}`}
          >
            <Text className={`text-sm font-medium ${visibleTypes.clinics ? 'text-white' : 'text-text-secondary'}`}>Clinici</Text>
          </Pressable>
          <Pressable
            onPress={() => setVisibleTypes((prev) => ({ ...prev, laboratories: !prev.laboratories }))}
            className={`rounded-full px-md py-2 ${visibleTypes.laboratories ? 'bg-accent' : 'bg-surface border border-border'}`}
          >
            <Text className={`text-sm font-medium ${visibleTypes.laboratories ? 'text-white' : 'text-text-secondary'}`}>Laboratoare</Text>
          </Pressable>
        </View>
      </View>

      {locationError ? (
        <View className="absolute left-4 right-4 bg-surface rounded-xl p-sm border border-border" style={{ top: insets.top + 56 }}>
          <Text className="font-body text-caption text-text-secondary">{locationError}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View className="absolute left-4 right-4 bg-surface rounded-xl p-sm border border-border" style={{ top: insets.top + 56 }}>
          <Text className="font-body text-caption text-text-secondary">Se încarcă…</Text>
        </View>
      ) : entities.length === 0 ? (
        <View className="absolute left-4 right-4" style={{ bottom: insets.bottom + 100 }}>
          <View className="bg-surface border border-border rounded-2xl p-lg shadow-sm">
            <EmptyState
              title="Nimic în zonă"
              message="Nu există clinici/laboratoare înregistrate aici încă. Extinde harta sau adaugă date demo în Supabase."
            />
          </View>
        </View>
      ) : null}

      {selectedEntity ? (
        <Link href={selectedEntity.kind === 'clinic' ? `/clinic/${selectedEntity.id}` : `/laboratory/${selectedEntity.id}`} asChild>
          <Pressable
            className="absolute left-4 right-4 bg-surface border border-border rounded-2xl p-lg flex-row items-center justify-between shadow-sm"
            style={{ bottom: insets.bottom + 100 }}
          >
            <View className="flex-1 pr-md">
              <Text className="font-body text-body font-medium text-text-primary">{selectedEntity.name}</Text>
              <Text className="font-body text-caption text-text-secondary">
                {selectedEntity.kind === 'clinic' ? `★ ${selectedEntity.rating_avg?.toFixed?.(1) ?? '—'} · ` : ''}
                {(selectedEntity.distance_m / 1000).toFixed(1)} km · {selectedEntity.city}
              </Text>
            </View>
            <Text className="font-body text-body text-primary font-medium">Vezi profil</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
