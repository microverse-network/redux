import Debug from 'debug'
import { EventEmitter } from 'events'
import difference from 'lodash.difference'

const debug = Debug('microverse-redux/agent')

export default class Agent extends EventEmitter {
  clusters = {}

  nodes = {}

  constructor(database) {
    super()
    this.db = database

    this.db.get('clusters').on('change', this.onClusterChange)
    this.db.get('nodes').on('change', this.onNodeChange)

    this.on('node.add', node => {
      return this.emit(`node.add-${node._id}`, node)
    })

    this.start()
  }

  start = async () => {
    const clusters = await this.db.get('clusters').find({})
    clusters.forEach(async cluster => {
      this.clusters[cluster._id] = cluster
      this.emit('cluster.set', cluster._id, cluster)
      const nodes = await this.db.get('nodes').find({ clusterId: cluster._id })
      this.emit('nodes.initial', nodes)
      nodes.forEach(node => (this.nodes[node._id] = node))
    })
  }

  onClusterChange = (id, cluster) => {
    if (!cluster) {
      return
    }

    if (this.clusters[id]) {
      debug('cluster %s is updated %o', id, cluster)
    } else {
      debug('new cluster is created %s %o', id, cluster)
    }
    this.clusters[id] = cluster
    this.emit('cluster.set', id, cluster)
  }

  onNodeChange = (id, node) => {
    if (!node) {
      const removed = this.nodes[id]

      if (removed) {
        debug('removing node %O', removed)
        this.emit('node.remove', this.nodes[removed._id])
        delete this.nodes[removed._id]
      }
      return
    }

    const current = this.nodes[id]
    if (current) {
      if (!current.clusterId && node.clusterId) {
        this.nodes[id].clusterId = node.clusterId
        this.emit('cluster.join', this.nodes[id])
      }

      return difference(node.connections, current.connections).forEach(peer => {
        debug('peer added %s %s', node._id, peer)
        const callback = () => {
          this.nodes[id].connections = node.connections
          this.emit('peer.add', node, this.nodes[peer])
        }
        if (this.nodes[peer]) {
          return callback()
        }
        this.once(`node.add-${peer}`, callback)
      })
    }

    this.nodes[id] = node
    this.emit('node.add', node)

    if (node.clusterId) {
      debug('node %s has joined to cluster %s', id, node.clusterId)
      this.emit('cluster.join', node)
    }

    node.connections &&
      node.connections.forEach(peer => {
        const callback = () => this.emit('peer.add', node, this.nodes[peer])
        if (this.nodes[peer]) {
          return callback()
        }
        this.once(`node.add-${peer}`, callback)
      })
  }
}
