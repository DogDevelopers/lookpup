export interface CoordResult {
  lat: number;
  lng: number;
  addressName: string;
}

export interface RegionResult {
  sido: string;
  sigungu: string;
  dong: string;
}

export interface AddressSuggestion {
  addressName: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  lat: number;
  lng: number;
}

export function searchAddressList(query: string): Promise<AddressSuggestion[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve([]);
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(
      query,
      (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve(
            result.map((r) => ({
              addressName: r.road_address?.address_name ?? r.address_name,
              roadAddress: r.road_address?.address_name ?? null,
              jibunAddress: r.address?.address_name ?? r.address_name,
              lat: parseFloat(r.y),
              lng: parseFloat(r.x),
            })),
          );
        } else {
          resolve([]);
        }
      },
      { size: 10 },
    );
  });
}

export function coordToAddress(lat: number, lng: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve(null);
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result.length) {
        resolve(null);
        return;
      }
      const road = result[0].road_address?.address_name;
      const jibun = result[0].address?.address_name;
      resolve(road ?? jibun ?? null);
    });
  });
}

export function searchAddressToCoord(query: string): Promise<CoordResult | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve(null);
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(query, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
          addressName: result[0].address_name,
        });
      } else {
        resolve(null);
      }
    });
  });
}

export function searchPlaceToCoord(query: string): Promise<CoordResult | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve(null);
      return;
    }
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(query, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
          addressName: result[0].place_name,
        });
      } else {
        resolve(null);
      }
    });
  });
}

export interface AreaSuggestion {
  type: 'area';
  label: string;
  city: string;
  district: string;
  dong: string;
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  type: 'place';
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export type LocationSuggestion = AreaSuggestion | PlaceSuggestion;

export function searchAreaList(query: string): Promise<AreaSuggestion[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve([]);
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(
      query,
      (result, status) => {
        if (status !== window.kakao.maps.services.Status.OK || !result.length) {
          resolve([]);
          return;
        }

        const seen = new Set<string>();
        const areas: AreaSuggestion[] = [];

        for (const r of result) {
          const addr = r.address ?? r;
          const city = addr.region_1depth_name ?? "";
          const district = addr.region_2depth_name ?? "";
          const dong = addr.region_3depth_name ?? "";

          if (!district) continue;

          const distKey = `${city}|${district}`;
          if (!seen.has(distKey)) {
            seen.add(distKey);
            areas.push({
              type: 'area',
              label: [city, district].filter(Boolean).join(" "),
              city,
              district,
              dong: "",
              lat: parseFloat(r.y),
              lng: parseFloat(r.x),
            });
          }

          if (dong) {
            const dongKey = `${city}|${district}|${dong}`;
            if (!seen.has(dongKey)) {
              seen.add(dongKey);
              areas.push({
                type: 'area',
                label: [city, district, dong].filter(Boolean).join(" "),
                city,
                district,
                dong,
                lat: parseFloat(r.y),
                lng: parseFloat(r.x),
              });
            }
          }

          if (areas.length >= 8) break;
        }

        resolve(areas);
      },
      { size: 15 },
    );
  });
}

export function searchPlaceList(query: string): Promise<PlaceSuggestion[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve([]);
      return;
    }
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(
      query,
      (result, status) => {
        if (status !== window.kakao.maps.services.Status.OK || !result.length) {
          resolve([]);
          return;
        }
        resolve(
          result.slice(0, 5).map((r) => ({
            type: 'place' as const,
            label: r.place_name,
            address: r.road_address_name || r.address_name,
            lat: parseFloat(r.y),
            lng: parseFloat(r.x),
          })),
        );
      },
    );
  });
}

export function coordToRegion(lat: number, lng: number): Promise<RegionResult | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      resolve(null);
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2RegionCode(lng, lat, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result.length) {
        resolve(null);
        return;
      }
      const region = result.find((r) => r.region_type === "H") ?? result[0];
      resolve({
        sido: region.region_1depth_name,
        sigungu: region.region_2depth_name,
        dong: region.region_3depth_name,
      });
    });
  });
}
