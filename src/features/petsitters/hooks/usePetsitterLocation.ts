"use client";

import { useEffect, useRef, useState } from "react";
import {
  coordToRegion,
  searchAddressToCoord,
  searchPlaceToCoord,
} from "@/lib/kakao-geocode";

export const DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 };

const CONSENT_STORAGE_KEY = "location_consent";

interface UsePetsitterLocationOptions {
  urlCity: string;
  urlDistrict: string;
  urlDong: string;
}

// TODO: 로그인 사용자의 위치 동의 여부는 features/auth 연동 후
// Supabase users.location_consent로 옮겨서 기기 간에도 유지되게 한다.
// 지금은 로그인 여부와 무관하게 localStorage만 사용.
export function usePetsitterLocation({
  urlCity,
  urlDistrict,
  urlDong,
}: UsePetsitterLocationOptions) {
  const [basePosition, setBasePosition] = useState(DEFAULT_CENTER);
  const [baseLabel, setBaseLabel] = useState("강남역");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const consentHandledRef = useRef(false);

  async function requestLocationSilently() {
    if (!navigator.geolocation) {
      setLocationError("이 브라우저는 위치 서비스를 지원하지 않아요.");
      return;
    }
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state === "denied") {
          setLocationError("브라우저 위치 권한이 차단되어 있어요. 브라우저 설정에서 위치 권한을 허용해 주세요.");
          return;
        }
      } catch {
        // 일부 브라우저는 geolocation permission query를 지원하지 않음 - 아래 getCurrentPosition으로 폴백
      }
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setBasePosition(pos);
        setBaseLabel("현재 위치");
        const region = await coordToRegion(pos.lat, pos.lng);
        if (region) setBaseLabel(`현재 위치 (${region.dong || region.sigungu})`);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("브라우저 위치 권한이 차단되어 있어요. 브라우저 설정에서 위치 권한을 허용해 주세요.");
        } else {
          setLocationError("위치를 가져올 수 없어요. 강남역 기준으로 표시됩니다.");
        }
      },
      { timeout: 10000 },
    );
  }

  useEffect(() => {
    if (!urlDistrict) return;
    const query = [urlCity, urlDistrict, urlDong].filter(Boolean).join(" ");
    async function run() {
      const result = (await searchAddressToCoord(query)) ?? (await searchPlaceToCoord(query));
      if (result) setBasePosition({ lat: result.lat, lng: result.lng });
    }
    if (window.kakao?.maps?.load) {
      window.kakao.maps.load(run);
    } else {
      const MAX_ATTEMPTS = 100; // 100ms * 100 = 10초
      let attempts = 0;
      const id = setInterval(() => {
        attempts += 1;
        if (window.kakao?.maps?.load) {
          clearInterval(id);
          window.kakao.maps.load(run);
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(id);
        }
      }, 100);
      return () => clearInterval(id);
    }
  }, [urlCity, urlDistrict, urlDong]);

  useEffect(() => {
    if (consentHandledRef.current) return;
    consentHandledRef.current = true;
    if (urlDistrict) return;
    const hasConsent = localStorage.getItem(CONSENT_STORAGE_KEY) === "true";
    if (hasConsent) {
      // 브라우저 Geolocation API 호출이라 effect가 맞는 위치
      // eslint-disable-next-line react-hooks/set-state-in-effect
      requestLocationSilently();
    } else {
      setShowLocationModal(true);
    }
  }, [urlDistrict]);

  async function requestLocation() {
    setShowLocationModal(false);
    localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    requestLocationSilently();
  }

  return {
    basePosition,
    setBasePosition,
    baseLabel,
    setBaseLabel,
    locationLoading,
    locationError,
    showLocationModal,
    dismissLocationModal: () => setShowLocationModal(false),
    requestLocation,
  };
}
