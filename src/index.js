import { createMemoryHistory } from 'history';

// Constants

export const UPDATE_PATH = '@@router/UPDATE_PATH'
const SELECT_STATE = state => state.routing

export function pushPath(path, state) {
  return {
    type: UPDATE_PATH,
    payload: {
      path: path,
      state: state,
      replace: false,
    }
  }
}

export function replacePath(path, state) {
  return {
    type: UPDATE_PATH,
    payload: {
      path: path,
      state: state,
      replace: true,
    }
  }
}

// Reducer

let initialState = {
  changeId: 1,
  path: undefined,
  state: undefined,
  replace: false
}

function update(state=initialState, { type, payload }) {
  if(type === UPDATE_PATH) {
    return Object.assign({}, state, {
      path: payload.path,
      changeId: state.changeId + 1,
      state: payload.state,
      replace: payload.replace
    })
  }
  return state
}

// Syncing

function createPath(location) {
  const { pathname, search, hash } = location
  let result = pathname
  if (search)
    result += search
  if (hash)
    result += hash
  return result
}

export function syncReduxAndRouter(browserHistory, store, selectRouterState = SELECT_STATE) {
  const getRouterState = () => selectRouterState(store.getState())
  if(!getRouterState()) {
    throw new Error(
      'Cannot sync router: route state does not exist (`state.routing` by default). ' +
      'Did you install the routing reducer?'
    )
  }

  const memoryHistory = createMemoryHistory();

  let lastId = null;
  let storeListeningToBrowser = true;
  let browserListeningToStore = true;

  const unsubscribeStore = store.subscribe(() => {
    const routing = getRouterState();

    if(lastId !== routing.changeId) {
      lastId = routing.changeId;

      const method = routing.replace ? 'replace' : 'push'
      console.log("sending to memoryHistory from store subscriber");
      memoryHistory[method]({
        pathname: routing.path,
        state: routing.state
      });

      if(browserListeningToStore) {
        console.log("pushing to browserHistory from store subscriber");
        storeListeningToBrowser = false;
        browserHistory[method]({
          pathname: routing.path,
          state: routing.state
        });
        storeListeningToBrowser = true;
      }
    }
  });

  const unsubscribeHistory = browserHistory.listen((location) => {
    const route = {
      path: createPath(location),
      state: location.state
    }

    if(!lastId) {
      // `initialState` *should* represent the current location when
      // the app loads, but we cannot get the current location when it
      // is defined. What happens is `history.listen` is called
      // immediately when it is registered, and it updates the app
      // state with an UPDATE_PATH action. This causes problem when
      // users are listening to UPDATE_PATH actions just for
      // *changes*, and with redux devtools because "revert" will use
      // `initialState` and it won't revert to the original URL.
      // Instead, we specialize the first route notification and do
      // different things based on it.
      initialState = {
        changeId: 1,
        path: route.path,
        state: route.state,
        replace: false
      }
    }
    if(storeListeningToBrowser) {
      console.log("got new location in browserHistory listener, sending to store")
      browserListeningToStore = false;
      const method = location.action === 'REPLACE' ? replacePath : pushPath
      store.dispatch(method(route.path, route.state));
      browserListeningToStore = true;
    }
  });

  const reduxRouterHistory = Object.assign({}, memoryHistory, {
    unsubscribe: function() {
      unsubscribeStore();
      unsubscribeHistory();
    },
    push: function(location) {
      console.log("Got push in reduxRouterHistory (i.e. <Link/>). sending to store");
      const method = location.action === 'REPLACE' ? replacePath : pushPath
      store.dispatch(method(createPath(location), location.state));
    }
  });

  return reduxRouterHistory;

}

export { update as routeReducer }
