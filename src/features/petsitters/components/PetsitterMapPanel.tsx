import { ChevronRight, LocateFixed } from "lucide-react";
import KakaoMap, { type MapMarker } from "@/components/common/KakaoMap";

interface PetsitterMapPanelProps {
  markers: MapMarker[];
  center: { lat: number; lng: number };
  basePosition: { lat: number; lng: number };
  selectedMarkerId: string | null;
  onMarkerClick: (id: string) => void;
  locationLoading: boolean;
  locationError: string | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onRequestLocation: () => void;
}

export default function PetsitterMapPanel({
  markers,
  center,
  basePosition,
  selectedMarkerId,
  onMarkerClick,
  locationLoading,
  locationError,
  sidebarOpen,
  onToggleSidebar,
  onRequestLocation,
}: PetsitterMapPanelProps) {
  return (
    <div className="h-[40vh] md:h-full md:flex-1 relative overflow-hidden">
      {!sidebarOpen && (
        <button
          onClick={onToggleSidebar}
          aria-label="펫시터 목록 펼치기"
          className="hidden md:flex absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white shadow-md items-center justify-center hover:bg-orange-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-orange-500" />
        </button>
      )}

      <button
        onClick={onRequestLocation}
        aria-label="내 위치로 지도 이동"
        title="내 위치로 지도 이동"
        className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-orange-50 transition-colors"
      >
        <LocateFixed className="w-5 h-5 text-orange-500" />
      </button>

      {locationLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-full shadow text-sm text-orange-500 font-medium">
          위치 확인 중...
        </div>
      )}
      {locationError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-full shadow text-sm text-red-500 font-medium whitespace-nowrap max-w-[90vw] text-center">
          {locationError}
        </div>
      )}
      <KakaoMap
        markers={markers}
        center={center}
        basePosition={basePosition}
        level={7}
        selectedMarkerId={selectedMarkerId}
        onMarkerClick={(id) => onMarkerClick(String(id))}
      />
    </div>
  );
}
