"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function authorize() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc("is_admin");

      if (error || isAdmin !== true) {
        await supabase.auth.signOut();
        router.replace("/login?unauthorized=1");
        return;
      }

      if (active) setReady(true);
    }

    authorize();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return <div className="center-message">Verificando acceso...</div>;
  }

  return <>{children}</>;
}
