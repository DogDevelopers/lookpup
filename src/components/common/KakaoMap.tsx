"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { clientEnv } from "@/lib/env";
import { formatDistance } from "@/lib/distance";
import { ORANGE_MARKER_SIZE, ORANGE_MARKER_URL } from "@/lib/map-marker";

export interface MapMarker {
  lat: number;
  lng: number;
  id: string | number;
  name?: string;
  district?: string;
  neighborhood?: string;
  distanceKm?: number;
  certified?: boolean;
}

interface KakaoMapProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  level?: number;
  className?: string;
  selectedMarkerId?: string | number | null;
  onMarkerClick?: (id: string | number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  basePosition?: { lat: number; lng: number };
  /** true면 markers[0]을 드래그로 이동시킬 수 있는 단일 마커 모드로 동작한다. */
  draggable?: boolean;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
}

const SELECTED_MARKER_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#FF6900" stroke="white" stroke-width="2.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`,
);
const SELECTED_MARKER_URL = `data:image/svg+xml,${SELECTED_MARKER_SVG}`;
const SELECTED_MARKER_SIZE = { width: 24, height: 24, offsetX: 12, offsetY: 12 };

function markerImageUrl(selected = false): string {
  return selected ? SELECTED_MARKER_URL : ORANGE_MARKER_URL;
}

function getMarkerSize(selected = false) {
  return selected ? SELECTED_MARKER_SIZE : ORANGE_MARKER_SIZE;
}

export default function KakaoMap({
  markers,
  center,
  level = 7,
  className,
  selectedMarkerId,
  onMarkerClick,
  onMapClick,
  basePosition,
  draggable = false,
  onMarkerDragEnd,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markerOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const draggableMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const polylineRef = useRef<kakao.maps.Polyline | null>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  const draggableRef = useRef(draggable);
  const basePositionRef = useRef(basePosition);
  const markersRef = useRef(markers);
  const selectedMarkerIdRef = useRef(selectedMarkerId);
  const markerClickGuardRef = useRef(false);
  const markerClickGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd;
  }, [onMarkerDragEnd]);

  useEffect(() => {
    draggableRef.current = draggable;
  }, [draggable]);

  useEffect(() => {
    basePositionRef.current = basePosition;
  }, [basePosition]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    selectedMarkerIdRef.current = selectedMarkerId;
  }, [selectedMarkerId]);

  useEffect(() => {
    return () => {
      if (markerClickGuardTimerRef.current) {
        clearTimeout(markerClickGuardTimerRef.current);
      }
      clearMarkerOverlays();
      clearSelectedGraphics();
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.setMap(null);
        draggableMarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(center.lat, center.lng));
    }
  }, [center]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      const currentCenter = map.getCenter();
      map.relayout();
      map.setCenter(currentCenter);
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  function initMap() {
    if (!containerRef.current || !window.kakao?.maps || mapRef.current) return;

    const mapCenter =
      center ??
      (markers[0]
        ? { lat: markers[0].lat, lng: markers[0].lng }
        : { lat: 37.4979, lng: 127.0276 });

    mapRef.current = new window.kakao.maps.Map(containerRef.current, {
      center: new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng),
      level,
    });

    window.kakao.maps.event.addListener(
      mapRef.current,
      "click",
      (mouseEvent: kakao.maps.MapMouseEvent) => {
        if (markerClickGuardRef.current) {
          markerClickGuardRef.current = false;
          return;
        }
        clearSelectedGraphics();
        const latlng = mouseEvent.latLng;
        onMapClickRef.current?.(latlng.getLat(), latlng.getLng());
      },
    );

    drawMarkers();
  }

  function clearMarkerOverlays() {
    markerOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
    markerOverlaysRef.current = [];
  }

  function clearSelectedGraphics() {
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }

  function drawDraggableMarker() {
    const map = mapRef.current;
    if (!map) return;

    const marker = markersRef.current[0];
    if (!marker) {
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.setMap(null);
        draggableMarkerRef.current = null;
      }
      return;
    }

    const position = new window.kakao.maps.LatLng(marker.lat, marker.lng);
    const opt = getMarkerSize(false);
    const markerImage = new window.kakao.maps.MarkerImage(
      markerImageUrl(false),
      new window.kakao.maps.Size(opt.width, opt.height),
      { offset: new window.kakao.maps.Point(opt.offsetX, opt.offsetY) },
    );

    if (!draggableMarkerRef.current) {
      const kakaoMarker = new window.kakao.maps.Marker({
        map,
        position,
        image: markerImage,
        draggable: true,
      });
      draggableMarkerRef.current = kakaoMarker;
      window.kakao.maps.event.addListener(kakaoMarker, "dragend", () => {
        const pos = kakaoMarker.getPosition();
        onMarkerDragEndRef.current?.(pos.getLat(), pos.getLng());
      });
    } else {
      draggableMarkerRef.current.setPosition(position);
    }
  }

  function drawMarkers() {
    const map = mapRef.current;
    if (!map) return;

    if (draggableRef.current) {
      drawDraggableMarker();
      return;
    }

    clearMarkerOverlays();

    markersRef.current.forEach((marker) => {
      const { lat, lng, id } = marker;
      const selected = String(selectedMarkerIdRef.current) === String(id);
      const opt = getMarkerSize(selected);
      const position = new window.kakao.maps.LatLng(lat, lng);

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `${marker.name ?? "펫시터"} 선택`);
      button.style.cssText = `
        width: ${Math.max(opt.width, 44)}px;
        height: ${Math.max(opt.height, 44)}px;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
      `;

      const image = document.createElement("img");
      image.src = markerImageUrl(selected);
      image.alt = "";
      image.draggable = false;
      image.style.cssText = `
        width: ${opt.width}px;
        height: ${opt.height}px;
        pointer-events: none;
      `;
      button.appendChild(image);

      const stopMapEvent = (event: Event) => {
        event.stopPropagation();
      };
      button.addEventListener("pointerdown", stopMapEvent);
      button.addEventListener("mousedown", stopMapEvent);
      button.addEventListener("touchstart", stopMapEvent, { passive: true });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectMarker(id);
      });

      const markerOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content: button,
        xAnchor: opt.offsetX / opt.width,
        yAnchor: opt.offsetY / opt.height,
        zIndex: selected ? 20 : 10,
        clickable: true,
      });
      markerOverlay.setZIndex(selected ? 20 : 10);
      markerOverlay.setMap(map);
      markerOverlaysRef.current.push(markerOverlay);
    });
  }

  function selectMarker(id: string | number) {
    markerClickGuardRef.current = true;
    if (markerClickGuardTimerRef.current) {
      clearTimeout(markerClickGuardTimerRef.current);
    }
    markerClickGuardTimerRef.current = setTimeout(() => {
      markerClickGuardRef.current = false;
    }, 100);
    selectedMarkerIdRef.current = id;
    drawMarkers();
    showSelectedMarker(id);
    onMarkerClickRef.current?.(id);
  }

  function showSelectedMarker(id: string | number | null | undefined) {
    const map = mapRef.current;
    if (!map) return;

    if (id == null) {
      clearSelectedGraphics();
      return;
    }

    const marker = markersRef.current.find((m) => String(m.id) === String(id));
    if (!marker) return;

    const position = new window.kakao.maps.LatLng(marker.lat, marker.lng);
    map.panTo(position);
    clearSelectedGraphics();

    const base = basePositionRef.current;
    if (base) {
      polylineRef.current = new window.kakao.maps.Polyline({
        map,
        path: [new window.kakao.maps.LatLng(base.lat, base.lng), position],
        strokeWeight: 2,
        strokeColor: "#FF6900",
        strokeOpacity: 0.6,
        strokeStyle: "dashed",
      });
    }

    const { name, district, neighborhood, distanceKm } = marker;
    const inner = document.createElement("div");
    inner.style.cssText = `
      padding: 8px 10px;
      background: white;
      border: 1px solid var(--color-orange-100);
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(232,116,42,0.16);
      color: var(--color-stone-900);
      font-size: 13px;
      white-space: nowrap;
      margin-bottom: 8px;
    `;

    const nameEl = document.createElement("strong");
    nameEl.textContent = name ?? "";
    inner.appendChild(nameEl);

    const areaEl = document.createElement("div");
    areaEl.style.cssText = "color:var(--color-stone-500); font-size:12px; margin-top:2px;";
    areaEl.textContent = [district, neighborhood].filter(Boolean).join(" ");
    inner.appendChild(areaEl);

    if (distanceKm !== undefined) {
      const distanceEl = document.createElement("div");
      distanceEl.style.cssText =
        "color:var(--color-orange-500); font-size:11px; margin-top:3px;";
      distanceEl.textContent = `약 ${formatDistance(distanceKm)}`;
      inner.appendChild(distanceEl);
    }

    const content = document.createElement("div");
    content.appendChild(inner);

    overlayRef.current = new window.kakao.maps.CustomOverlay({
      position,
      content,
      yAnchor: 1,
      zIndex: 100,
    });
    overlayRef.current.setZIndex(100);
    overlayRef.current.setMap(map);
  }

  useEffect(() => {
    if (mapRef.current) {
      drawMarkers();
    }
    // drawMarkers는 ref로 최신 값을 읽으므로 의도적으로 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, selectedMarkerId]);

  useEffect(() => {
    showSelectedMarker(selectedMarkerId);
    // 위와 동일한 이유로 의도적으로 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarkerId]);

  return (
    <div style={{ width: "100%", height: "100%" }} className={className}>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${clientEnv.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onReady={() => window.kakao.maps.load(initMap)}
      />
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
