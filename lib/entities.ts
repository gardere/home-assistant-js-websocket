import createCollection from "./collection";
import { HassEntities, HassEntity } from "./types";
import { Connection } from "./connection";
import Store from "./store";

type StateChangedEvent = {
  type: "state_changed";
  data: {
    entity_id: string;
    new_state: HassEntity | null;
    old_state: HassEntity | null;
  };
};

function processEvent(store: Store<HassEntities>, event: StateChangedEvent) {
  const state = store.state;
  if (state === undefined) return;

  const { entity_id, new_state } = event.data;
  if (new_state) {
    store.setState({ [new_state.entity_id]: new_state });
  } else {
    const newEntities = Object.assign({}, state);
    delete newEntities[entity_id];
    store.setState(newEntities, true);
  }
}

async function fetchEntities(conn) {
  const states = await conn.getStates();
  const entities = {};
  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    entities[state.entity_id] = state;
  }
  return entities;
}

const subscribeUpdates = <Auth>(
  conn: Connection<Auth>,
  store: Store<HassEntities>
) =>
  conn.subscribeEvents<StateChangedEvent>(
    ev => processEvent(store, ev as StateChangedEvent),
    "state_changed"
  );

export default <Auth>(
  conn: Connection<Auth>,
  onChange: (state: HassEntities) => void
) =>
  createCollection<Auth, HassEntities>(
    "_ent",
    fetchEntities,
    subscribeUpdates,
    conn,
    onChange
  );
