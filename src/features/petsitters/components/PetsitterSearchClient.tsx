"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { calculateDistanceKm } from "@/lib/distance";
import { getCloudinaryThumbnail } from "@/lib/cloudinary";
import { SERVICES } from "@/lib/sitter-options";
import { parseArea } from "../utils";
import { usePetsitterLocation } from "../hooks/usePetsitterLocation";
import { useAreaSearch } from "../hooks/useAreaSearch";
import { useSitterSelection } from "../hooks/useSitterSelection";
import LocationConsentModal from "./LocationConsentModal";
import PetsitterMapPanel from "./PetsitterMapPanel";
import PetsitterSearchBar, { type PetsitterFilter } from "./PetsitterSearchBar";
import PetsitterListPanel from "./PetsitterListPanel";
import type { SitterRow } from "../types";

const SERVICE_TYPE_MAP: Record<string, string> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s.title])
);

interface PetsitterSearchClientProps {
  initialSitters?: SitterRow[];
}

export default function PetsitterSearchClient({
  initialSitters = [],
}: PetsitterSearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlDistrict = searchParams.get("district") ?? "";
  const urlDong = searchParams.get("dong") ?? "";
  const urlCity = searchParams.get("city") ?? "";
  const urlSelected = searchParams.get("selected") ?? "";

  const areaLabel = [urlCity, urlDistrict, urlDong].filter(Boolean).join(" ");
  const hasAreaFilter = !!(urlDistrict || urlDong);

  const [activeFilter, setActiveFilter] = useState<PetsitterFilter>("전체");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const sitters = initialSitters.map((row) => {
    const name = row.display_name ?? "시터";
    const { city, district, neighborhood } = parseArea(row.display_area);
    const serviceTypes = row.service_types
      .map((t) => SERVICE_TYPE_MAP[t] ?? t)
      .filter(Boolean);
    const servicePrices: Record<string, number> = {};
    for (const [rawType, price] of Object.entries(row.service_prices ?? {})) {
      servicePrices[SERVICE_TYPE_MAP[rawType] ?? rawType] = price;
    }
    return {
      id: row.id,
      name,
      initial: name.charAt(0),
      profileImage: row.profile_image ? getCloudinaryThumbnail(row.profile_image, 112) : null,
      city,
      district,
      neighborhood,
      rating: parseFloat(String(row.rating ?? 0)),
      reviewCount: row.review_count,
      price:
        activeFilter === "전체"
          ? null
          : (servicePrices[activeFilter] ?? row.base_price ?? 0),
      services: [...new Set(serviceTypes)],
      lat: parseFloat(String(row.latitude)),
      lng: parseFloat(String(row.longitude)),
    };
  });

  const {
    basePosition,
    setBasePosition,
    baseLabel,
    setBaseLabel,
    locationLoading,
    locationError,
    showLocationModal,
    dismissLocationModal,
    requestLocation,
  } = usePetsitterLocation({ urlCity, urlDistrict, urlDong });

  const { selectedSitterId, setSelectedSitterId, registerCardRef } = useSitterSelection(
    sitters,
    urlSelected,
  );

  const {
    areaQuery,
    setAreaQuery,
    areaSuggestions,
    showSuggestions,
    areaSearchRef,
    selectAreaSuggestion,
    clearAreaFilter,
  } = useAreaSearch({
    areaLabel,
    onLocationSelected: (lat, lng, label) => {
      setBasePosition({ lat, lng });
      setBaseLabel(label);
    },
    onClear: () => setSelectedSitterId(null),
  });

  const sittersWithDistance = sitters.map((sitter) => ({
    ...sitter,
    distanceKm: calculateDistanceKm(basePosition, { lat: sitter.lat, lng: sitter.lng }),
  }));

  const filtered = sittersWithDistance
    .filter((s) => {
      const matchFilter = activeFilter === "전체" ? true : s.services.includes(activeFilter);
      const matchSearch = hasAreaFilter || areaQuery === "" || s.name.includes(areaQuery);
      return matchFilter && matchSearch;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const listHeading = hasAreaFilter
    ? `${areaLabel} 펫시터 · ${filtered.length}명`
    : `${baseLabel} 기준 가까운 순 · ${filtered.length}명`;

  return (
    <>
      {showLocationModal && (
        <LocationConsentModal onDismiss={dismissLocationModal} onConfirm={requestLocation} />
      )}

      <div className="bg-white overflow-hidden h-[calc(100vh-64px)]">
        <div className="relative flex flex-col md:flex-row h-full">
          <PetsitterMapPanel
            markers={filtered.map(({ lat, lng, id, name, district, neighborhood, distanceKm }) => ({
              lat,
              lng,
              id,
              name,
              district,
              neighborhood,
              distanceKm,
            }))}
            center={basePosition}
            basePosition={basePosition}
            selectedMarkerId={selectedSitterId}
            onMarkerClick={(id) => {
              setSelectedSitterId(id);
              setSidebarOpen(true);
            }}
            locationLoading={locationLoading}
            locationError={locationError}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(true)}
            onRequestLocation={requestLocation}
          />

          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="펫시터 목록 접기"
              className="hidden md:flex absolute top-2 right-[520px] z-20 w-8 h-14 rounded-l-xl rounded-r-none bg-white shadow-[-2px_2px_8px_rgba(0,0,0,0.08)] items-center justify-center hover:bg-orange-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-orange-500 rotate-180" />
            </button>
          )}

          <div
            className={`w-full bg-white flex flex-col overflow-hidden transition-all duration-200 ${
              sidebarOpen
                ? "flex-1 md:flex-none md:w-[520px]"
                : "flex-1 md:flex-none md:w-0 md:opacity-0 md:pointer-events-none"
            }`}
          >

            <PetsitterSearchBar
              areaQuery={areaQuery}
              onAreaQueryChange={setAreaQuery}
              areaSearchRef={areaSearchRef}
              showSuggestions={showSuggestions}
              areaSuggestions={areaSuggestions}
              onSelectSuggestion={selectAreaSuggestion}
              onClearAreaFilter={clearAreaFilter}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              hasAreaFilter={hasAreaFilter}
              areaLabel={areaLabel}
            />

            <PetsitterListPanel
              listHeading={listHeading}
              sitters={filtered}
              selectedSitterId={selectedSitterId}
              onSelectSitter={setSelectedSitterId}
              onConfirmSitter={(id) => router.push(`/petsitters/${id}`)}
              registerCardRef={registerCardRef}
              hasAreaFilter={hasAreaFilter}
              areaLabel={areaLabel}
              onClearAreaFilter={clearAreaFilter}
            />
          </div>
        </div>
      </div>
    </>
  );
}
