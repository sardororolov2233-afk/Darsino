import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

// Only the managed schemas' database surface is simulated. No binary Storage HTTP
// server, SMS provider or Realtime WebSocket is running in these tests.
export const managedSchemaSql = `
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,phone text,phone_confirmed_at timestamptz default now(),email text default (gen_random_uuid()::text||'@example.test'),email_confirmed_at timestamptz default now(),raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage,auth to anon,authenticated;
    grant all on storage.objects to anon,authenticated;
  `;

export async function supabaseFixture() {
  const db = new PGlite();
  await db.exec(managedSchemaSql);
  return db;
}

export async function applyMigrations(db: PGlite) {
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(name, folder), "utf8"));
}

// A certificate upload through the real SQL/Storage policies, before onboarding.
export async function seedTutorCertificate(db: PGlite, owner: string) {
  const previous = (
    await db.query<{ role: string; sub: string }>(
      "select current_setting('role') role,current_setting('request.jwt.claim.sub',true) sub",
    )
  ).rows[0];
  try {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    await db.exec("set role authenticated");
    const file = (
      await db.query<{
        result: { id: string; bucketId: string; objectPath: string };
      }>(
        "select public.darsino_prepare_upload('verification','certificate.pdf','application/pdf',4) result",
      )
    ).rows[0].result;
    await db.query(
      "insert into storage.objects(bucket_id,name,owner_id,metadata) values($1,$2,$3,$4)",
      [
        file.bucketId,
        file.objectPath,
        owner,
        JSON.stringify({ size: 4, mimetype: "application/pdf" }),
      ],
    );
    await db.query("select public.darsino_finalize_upload($1)", [file.id]);
    return { contactPhone: "+998901234567", certificateFileId: file.id };
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      previous.sub || "",
    ]);
    if (previous.role !== "none")
      await db.exec(`set role "${previous.role.replace(/"/g, '""')}"`);
  }
}
