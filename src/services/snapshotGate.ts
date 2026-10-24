export type SnapshotContext = { epoch: number; revision: number };
type SnapshotTicket = SnapshotContext & { request: number };

// Request order is shared by bootstrap, polling and explicit refreshes. Once a
// newer response settles, an older response cannot replace its data or error.
export function createSnapshotGate() {
  let nextRequest = 0;
  let settledRequest = 0;
  return {
    begin(context: SnapshotContext): SnapshotTicket {
      return { ...context, request: ++nextRequest };
    },
    accept(ticket: SnapshotTicket, current: SnapshotContext): boolean {
      if (
        ticket.epoch !== current.epoch ||
        ticket.revision !== current.revision ||
        ticket.request <= settledRequest
      )
        return false;
      settledRequest = ticket.request;
      return true;
    },
  };
}
