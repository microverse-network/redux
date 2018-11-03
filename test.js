import test from 'tape'

import { reducer, registerPeer, getPeer } from './src'

test('it works', t => {
  t.ok(true)
  t.end()
})

test('it initializes the sub reducers', t => {
  const newState = reducer()

  t.deepEqual(newState, {
    instances: {},
    nodes: {},
    clusters: {},
    connections: {},
  })

  t.end()
})
