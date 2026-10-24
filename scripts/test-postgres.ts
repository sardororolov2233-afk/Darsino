import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { managedSchemaSql } from "../tests/supabaseFixture";

// PGlite covers SQL behavior but has one connection. These races use independent
// psql processes against a real, isolated PostgreSQL server, with lock barriers.
const image =
  "postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb";
const container = `oqi-postgres-test-${randomUUID()}`;
const password = randomBytes(32).toString("hex");
const ids = {
  tutor: "20000000-0000-4000-8000-000000000091",
  other: "20000000-0000-4000-8000-000000000092",
  a: "10000000-0000-4000-8000-000000000091",
  b: "10000000-0000-4000-8000-000000000092",
  c: "10000000-0000-4000-8000-000000000093",
  d: "10000000-0000-4000-8000-000000000094",
};
const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;
const sessionId = (actor: string) =>
  `90000000-0000-4000-8000-${String(Object.values(ids).indexOf(actor) + 1).padStart(12, "0")}`;
const psqlArgs = [
  "exec",
  "--interactive",
  container,
  "psql",
  "--username=postgres",
  "--dbname=postgres",
  "--no-psqlrc",
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--set=ON_ERROR_STOP=1",
  "--set=VERBOSITY=verbose",
];
type Result = { code: number | null; stdout: string; stderr: string };

function startProcess(args: string[], env = process.env, timeoutMs = 25000) {
  const child = spawn("docker", args, { env, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (data: Buffer) => {
    stdout += data.toString();
  });
  child.stderr.on("data", (data: Buffer) => {
    stderr += data.toString();
  });
  const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
  const done = new Promise<Result>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  }).finally(() => clearTimeout(timer));
  return { child, done, output: () => stdout };
}

async function docker(args: string[], env = process.env, timeoutMs = 25000) {
  const process = startProcess(args, env, timeoutMs);
  process.child.stdin.end();
  return process.done;
}

async function sql(text: string) {
  const process = startProcess(psqlArgs);
  process.child.stdin.end(`set statement_timeout='15s';\n${text}\n`);
  const result = await process.done;
  assert.equal(result.code, 0, result.stderr || "PostgreSQL command failed");
  return result.stdout.trim();
}

async function until(
  check: () => boolean | Promise<boolean>,
  label: string,
  ms = 8000,
) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(30);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function authenticatedSql(
  actor: string,
  body: string,
  application: string,
  commit = true,
) {
  return `set application_name=${quote(application)};
    begin;
    set local statement_timeout='15s'; set local lock_timeout='10s';
    set local "request.jwt.claim.sub"=${quote(actor)};
    set local "request.jwt.claims"=${quote(JSON.stringify({ sub: actor, aal: "aal1", session_id: sessionId(actor) }))};
    set local role authenticated;
    ${body}
    ${commit ? "commit;" : ""}`;
}

function mutationSql(
  actor: string,
  command: Record<string, unknown>,
  application: string,
) {
  return authenticatedSql(
    actor,
    `select jsonb_build_object('id',public.darsino_mutate(${quote(JSON.stringify({ ...command, actorId: actor }))}::jsonb)->'id');`,
    application,
  );
}

async function mutate(actor: string, command: Record<string, unknown>) {
  return JSON.parse(await sql(mutationSql(actor, command, "oqi-seed"))) as {
    id: string | null;
  };
}

async function race(
  label: string,
  barrierLock: string,
  left: { actor: string; command: Record<string, unknown> },
  right: { actor: string; command: Record<string, unknown> },
) {
  const barrier = startProcess(psqlArgs);
  barrier.child.stdin.write(
    `begin; set local statement_timeout='15s'; select pg_advisory_xact_lock(${barrierLock}); select 'BARRIER_READY';\n`,
  );
  const workers: ReturnType<typeof startProcess>[] = [];
  try {
    await until(
      () => barrier.output().includes("BARRIER_READY"),
      `${label} barrier`,
    );
    for (const [index, intent] of [left, right].entries()) {
      const worker = startProcess(psqlArgs);
      worker.child.stdin.end(
        mutationSql(intent.actor, intent.command, `oqi-race-${label}-${index}`),
      );
      workers.push(worker);
    }
    // Both actual backend sessions must be blocked on an advisory lock before
    // release. This proves overlap instead of relying on scheduling or sleeps.
    await until(
      async () =>
        Number(
          await sql(`select count(*) from pg_stat_activity
      where application_name in (${quote(`oqi-race-${label}-0`)},${quote(`oqi-race-${label}-1`)})
        and wait_event_type='Lock' and wait_event='advisory';`),
        ) === 2,
      `${label} concurrent lock waiters`,
    );
  } finally {
    barrier.child.stdin.end("commit;\n");
    const released = await barrier.done;
    assert.equal(
      released.code,
      0,
      released.stderr || `${label} barrier failed`,
    );
  }
  const results = await Promise.all(workers.map((worker) => worker.done));
  for (const result of results) {
    assert.doesNotMatch(
      result.stderr,
      /40P01|deadlock detected|55P03|57014/,
      `${label}: unexpected lock failure`,
    );
  }
  return results;
}

const studentLock = (student: string) =>
  `hashtextextended(${quote(`oqi:schedule:student:${student}`)},0)`;
function oneConflict(results: Result[], label: string) {
  assert.equal(
    results.filter((r) => r.code === 0).length,
    1,
    `${label}: exactly one operation must commit`,
  );
  const rejected = results.find((r) => r.code !== 0)!;
  assert.match(rejected.stderr, /P0001/);
  assert.match(rejected.stderr, /O‘quvchining bu vaqtda boshqa darsi/);
}

async function group(
  index: number,
  tutor: string,
  day: number,
  start: number,
  published = true,
) {
  const id = `40000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const session = `60000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const stamp = (hour: number) =>
    `2099-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`;
  await sql(`insert into public.darsino_offerings(id,tutor_id,published,capacity,data)
    values(${quote(id)},${quote(tutor)},${published},10,${quote(JSON.stringify({ title: `Concurrency group ${index}`, subject: "Ingliz tili", type: "group", price: 90000, mode: "Onlayn", area: "Toshkent", location: "Test classroom", days: "Jadval bo‘yicha", time: "15:00", benefits: [] }))}::jsonb);
    insert into public.darsino_sessions(id,offering_id,starts_at,ends_at)
    values(${quote(session)},${quote(id)},${quote(stamp(start))},${quote(stamp(start + 1))});`);
  return { id, session, tutor, stamp };
}
async function apply(
  actor: string,
  offering: Awaited<ReturnType<typeof group>>,
) {
  const request = await mutate(actor, {
    type: "request",
    request: { kind: "group", tutorId: offering.tutor, groupId: offering.id },
  });
  assert.ok(request.id);
  return {
    type: "decide",
    requestId: request.id,
    decision: "approved",
    note: "",
  };
}

async function storageLifecycleRace() {
  const actor = ids.d;
  const file = JSON.parse(
    await sql(
      authenticatedSql(
        actor,
        "select public.darsino_prepare_upload('avatar','race.png','image/png',1);",
        "oqi-storage-prepare",
      ),
    ),
  ) as { id: string; bucketId: string; objectPath: string };
  const charge = () =>
    sql(`select coalesce(sum(reserved_size_bytes),0) from public.darsino_files
      where owner_id=${quote(actor)} and state<>'deleted';`);
  const before = Number(await charge());
  assert.ok(before > 0, "upload must reserve quota before inserting bytes");
  const upload = startProcess(psqlArgs);
  upload.child.stdin.write(
    authenticatedSql(
      actor,
      `insert into storage.objects(bucket_id,name,owner_id,metadata)
        values(${quote(file.bucketId)},${quote(file.objectPath)},${quote(actor)},'{"size":1,"mimetype":"image/png"}');
        select 'UPLOAD_INSERTED';`,
      "oqi-race-E-upload",
      false,
    ),
  );
  let deletion: ReturnType<typeof startProcess> | undefined;
  let release = false;
  try {
    await until(
      () => upload.output().includes("UPLOAD_INSERTED"),
      "E authenticated Storage INSERT",
    );
    deletion = startProcess(psqlArgs);
    deletion.child.stdin.end(
      authenticatedSql(
        actor,
        `select public.darsino_begin_file_delete(${quote(file.id)})->>'id';`,
        "oqi-race-E-delete",
      ) +
        authenticatedSql(
          actor,
          `select public.darsino_forget_file(${quote(file.id)});`,
          "oqi-race-E-delete",
        ),
    );
    // There is no advisory barrier in E. The real Storage INSERT policy must
    // retain a SHARE lock on its reservation row after INSERT completes. Verify
    // that this exact upload backend blocks the deletion's row-lock acquisition.
    await until(
      async () =>
        Number(
          await sql(`select count(*) from pg_stat_activity deleting
            join pg_stat_activity uploading on uploading.application_name='oqi-race-E-upload'
            where deleting.application_name='oqi-race-E-delete'
              and deleting.wait_event_type='Lock'
              and deleting.wait_event in ('transactionid','tuple')
              and uploading.state='idle in transaction'
              and uploading.pid=any(pg_blocking_pids(deleting.pid));`),
        ) === 1,
      "E deletion blocked by the actual Storage upload row lock",
    );
    release = true;
  } finally {
    upload.child.stdin.end(release ? "commit;\n" : "rollback;\n");
    const inserted = await upload.done;
    assert.equal(inserted.code, 0, inserted.stderr || "E upload failed");
  }
  assert.ok(deletion);
  const forgotten = await deletion.done;
  assert.notEqual(
    forgotten.code,
    0,
    "forget must reject an existing Storage object",
  );
  assert.match(forgotten.stderr, /P0001/);
  assert.match(forgotten.stderr, /Storage API/);
  assert.doesNotMatch(forgotten.stderr, /40P01|55P03|57014/);
  assert.equal(
    await sql(
      `select state from public.darsino_files where id=${quote(file.id)};`,
    ),
    "deleting",
  );
  assert.equal(
    Number(await charge()),
    before,
    "bytes retain their reserved quota",
  );
  assert.equal(
    Number(
      await sql(`select count(*) from storage.objects
      where bucket_id=${quote(file.bucketId)} and name=${quote(file.objectPath)};`),
    ),
    1,
  );
  assert.equal(
    Number(
      await sql(`select count(*) from storage.objects o
      join public.darsino_files f on f.bucket_id=o.bucket_id and f.object_path=o.name
      where f.owner_id=${quote(actor)} and (f.state='deleted' or f.reserved_size_bytes<=0);`),
    ),
    0,
    "no binary object may survive with a released reservation",
  );
  // This SQL DELETE simulates the managed Storage API only inside this isolated
  // schema fixture; production clients must remove bytes through the Storage API.
  await sql(
    authenticatedSql(
      actor,
      `delete from storage.objects where bucket_id=${quote(file.bucketId)} and name=${quote(file.objectPath)};
       select public.darsino_forget_file(${quote(file.id)});`,
      "oqi-storage-api-remove",
    ),
  );
  assert.equal(
    await sql(
      `select state from public.darsino_files where id=${quote(file.id)};`,
    ),
    "deleted",
  );
  assert.equal(Number(await charge()), 0);
  assert.equal(
    Number(
      await sql(`select count(*) from storage.objects
      where bucket_id=${quote(file.bucketId)} and name=${quote(file.objectPath)};`),
    ),
    0,
  );
  console.log(
    "PASS E: Storage INSERT blocks deletion until commit; quota remains charged until authenticated removal and forget.",
  );
}

async function main() {
  let cleanupRequired = false;
  try {
    cleanupRequired = true;
    const started = await docker(
      [
        "run",
        "--detach",
        "--rm",
        "--name",
        container,
        "--network=none",
        "--tmpfs=/var/lib/postgresql/data:rw,size=256m",
        "--env",
        "POSTGRES_PASSWORD",
        image,
      ],
      { ...process.env, POSTGRES_PASSWORD: password },
      120000,
    );
    assert.equal(
      started.code,
      0,
      started.stderr || "Could not start isolated PostgreSQL",
    );
    await until(
      async () =>
        (
          await docker([
            "exec",
            container,
            "sh",
            "-c",
            '[ "$(cat /proc/1/comm)" = postgres ] && pg_isready -q -U postgres -d postgres',
          ])
        ).code === 0,
      "PostgreSQL startup",
      30000,
    );
    await sql(managedSchemaSql);
    const folder = new URL("../supabase/migrations/", import.meta.url);
    const migrations = (await readdir(folder))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of migrations)
      await sql(await readFile(new URL(name, folder), "utf8"));
    console.log(`PostgreSQL 17: applied all ${migrations.length} migrations.`);
    // Exercise the managed-session checks too, using the same fixture surface as
    // SQL unit tests plus real JWT claims and independently connected sessions.
    await sql(`create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now(),updated_at timestamptz default now(),user_agent text default 'Concurrency test');
      insert into auth.users(id) values ${Object.values(ids)
        .map((id) => `(${quote(id)})`)
        .join(",")};
      insert into auth.sessions(id,user_id) values ${Object.values(ids)
        .map((id) => `(${quote(sessionId(id))},${quote(id)})`)
        .join(",")};
      update public.darsino_profiles set onboarded=true,name='Concurrency Test';
      update public.darsino_profiles set role='tutor' where id in (${quote(ids.tutor)},${quote(ids.other)});
      insert into public.darsino_tutors(user_id,verification,data)
      select id,'approved',${quote(JSON.stringify({ subjects: ["Ingliz tili"], price: 90000, modes: ["Onlayn"], availability: ["15:00"], bio: "Concurrency test teacher", proof: "Test certificate" }))}::jsonb
      from public.darsino_profiles where role='tutor';`);

    const a1 = await group(1, ids.tutor, 1, 10),
      a2 = await group(2, ids.other, 1, 10);
    const a = await race(
      "A",
      studentLock(ids.a),
      { actor: ids.tutor, command: await apply(ids.a, a1) },
      { actor: ids.other, command: await apply(ids.a, a2) },
    );
    oneConflict(a, "A");
    assert.equal(
      Number(
        await sql(
          `select count(*) from public.darsino_enrollments where student_id=${quote(ids.a)} and active;`,
        ),
      ),
      1,
    );
    console.log(
      "PASS A: cross-tutor approvals overlap; one commits and one receives a calendar conflict.",
    );

    const bGroup = await group(3, ids.tutor, 2, 10);
    const bApproval = await apply(ids.b, bGroup);
    await sql(
      `insert into public.darsino_contacts(user_id,peer_id) values(${quote(ids.tutor)},${quote(ids.b)}),(${quote(ids.b)},${quote(ids.tutor)});`,
    );
    const invitation = await mutate(ids.tutor, {
      type: "group-invite",
      offeringId: bGroup.id,
      studentId: ids.b,
    });
    const b = await race(
      "B",
      studentLock(ids.b),
      { actor: ids.tutor, command: bApproval },
      {
        actor: ids.b,
        command: {
          type: "group-invite-decide",
          invitationId: invitation.id,
          accept: true,
        },
      },
    );
    assert.ok(b.some((r) => r.code === 0));
    for (const result of b.filter((r) => r.code !== 0)) {
      assert.match(result.stderr, /P0001/);
      assert.match(result.stderr, /allaqachon/);
    }
    assert.equal(
      Number(
        await sql(
          `select count(*) from public.darsino_enrollments where student_id=${quote(ids.b)} and offering_id=${quote(bGroup.id)} and active;`,
        ),
      ),
      1,
    );
    assert.equal(
      await sql(
        `select status from public.darsino_applications where id=${quote(bApproval.requestId!)};`,
      ),
      "approved",
    );
    assert.equal(
      await sql(
        `select status from public.darsino_group_invitations where id=${quote(invitation.id!)};`,
      ),
      "accepted",
    );
    console.log(
      "PASS B: teacher approval races invitation acceptance without deadlock or duplicate enrollment.",
    );

    const c1 = await group(4, ids.tutor, 3, 10),
      c2 = await group(5, ids.other, 3, 12);
    await mutate(ids.tutor, await apply(ids.c, c1));
    const c = await race(
      "C",
      studentLock(ids.c),
      {
        actor: ids.tutor,
        command: {
          type: "update-session",
          sessionId: c1.session,
          startsAt: c1.stamp(12),
          endsAt: c1.stamp(13),
        },
      },
      { actor: ids.other, command: await apply(ids.c, c2) },
    );
    oneConflict(c, "C");
    assert.equal(
      Number(
        await sql(`select count(*) from public.darsino_enrollments a
      join public.darsino_sessions sa on sa.offering_id=a.offering_id
      join public.darsino_enrollments b on b.student_id=a.student_id and b.active and a.offering_id<b.offering_id
      join public.darsino_sessions sb on sb.offering_id=b.offering_id
      where a.student_id=${quote(ids.c)} and a.active and sa.starts_at<sb.ends_at and sa.ends_at>sb.starts_at;`),
      ),
      0,
    );
    console.log(
      "PASS C: rescheduling races admission without creating overlapping learner sessions.",
    );

    const key = "80000000-0000-4000-8000-000000000091";
    const message = {
      type: "message",
      conversationId: `dm:${ids.d}:${ids.tutor}`,
      text: "Concurrent idempotent message",
      idempotencyKey: key,
    };
    const d = await race(
      "D",
      `hashtextextended(${quote(`oqi.command:${ids.d}:${key}`)},0)`,
      { actor: ids.d, command: message },
      { actor: ids.d, command: message },
    );
    for (const result of d) assert.equal(result.code, 0, result.stderr);
    const firstId = JSON.parse(d[0].stdout.trim()).id;
    assert.ok(firstId);
    assert.equal(JSON.parse(d[1].stdout.trim()).id, firstId);
    assert.equal(
      Number(
        await sql(
          `select count(*) from public.darsino_messages where sender_id=${quote(ids.d)};`,
        ),
      ),
      1,
    );
    assert.equal(
      Number(
        await sql(
          `select count(*) from public.darsino_mutation_receipts where actor_id=${quote(ids.d)} and idempotency_key=${quote(key)};`,
        ),
      ),
      1,
    );
    assert.equal(
      Number(
        await sql(
          `select count(*) from public.darsino_notifications where message_id=${quote(firstId)};`,
        ),
      ),
      1,
    );
    console.log(
      "PASS D: concurrent identical keys return one message, one receipt and one notification.",
    );
    await storageLifecycleRace();
    console.log("All 5 PostgreSQL concurrency checks passed.");
  } finally {
    if (cleanupRequired) {
      const removed = await docker(["rm", "--force", "--volumes", container]);
      if (removed.code !== 0 && !/No such container/.test(removed.stderr))
        throw new Error(
          `Could not remove this test's PostgreSQL container: ${removed.stderr}`,
        );
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
