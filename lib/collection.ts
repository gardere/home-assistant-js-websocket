import Store from "./store";
import { Connection } from "./connection";
import { UnsubscribeFunc } from "./types";

// fetchCollection returns promise that resolves to current value of collection.
// subscribeUpdates(connection, store) returns promise that resolves
// to an unsubscription function.

export default function createCollection<Auth, State>(
  key: string,
  fetchCollection: (conn: Connection<Auth>) => Promise<State>,
  subscribeUpdates: (
    conn: Connection<Auth>,
    store: Store<State>
  ) => Promise<UnsubscribeFunc>,
  conn: Connection<Auth>,
  onChange: (state: State) => void
): UnsubscribeFunc {
  if (key in conn) {
    return conn[key](onChange);
  }

  let unsubProm: Promise<UnsubscribeFunc>;

  const store = new Store<State>(() => {
    unsubProm.then(unsub => unsub());
    conn.removeEventListener("ready", refresh);
    delete conn[key];
  });

  conn[key] = store.subscribe;

  // Subscribe to changes
  unsubProm = subscribeUpdates(conn, store);

  async function refresh() {
    store.setState(await fetchCollection(conn), true);
  }

  // Fetch when connection re-established.
  conn.addEventListener("ready", refresh);

  refresh();

  return store.subscribe(onChange);
}
