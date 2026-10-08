import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";
import { createUserManagementHandler } from "./handler.js";

const url = Deno.env.get("SUPABASE_URL");
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !secret) throw new Error("Supabase 서버 환경변수가 필요합니다.");
const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const origins = (Deno.env.get("IEUM_ALLOWED_ORIGINS") ||
  "https://37-ieum.vercel.app,http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((value) => value.trim()).filter(Boolean);
Deno.serve(createUserManagementHandler(client, origins));
