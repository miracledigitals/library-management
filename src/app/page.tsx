"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastRedirectTo = useRef<string | null>(null);
  const isRedirecting = useRef(false);

  useEffect(() => {
    if (loading) return;
    const target = user ? "/dashboard" : "/login";
    if (pathname === target) return;
    if (lastRedirectTo.current === target) return;
    if (isRedirecting.current) return;
    isRedirecting.current = true;
    lastRedirectTo.current = target;
    router.replace(target);
  }, [user, loading, router, pathname]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
