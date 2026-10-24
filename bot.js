// Keepalive bot for a free Minecraft host that sleeps when no players are online.
// Logs in as a real player, stays in the world, reconnects forever.
// The join attempt itself is what wakes a sleeping server ("Asleep - join to start").
//
// Env: MC_HOST, MC_PORT, MC_USER, MAX_MINUTES, MC_VERSION
const mineflayer = require('mineflayer')

const HOST = process.env.MC_HOST || 'btppmc.mcsh.gg'
const PORT = parseInt(process.env.MC_PORT || '25565', 10)
const USER = process.env.MC_USER || 'keepalive'
const MAX_MIN = parseFloat(process.env.MAX_MINUTES || '330')
const DEADLINE = Date.now() + MAX_MIN * 60 * 1000

let bot = null
let attempts = 0
let lastKick = ''

function log(...a) { console.log(new Date().toISOString(), ...a) }

function connect() {
  if (Date.now() > DEADLINE) { log('deadline reached, exiting cleanly'); process.exit(0) }
  log('connecting', HOST + ':' + PORT, 'as', USER, 'attempt', attempts + 1)
  bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USER,
    auth: 'offline',
    version: process.env.MC_VERSION || false, // false = auto-detect via status ping
    hideErrors: true,
    checkTimeoutInterval: 180000,
  })

  bot.once('spawn', () => {
    attempts = 0
    lastKick = ''
    log('SPAWNED - session held')
    setInterval(() => {
      try {
        if (!bot.entity) return
        bot.look(bot.entity.yaw + (Math.random() - 0.5) * 0.4, 0, true)
        bot.swingArm('right')
      } catch (e) { /* ignore */ }
    }, 45000)
  })

  bot.on('kicked', (r) => { lastKick = typeof r === 'string' ? r : JSON.stringify(r); log('kicked:', lastKick) })
  bot.on('error', (e) => log('error:', e.message))
  bot.on('end', (reason) => {
    log('disconnected:', reason)
    attempts++
    // booting/queued servers need patience; real failures retry fast
    const slow = /queued|start|offline|asleep/i.test(lastKick)
    const wait = slow ? 120000 : Math.min(15000 + attempts * 5000, 60000)
    log('retrying in', wait / 1000 + 's')
    setTimeout(connect, wait)
  })
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { log(sig); try { bot && bot.quit() } catch (e) {} process.exit(0) })
}

connect()
