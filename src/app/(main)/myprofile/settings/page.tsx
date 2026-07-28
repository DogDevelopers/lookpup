import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "@/features/myprofile/components/SettingsClient";
import type { MyProfileUser } from "@/features/myprofile/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "full_name, email, phone_number, address, latitude, longitude, display_area, birthdate, profile_image, is_verified, role",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/auth/login");

  const myProfileUser: MyProfileUser = {
    fullName: profile.full_name,
    email: profile.email,
    phoneNumber: profile.phone_number,
    address: profile.address,
    latitude: profile.latitude != null ? Number(profile.latitude) : null,
    longitude: profile.longitude != null ? Number(profile.longitude) : null,
    displayArea: profile.display_area,
    birthdate: profile.birthdate,
    profileImage: profile.profile_image,
    isVerified: profile.is_verified ?? false,
    role: profile.role === "admin" || profile.role === "both" ? profile.role : "owner",
  };

  return <SettingsClient user={myProfileUser} />;
}
