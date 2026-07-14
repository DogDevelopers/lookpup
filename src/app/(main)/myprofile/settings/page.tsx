import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "@/features/myprofile/components/SettingsClient";
import type { MyProfileUser, BankAccount } from "@/features/myprofile/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: bankAccount }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "full_name, email, phone_number, address, latitude, longitude, display_area, birthdate, profile_image, is_verified, role",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("bank_accounts")
      .select("bank_name, account_number, account_holder")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

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

  const initialBankAccount: BankAccount | null = bankAccount
    ? {
        bankName: bankAccount.bank_name,
        accountNumber: bankAccount.account_number,
        accountHolder: bankAccount.account_holder,
      }
    : null;

  return <SettingsClient user={myProfileUser} initialBankAccount={initialBankAccount} />;
}
