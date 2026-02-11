"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const lastRedirectTo = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const target = user ? "/dashboard" : "/login";
    if (lastRedirectTo.current === target) return;
    lastRedirectTo.current = target;
    router.replace(target);
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
