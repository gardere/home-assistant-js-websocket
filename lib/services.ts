import createCollection from "./collection";
import { HassServices } from "./types";
import { Connection } from "./connection";
import Store from "./store";

type ServiceRegisteredEvent = {
  data: {
    domain: string;
    service: string;
  };
};

type ServiceRemovedEvent = {
  data: {
    domain: string;
    service: string;
  };
};

function processServiceRegistered(
  state: HassServices,
  event: ServiceRegisteredEvent
) {
  if (state === undefined) return null;

  const { domain, service } = event.data;

  const domainInfo = Object.assign({}, state[domain], {
    [service]: { description: "", fields: {} }
  });

  return { [domain]: domainInfo };
}

function processServiceRemoved(
  state: HassServices,
  event: ServiceRemovedEvent
) {
  if (state === undefined) return null;

  const { domain, service } = event.data;
  const curDomainInfo = state[domain];

  if (!curDomainInfo || !(service in curDomainInfo)) return null;

  const domainInfo = {};
  Object.keys(curDomainInfo).forEach(sKey => {
    if (sKey !== service) domainInfo[sKey] = curDomainInfo[sKey];
  });

  return { [domain]: domainInfo };
}

const fetchServices = <Auth>(conn: Connection<Auth>) => conn.getServices();
const subscribeUpdates = <Auth>(
  conn: Connection<Auth>,
  store: Store<HassServices>
) =>
  Promise.all([
    conn.subscribeEvents<ServiceRegisteredEvent>(
      store.action(processServiceRegistered),
      "service_registered"
    ),
    conn.subscribeEvents<ServiceRemovedEvent>(
      store.action(processServiceRemoved),
      "service_removed"
    )
  ]).then(unsubs => () => unsubs.forEach(fn => fn()));

export default <Auth>(
  conn: Connection<Auth>,
  onChange: (state: HassServices) => void
) =>
  createCollection<Auth, HassServices>(
    "_srv",
    fetchServices,
    subscribeUpdates,
    conn,
    onChange
  );
