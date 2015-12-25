import uid from 'uid';
import { createMemoryHistory } from 'history';

const CHANGE_LOCATION = 'CHANGE_LOCATION';

export function changeLocation(location) {
  return { type: CHANGE_LOCATION, location, id: uid() };
}

export function historyReducer(state = { id: null }, action) {
  if(action.type === CHANGE_LOCATION) {
    return { id: action.id, location: action.location };
  }
  return state;
}

export function createReduxRouterHistory(browserHistory, store) {
  const memoryHistory = createMemoryHistory();
  let lastId = null;
  let storeListeningToBrowser = true;
  let browserListeningToStore = true;

  store.subscribe(() => {
    const history = store.getState().history;

    if(lastId !== history.id) {
      lastId = history.id;

      console.log("pushing to memoryHistory from store subscriber");
      memoryHistory.push(history.location);

      if(browserListeningToStore) {
        console.log("pushing to browserHistory from store subscriber");
        storeListeningToBrowser = false;
        browserHistory.push(history.location);
        storeListeningToBrowser = true;
      }
    }
  });

  browserHistory.listen((location) => {
    if(storeListeningToBrowser) {
      console.log("got new location in browserHistory listener, sending to store")
      browserListeningToStore = false;
      store.dispatch(changeLocation(location));
      browserListeningToStore = true;
    }
  });

  const reduxRouterHistory = Object.assign({}, memoryHistory, {
    push: function(location) {
      console.log("Got push in reduxRouterHistory (i.e. <Link/>). sending to store");
      store.dispatch(changeLocation(location));
    }
  });

  return reduxRouterHistory;

}
