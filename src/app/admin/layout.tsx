import { AdminNav } from "@/components/AdminNav";
import { AdminImpersonationBanner } from "@/components/AdminImpersonationBanner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and is admin
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div>
      <AdminImpersonationBanner />
      <AdminNav />
      {children}
    </div>
  );
}
