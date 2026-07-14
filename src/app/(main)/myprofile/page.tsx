import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMySitterProfile } from "@/features/sitter-register/actions";
import MyProfileClient from "@/features/myprofile/components/MyProfileClient";
import type { MyProfileUser, MyProfileSitterSummary } from "@/features/myprofile/types";

export default async function MyProfilePage() {
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
  if (!profile.is_verified) redirect("/auth/verification?next=/myprofile");

  const role = profile.role === "admin" || profile.role === "both" ? profile.role : "owner";

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
    role,
  };

  let sitterSummary: MyProfileSitterSummary | null = null;
  if (role === "both" || role === "admin") {
    const sitter = await getMySitterProfile();
    if (sitter) {
      sitterSummary = {
        id: sitter.id,
        rating: sitter.rating,
        reviewCount: sitter.review_count,
        career: sitter.career,
        services: sitter.services.map((s) => s.title ?? s.service_type),
      };
    }
  }

  return <MyProfileClient user={myProfileUser} sitter={sitterSummary} />;
}
