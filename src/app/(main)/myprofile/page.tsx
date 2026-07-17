import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMySitterProfile } from "@/features/sitter-register/actions";
import { getMyReservations, getMySitterReservations } from "@/features/reservations/actions";
import { getMyWrittenReviews, getReceivedReviews } from "@/features/reviews/actions";
import { getMyRequests } from "@/features/board/queries";
import { getMyEarnings } from "@/features/earnings/actions";
import MyProfileClient from "@/features/myprofile/components/MyProfileClient";
import type { MyProfileUser, MyProfileSitterSummary } from "@/features/myprofile/types";
import type { EarningsData } from "@/features/earnings/types";
import type { MyPet } from "@/features/pet-register/components/MyPetsClient";

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
  const isSitter = role === "both" || role === "admin";

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

  const emptyEarnings: EarningsData = {
    availableBalance: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    pendingSettlement: 0,
    bankAccount: null,
    monthly: [],
    yearly: [],
    rows: [],
  };

  const [sitterDetail, bookings, works, pets, posts, writtenReviews, receivedReviews, earnings] =
    await Promise.all([
      isSitter ? getMySitterProfile() : Promise.resolve(null),
      getMyReservations(),
      isSitter ? getMySitterReservations() : Promise.resolve([]),
      supabase
        .from("pets")
        .select("id, name, animal_type, breed, age, gender, weight, neutered, caution")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      getMyRequests(),
      getMyWrittenReviews(),
      isSitter ? getReceivedReviews() : Promise.resolve([]),
      isSitter ? getMyEarnings() : Promise.resolve(emptyEarnings),
    ]);

  let sitterSummary: MyProfileSitterSummary | null = null;
  if (sitterDetail) {
    sitterSummary = {
      id: sitterDetail.id,
      rating: sitterDetail.rating,
      reviewCount: sitterDetail.review_count,
      career: sitterDetail.career,
      services: sitterDetail.services.map((s) => s.title ?? s.service_type),
    };
  }

  const myPets: MyPet[] = (pets.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    animalType: row.animal_type,
    breed: row.breed,
    age: row.age,
    gender: row.gender === "female" ? "female" : "male",
    weight: row.weight != null ? Number(row.weight) : null,
    neutered: row.neutered,
    caution: row.caution,
  }));

  return (
    <Suspense>
      <MyProfileClient
        user={myProfileUser}
        sitter={sitterSummary}
        bookings={bookings}
        works={works}
        pets={myPets}
        posts={posts}
        writtenReviews={writtenReviews}
        receivedReviews={receivedReviews}
        earnings={earnings}
      />
    </Suspense>
  );
}
