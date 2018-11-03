import shortid from 'shortid'

const random = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const BROWSERS = [
  'Chrome',
  'Chrome',
  'Chrome',
  'Chrome',
  'Chrome',
  'Safari',
  'Safari',
  'Safari',
  'Firefox',
  'Firefox',
  'Nodejs',
  'GoLang',
  'Opera',
  'Edge',
]

const PLATFORMS = [
  'MacIntel',
  'MacIntel',
  'MacIntel',
  'MacIntel',
  'MacIntel',
  'Win32',
  'Win32',
  'Win32',
  'Win32',
  'Win32',
  'Win32',
  'Win32',
  'FreeBSD i386',
  'FreeBSD i386',
  'WebTV OS',
]

export const getBrowser = () => BROWSERS[random(0, BROWSERS.length - 1)]
export const getPlatform = () => PLATFORMS[random(0, PLATFORMS.length - 1)]

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

let id = 0
let u = 0
export const generateNode = clusterId => {
  const _id = `${++u}${shortid.generate()}${++id}`
  const node = {
    _id,
    id: _id,
    idInt: id,
    isFake: true,
    lastSeen: Date.now(),
    connections: [],
    runtimeInfo: {
      deviceMemory: 8,
      hardwareConcurrency: 8,
      language: 'en-US',
      platform: getPlatform(),
      appVersion:
        '5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
      name: getBrowser(),
      version: '66.0',
      blink: true,
      chrome: true,
    },
    createdAt: '2018-05-28T22:06:40.256Z',
    updatedAt: '2018-05-28T22:06:40.256Z',
    clusterId,
  }
  return node
}

export const generateNodes = (instance, clusterId, fromNode, total) => {
  id = 0
  const addedNodes = []
  const addedConnections = []
  const addNode = () => {
    clusterId = clusterId || fromNode.node.clusterId
    instance = instance || fromNode.instance

    const node = generateNode(clusterId)
    const counter = node.idInt

    // const TIMER_TITLE = `add ${total} nodes`
    // if (counter === 1) console.time(TIMER_TITLE)
    // if (counter === total) console.timeEnd(TIMER_TITLE)

    addedNodes.push({ node, instance })

    if (counter === 1) {
      const to = node
      addedConnections.push({ from: fromNode.node, to })
    } else if (counter > 1) {
      const toId = getRandomInt(1, counter - 1)
      const to = addedNodes.find(n => n.node.idInt === toId).node
      addedConnections.push({ from: node, to })
    }
  }

  let i = 0
  while (i++ < total) {
    if (i === 1) {
      addNode(instance, clusterId, fromNode, total)
    } else {
      addNode(instance, clusterId, null, total)
    }
  }

  id = 0
  return { nodes: addedNodes, connections: addedConnections }
}
