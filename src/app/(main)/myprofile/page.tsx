import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyProfileClient from "@/features/myprofile/components/MyProfileClient";
import type { MyProfileUser } from "@/features/myprofile/types";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "full_name, email, phone_number, address, display_area, birthdate, profile_image, is_verified, role",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/auth/login");
  if (!profile.is_verified) redirect("/auth/verification?next=/myprofile");

  const myProfileUser: MyProfileUser = {
    fullName: profile.full_name,
    email: profile.email,
    phoneNumber: profile.phone_number,
    address: profile.address,
    displayArea: profile.display_area,
    birthdate: profile.birthdate,
    profileImage: profile.profile_image,
    isVerified: profile.is_verified ?? false,
    role: profile.role === "admin" || profile.role === "both" ? profile.role : "owner",
  };

  return <MyProfileClient user={myProfileUser} />;
}
