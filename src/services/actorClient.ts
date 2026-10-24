type SessionSource = {
  auth: {
    getSession: () => Promise<{
      data: { session: { user: { id: string }; access_token: string } | null };
      error: { message: string } | null;
    }>;
  };
};
type ActorClientOptions = {
  auth: {
    persistSession: false;
    autoRefreshToken: false;
    detectSessionInUrl: false;
  };
  global: { headers: { Authorization: string } };
};

// Multi-step file operations must keep the session that authorized their first
// step. A later sign-in cannot replace this client’s Authorization header.
export async function bindActorClient<T>(
  source: SessionSource,
  actorId: string,
  build: (options: ActorClientOptions) => T,
): Promise<T> {
  const { data, error } = await source.auth.getSession();
  if (error) throw new Error(error.message);
  const session = data.session;
  if (!actorId || session?.user.id !== actorId || !session.access_token)
    throw new Error("Akkaunt o‘zgardi. Amalni qayta boshlang.");
  return build({
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}
