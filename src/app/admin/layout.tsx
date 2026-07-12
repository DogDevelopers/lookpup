// TODO: 로그인 여부 + role="admin" 확인 후 리다이렉트 (features/auth 이식 후).
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
