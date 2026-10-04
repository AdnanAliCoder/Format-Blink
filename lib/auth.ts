export type User={
  id:string;
  email:string;
  name:string;
  role:string;
  status:string;
  created_at:string;
  last_login:string|null;
};

// Authentication is handled by Supabase Auth.
// Browser session helpers live in lib/supabase-client.ts and
// server-side authorization helpers live in lib/supabase.ts.
