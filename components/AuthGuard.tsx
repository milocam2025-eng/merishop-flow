"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function AuthGuard({children}:Readonly<{children:React.ReactNode}>){ const [ready,setReady]=useState(false); const router=useRouter(); useEffect(()=>{ createClient().auth.getUser().then(({data})=>{ if(!data.user){router.replace("/login");return;} setReady(true); }); },[router]); if(!ready) return <div className="center-message">Cargando...</div>; return <>{children}</>; }