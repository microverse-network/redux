import Debug from 'debug'
import { combineReducers } from 'redux'
import omit from 'lodash.omit'
import starName from 'starname'

import Agent from './Agent'
import { generateNodes } from './utils'

const debug = Debug('microverse:redux')

export const REGISTER_PEER = '@microverse/REGISTER_PEER'
export const ADD_NODE = '@microverse/ADD_NODE'
export const ADD_NODES = '@microverse/ADD_NODES'
export const REMOVE_NODE = '@microverse/REMOVE_NODE'
export const SET_NODES = '@microverse/SET_NODES'
export const SET_CLUSTERS = '@microverse/SET_CLUSTERS'
export const ADD_CLUSTER = '@microverse/ADD_CLUSTER'
export const ADD_CONNECTION = '@microverse/ADD_CONNECTION'
export const ADD_CONNECTIONS = '@microverse/ADD_CONNECTIONS'

const GENERATE_NODES_ON_START = true
const TOTAL_NODE_COUNT = 249

const instances = (state = {}, { type, payload } = {}) => {
  if (type === REGISTER_PEER) {
    return {
      ...state,
      [payload.peer._id]: payload.peer,
    }
  }

  return state
}

const nodes = (state = {}, { type, payload } = {}) => {
  if (type === ADD_NODES) {
    const { nodes } = payload
    return nodes.reduce((state, { node, instance }) => {
      return {
        ...state,
        [node._id]: {
          ...node,
          instanceId: instance._id,
          isMe: instance._id === node._id,
        },
      }
    }, state)
  } else if (type === ADD_NODE) {
    const { instance, node } = payload
    return {
      ...state,
      [node._id]: {
        ...node,
        instanceId: instance._id,
        isMe: instance._id === node._id,
      },
    }
  } else if (type === REMOVE_NODE) {
    return omit(state, payload.node._id)
  } else if (type === SET_NODES) {
    return payload.nodes.reduce(
      (result, node) => ({ ...result, [node._id]: node }),
      {},
    )
  }

  return state
}

const clusters = (state = {}, { type, payload } = {}) => {
  if (type === SET_CLUSTERS) {
    const { clusters, instance } = payload

    return clusters.reduce(
      (result, cluster) => ({
        ...result,
        [cluster._id]: {
          ...cluster,
          niceName: starName(),
          instanceId: instance._id,
        },
      }),
      {},
    )
  } else if (type === ADD_CLUSTER) {
    const { cluster, instance } = payload

    return {
      ...state,
      [cluster._id]: {
        ...cluster,
        niceName: starName(),
        instanceId: instance._id,
      },
    }
  }

  return state
}

const connections = (state = {}, { type, payload } = {}) => {
  if (type === ADD_CONNECTION) {
    const { from, to } = payload

    const cons = state[from._id] || {}
    cons[to._id] = to._id
    state[from._id] = cons

    return { ...state }
  }

  return state
}

export const reducer = combineReducers({
  instances,
  nodes,
  clusters,
  connections,
})

export const addNode = ({ node, instance }) => ({
  type: ADD_NODE,
  payload: { node, instance },
})

export const removeNode = ({ node, instance }) => ({
  type: REMOVE_NODE,
  payload: { node, instance },
})

export const setNodes = ({ nodes, instance }) => ({
  type: SET_NODES,
  payload: { nodes, instance },
})

export const addCluster = ({ id, cluster, instance }) => ({
  type: ADD_CLUSTER,
  payload: { id, cluster, instance },
})

export const setClusters = ({ clusters, instance }) => ({
  type: SET_CLUSTERS,
  payload: { clusters, instance },
})

export const addConnection = ({ from, to, instance }) => ({
  type: ADD_CONNECTION,
  payload: { from, to, instance },
})

export const bindEvents = instance => dispatch => {
  const agent = new Agent(instance.db)

  agent
    .on('cluster.set', (id, cluster) => {
      debug('cluster.set %s %O', id, cluster)
      dispatch(addCluster({ id, cluster, instance }))
    })
    .on('cluster.join', node => {
      debug('cluster.join node: %s cluster: %s', node._id, node.clusterId)
      dispatch(addNode({ node, instance }))
    })
    .on('node.remove', node => {
      debug('node.remove node: %s cluster: %s', node._id, node.clusterId)
      dispatch(removeNode({ node, instance }))
    })
    .on('node.add', node => {
      debug('node.add node: %s cluster: %s', node._id, node.clusterId)
      dispatch(addNode({ node, instance }))
    })
    .on('nodes.initial', nodes => {
      const { length } = nodes
      const clusterId = length ? nodes[0].clusterId : ''
      debug('nodes.initial nodes amount: %s cluster: %s', length, clusterId)
      const connections = nodes.reduce((conns, node) => {
        node.connections.forEach(conn => {
          const finder = n => n._id === conn
          const to = nodes.find(finder)
          to && conns.push({ from: node, to })
        })
        return conns
      }, [])
      nodes = nodes.map(node => ({ node, instance }))
      dispatch({ type: ADD_NODES, payload: { nodes } })
      dispatch({ type: ADD_CONNECTIONS, payload: { connections } })
      if (GENERATE_NODES_ON_START) {
        const generated = generateNodes(null, null, nodes[0], TOTAL_NODE_COUNT)
        dispatch({ type: ADD_NODES, payload: { nodes: generated.nodes } })
        dispatch({
          type: ADD_CONNECTIONS,
          payload: { connections: generated.connections },
        })
      }
    })
    .on('peer.add', (from, to) => {
      debug('peer.add from: %s to: %s', from._id, to._id)
      dispatch(addConnection({ from, to, instance }))
    })
}

export const registerPeer = peer => dispatch => {
  bindEvents(peer)(dispatch)

  dispatch({
    type: REGISTER_PEER,
    payload: { peer },
  })
}

export const getInstance = state => id => state.microverse.instances[id]
