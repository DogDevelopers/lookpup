export type MyProfileRole = "owner" | "both" | "admin";

export interface MyProfileUser {
  fullName: string | null;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  displayArea: string | null;
  birthdate: string | null;
  profileImage: string | null;
  isVerified: boolean;
  role: MyProfileRole;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}
