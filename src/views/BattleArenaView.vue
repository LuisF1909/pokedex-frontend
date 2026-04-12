<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSocket } from '@/services/socket'

const route = useRoute()
const router = useRouter()
const battleId = computed(() => route.params.battleId)

// Estado de batalla
const battleData = ref(null)
const playerRole = ref(null)
const myActivePokemon = ref(0)
const opActivePokemon = ref(0)
const myTeamHP = ref([])
const opTeamHP = ref([])
const battleLog = ref([])
const battleOver = ref(false)
const battleWinner = ref('')
const waitingForOpponent = ref(false)
const moveSelected = ref(false)
const opponentChose = ref(false)
const loading = ref(true)
const errorMsg = ref('')
const lastAction = ref(null)
const animatingTurn = ref(false)
const logRef = ref(null)

// Socket
let socket = null

onMounted(() => {
  socket = getSocket()
  if (!socket || !socket.connected) {
    errorMsg.value = 'No estás conectado al servidor. Regresa al perfil e intenta de nuevo.'
    loading.value = false
    return
  }

  // Escuchar battle-start (por si llegamos antes de que empiece)
  socket.on('battle-start', handleBattleStart)
  socket.on('turn-result', handleTurnResult)
  socket.on('opponent-chose-move', () => { opponentChose.value = true })
  socket.on('opponent-disconnected', handleOpponentDisconnected)
  socket.on('error-msg', (data) => { errorMsg.value = data.message })

  // Si ya tenemos battleData guardada en sessionStorage (por si recargamos)
  const stored = sessionStorage.getItem(`battle_${battleId.value}`)
  if (stored) {
    const parsed = JSON.parse(stored)
    applyBattleData(parsed)
    loading.value = false
  }

  // Timeout por si no llegan datos
  setTimeout(() => {
    if (loading.value && !battleData.value) {
      loading.value = false
      if (!errorMsg.value) {
        errorMsg.value = 'Tiempo de espera agotado. La batalla no pudo iniciarse.'
      }
    }
  }, 30000)
})

onUnmounted(() => {
  if (socket) {
    socket.off('battle-start', handleBattleStart)
    socket.off('turn-result', handleTurnResult)
    socket.off('opponent-chose-move')
    socket.off('opponent-disconnected', handleOpponentDisconnected)
    socket.off('error-msg')
  }
})

function handleBattleStart(data) {
  applyBattleData(data)
  sessionStorage.setItem(`battle_${battleId.value}`, JSON.stringify(data))
  loading.value = false
}

function applyBattleData(data) {
  battleData.value = data
  playerRole.value = data.playerRole
  myActivePokemon.value = 0
  opActivePokemon.value = 0
  myTeamHP.value = data.myPokemon.map(p => p.stats.hp)
  opTeamHP.value = data.opponentPokemon.map(p => p.stats.hp)
  battleLog.value = []
  battleOver.value = false
  battleWinner.value = ''
  waitingForOpponent.value = false
  moveSelected.value = false
}

function selectMove(moveIndex) {
  if (moveSelected.value || battleOver.value || animatingTurn.value) return

  moveSelected.value = true
  waitingForOpponent.value = true

  socket.emit('select-move', {
    battleId: battleId.value,
    moveIndex
  })
}

async function handleTurnResult(result) {
  animatingTurn.value = true
  waitingForOpponent.value = false
  moveSelected.value = false
  opponentChose.value = false

  // Procesar cada acción secuencialmente
  for (const action of result.actions) {
    const isMyAttack = action.attacker === playerRole.value
    const attackerName = capitalize(action.attackerName)
    const defenderName = capitalize(action.defenderName)

    if (action.missed) {
      addLog(`${attackerName} usó ${action.moveName} pero ¡falló!`, 'miss')
    } else {
      let effText = ''
      if (action.effectiveness >= 2) effText = ' ¡Super efectivo!'
      else if (action.effectiveness > 0 && action.effectiveness < 1) effText = ' No muy efectivo...'
      else if (action.effectiveness === 0) effText = ' No afecta.'

      const logType = action.effectiveness >= 2 ? 'super' : action.effectiveness < 1 ? 'weak' : 'normal'
      addLog(`${attackerName} usó ${action.moveName} → ${action.damage} daño a ${defenderName}.${effText}`, logType)

      lastAction.value = {
        attacker: attackerName,
        move: action.moveName,
        damage: action.damage,
        effectiveness: action.effectiveness,
        isMyAttack
      }
    }

    // Actualizar HP desde el estado del servidor
    if (isMyAttack) {
      // Mi ataque → actualizar HP del oponente
      const opRole = playerRole.value === 'p1' ? 'p2' : 'p1'
      opTeamHP.value = [...result.hpState[opRole].hp]
      opActivePokemon.value = result.hpState[opRole].activeIndex
    } else {
      // Ataque del oponente → actualizar mi HP
      myTeamHP.value = [...result.hpState[playerRole.value].hp]
      myActivePokemon.value = result.hpState[playerRole.value].activeIndex
    }

    await delay(900)
  }

  // Procesar pokémon derrotados
  for (const fainted of result.fainted) {
    const isMyPokemon = fainted.player === playerRole.value
    const pokeName = capitalize(fainted.pokemonName)
    addLog(`💀 ${pokeName} fue derrotado!`, 'fainted')

    if (fainted.nextPokemon) {
      await delay(500)
      const nextName = capitalize(fainted.nextPokemon.name)
      if (isMyPokemon) {
        myActivePokemon.value = fainted.nextPokemon.index
        addLog(`¡Adelante, ${nextName}!`, 'switch')
      } else {
        opActivePokemon.value = fainted.nextPokemon.index
        addLog(`El oponente envía a ${nextName}!`, 'switch')
      }
    }

    await delay(500)
  }

  // Sincronizar estado final
  const myRole = playerRole.value
  const opRole = myRole === 'p1' ? 'p2' : 'p1'
  myTeamHP.value = [...result.hpState[myRole].hp]
  opTeamHP.value = [...result.hpState[opRole].hp]
  myActivePokemon.value = result.hpState[myRole].activeIndex
  opActivePokemon.value = result.hpState[opRole].activeIndex

  // Verificar fin de batalla
  if (result.battleEnd) {
    battleOver.value = true
    const iWon = result.battleEnd.winner === playerRole.value
    battleWinner.value = iWon ? 'Tú' : 'Oponente'
    addLog(iWon ? '🎉 ¡Has ganado la batalla!' : '💀 Has perdido la batalla...', iWon ? 'super' : 'fainted')
    sessionStorage.removeItem(`battle_${battleId.value}`)
  }

  animatingTurn.value = false
  scrollLogToBottom()
}

function handleOpponentDisconnected(data) {
  battleOver.value = true
  battleWinner.value = 'Tú'
  addLog(`⚡ ${data.message}`, 'switch')
  sessionStorage.removeItem(`battle_${battleId.value}`)
}

function addLog(msg, type = 'normal') {
  battleLog.value.push({ msg, type })
  scrollLogToBottom()
}

function scrollLogToBottom() {
  nextTick(() => {
    if (logRef.value) {
      logRef.value.scrollTop = logRef.value.scrollHeight
    }
  })
}

const goBack = () => {
  sessionStorage.removeItem(`battle_${battleId.value}`)
  router.push('/profile')
}

const delay = (ms) => new Promise(r => setTimeout(r, ms))
const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
const hpPercentage = (current, max) => Math.max(0, Math.round((current / max) * 100))
const hpBarClass = (pct) => {
  if (pct > 50) return 'hp-green'
  if (pct > 20) return 'hp-yellow'
  return 'hp-red'
}
</script>

<template>
  <div class="page">
    <!-- Loading -->
    <div v-if="loading" class="battle-loading-screen">
      <div class="spinner"></div>
      <p class="loading-text">Preparando la arena de batalla...</p>
      <p class="loading-sub">Cargando datos de los Pokémon</p>
    </div>

    <!-- Error -->
    <div v-else-if="errorMsg && !battleData" class="battle-error-screen">
      <p class="error-icon">⚠️</p>
      <p class="error-text">{{ errorMsg }}</p>
      <button @click="goBack" class="btn btn-accent">← Volver al Perfil</button>
    </div>

    <!-- ========== BATTLE ARENA ========== -->
    <div v-else-if="battleData && !battleOver" class="battle-arena fade-in">

      <!-- Header -->
      <div class="battle-header">
        <span class="battle-vs-label">{{ battleData.myTeamName }} vs {{ battleData.opponentTeamName }}</span>
      </div>

      <!-- Opponent side -->
      <div class="battle-side opponent-side">
        <div class="battle-poke-info">
          <span class="battle-poke-name">{{ capitalize(battleData.opponentPokemon[opActivePokemon].name) }}</span>
          <div class="battle-poke-types">
            <span v-for="t in battleData.opponentPokemon[opActivePokemon].types" :key="t" :class="['type-badge type-sm', `type-${t}`]">{{ capitalize(t) }}</span>
          </div>
          <div class="hp-bar-wrap">
            <div class="hp-bar-track">
              <div
                :class="['hp-bar-fill', hpBarClass(hpPercentage(opTeamHP[opActivePokemon], battleData.opponentPokemon[opActivePokemon].stats.hp))]"
                :style="{ width: hpPercentage(opTeamHP[opActivePokemon], battleData.opponentPokemon[opActivePokemon].stats.hp) + '%' }"
              ></div>
            </div>
            <span class="hp-text">{{ opTeamHP[opActivePokemon] }} / {{ battleData.opponentPokemon[opActivePokemon].stats.hp }}</span>
          </div>
          <div class="battle-team-icons">
            <span v-for="(p, i) in battleData.opponentPokemon" :key="p.id" :class="['team-dot', { active: i === opActivePokemon, fainted: opTeamHP[i] <= 0 }]">●</span>
          </div>
        </div>
        <div class="battle-poke-sprite opponent-sprite" :class="{ 'shake-hit': lastAction && !lastAction.missed && lastAction.isMyAttack }">
          <img :src="battleData.opponentPokemon[opActivePokemon].image" :alt="battleData.opponentPokemon[opActivePokemon].name" />
        </div>
      </div>

      <!-- Player side -->
      <div class="battle-side player-side">
        <div class="battle-poke-sprite player-sprite" :class="{ 'shake-hit': lastAction && !lastAction.missed && !lastAction.isMyAttack }">
          <img :src="battleData.myPokemon[myActivePokemon].image" :alt="battleData.myPokemon[myActivePokemon].name" />
        </div>
        <div class="battle-poke-info">
          <span class="battle-poke-name">{{ capitalize(battleData.myPokemon[myActivePokemon].name) }}</span>
          <div class="battle-poke-types">
            <span v-for="t in battleData.myPokemon[myActivePokemon].types" :key="t" :class="['type-badge type-sm', `type-${t}`]">{{ capitalize(t) }}</span>
          </div>
          <div class="hp-bar-wrap">
            <div class="hp-bar-track">
              <div
                :class="['hp-bar-fill', hpBarClass(hpPercentage(myTeamHP[myActivePokemon], battleData.myPokemon[myActivePokemon].stats.hp))]"
                :style="{ width: hpPercentage(myTeamHP[myActivePokemon], battleData.myPokemon[myActivePokemon].stats.hp) + '%' }"
              ></div>
            </div>
            <span class="hp-text">{{ myTeamHP[myActivePokemon] }} / {{ battleData.myPokemon[myActivePokemon].stats.hp }}</span>
          </div>
          <div class="battle-team-icons">
            <span v-for="(p, i) in battleData.myPokemon" :key="p.id" :class="['team-dot', { active: i === myActivePokemon, fainted: myTeamHP[i] <= 0 }]">●</span>
          </div>
        </div>
      </div>

      <!-- Move buttons or waiting indicator -->
      <div class="battle-moves">
        <div v-if="waitingForOpponent && moveSelected" class="waiting-opponent">
          <div class="spinner spinner-sm"></div>
          <span>Esperando al oponente...</span>
          <span v-if="opponentChose" class="opponent-ready">✅ ¡Oponente listo!</span>
        </div>
        <div v-else-if="animatingTurn" class="waiting-opponent">
          <span>⚔️ Resolviendo turno...</span>
        </div>
        <template v-else>
          <h3>¿Qué movimiento usar?</h3>
          <div class="moves-grid">
            <button
              v-for="(move, idx) in battleData.myPokemon[myActivePokemon].moves"
              :key="move.internalName"
              :class="['move-btn', `type-bg-${move.type}`]"
              :disabled="moveSelected"
              @click="selectMove(idx)"
            >
              <span class="move-name">{{ move.name }}</span>
              <div class="move-details">
                <span :class="['type-badge type-xs', `type-${move.type}`]">{{ capitalize(move.type) }}</span>
                <span class="move-power">PWR {{ move.power }}</span>
                <span class="move-class">{{ move.damageClass === 'special' ? '💫' : '💪' }}</span>
              </div>
            </button>
          </div>
        </template>
      </div>

      <!-- Battle log -->
      <div class="battle-log-mini" ref="logRef">
        <div v-for="(entry, i) in battleLog.slice(-6)" :key="i" :class="['log-entry', `log-${entry.type}`]">
          {{ entry.msg }}
        </div>
      </div>
    </div>

    <!-- ========== RESULT ========== -->
    <div v-else-if="battleOver" class="battle-result fade-in">
      <div :class="['battle-winner-banner', battleWinner === 'Tú' ? 'winner-you' : 'winner-opponent']">
        <h2>{{ battleWinner === 'Tú' ? '🎉 ¡Victoria!' : '💀 Derrota' }}</h2>
        <p>{{ battleData?.myTeamName }} vs {{ battleData?.opponentTeamName }}</p>
      </div>

      <div class="battle-log-full">
        <h3>Registro completo</h3>
        <div v-for="(entry, i) in battleLog" :key="i" :class="['log-entry', `log-${entry.type}`]">
          {{ entry.msg }}
        </div>
      </div>

      <button @click="goBack" class="btn btn-accent" style="margin-top:20px;">← Volver al Perfil</button>
    </div>

  </div>
</template>

<style scoped>
.battle-loading-screen,
.battle-error-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 16px;
}

.loading-text {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}
.loading-sub {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.error-icon { font-size: 3rem; }
.error-text { font-size: 1rem; color: var(--accent-red); max-width: 320px; }

.battle-header {
  text-align: center;
  margin-bottom: 12px;
}
.battle-vs-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-gold);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.battle-arena {
  padding: 8px 0;
}

.battle-side {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: var(--border-radius-lg, 12px);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.opponent-side { flex-direction: row; }
.player-side { flex-direction: row-reverse; }

.battle-poke-info { flex: 1; }
.battle-poke-name { font-weight: 700; font-size: 1rem; display: block; margin-bottom: 4px; }
.battle-poke-types { display: flex; gap: 4px; margin-bottom: 6px; }

.hp-bar-wrap { margin-bottom: 4px; }
.hp-bar-track {
  height: 10px;
  background: var(--bg-surface, #1a1a2e);
  border-radius: 5px;
  overflow: hidden;
}
.hp-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.6s ease;
}
.hp-green { background: linear-gradient(90deg, #4caf50, #66bb6a); }
.hp-yellow { background: linear-gradient(90deg, #ff9800, #ffb74d); }
.hp-red { background: linear-gradient(90deg, #f44336, #ef5350); }
.hp-text { font-size: 0.7rem; color: var(--text-muted); }

.battle-team-icons { display: flex; gap: 4px; margin-top: 4px; }
.team-dot { font-size: 0.6rem; color: var(--text-muted); }
.team-dot.active { color: var(--accent-gold); font-size: 0.75rem; }
.team-dot.fainted { color: #555; opacity: 0.4; }

.battle-poke-sprite { flex-shrink: 0; }
.battle-poke-sprite img {
  width: 110px;
  height: 110px;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
}

@keyframes shakeHit {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.shake-hit { animation: shakeHit 0.4s ease; }

.battle-moves {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg, 12px);
  padding: 14px;
  margin-bottom: 12px;
}
.battle-moves h3 {
  font-size: 0.9rem;
  margin-bottom: 10px;
  color: var(--text-secondary);
  text-align: center;
}
.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.move-btn {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  background: rgba(255,255,255,0.05);
  color: var(--text-primary, white);
}
.move-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.move-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.move-name { font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 4px; }
.move-details { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.move-power { font-size: 0.7rem; color: var(--text-muted); }
.move-class { font-size: 0.7rem; }

.waiting-opponent {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  font-size: 0.95rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}
.opponent-ready {
  color: var(--accent-gold);
  font-weight: 700;
}
.spinner-sm {
  width: 20px !important;
  height: 20px !important;
  border-width: 2px !important;
}

.battle-log-mini {
  max-height: 160px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg, 12px);
  padding: 10px 14px;
}
.log-entry {
  font-size: 0.8rem;
  padding: 3px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--text-secondary);
}
.log-super { color: #66bb6a; font-weight: 600; }
.log-weak { color: #ff9800; }
.log-miss { color: #9e9e9e; font-style: italic; }
.log-fainted { color: #f44336; font-weight: 600; }
.log-switch { color: #42a5f5; }

.battle-result { padding: 20px 0; }
.battle-winner-banner {
  text-align: center;
  padding: 30px 20px;
  border-radius: var(--border-radius-xl, 16px);
  margin-bottom: 20px;
}
.winner-you {
  background: linear-gradient(135deg, rgba(76,175,80,0.15), rgba(139,195,74,0.1));
  border: 1px solid rgba(76,175,80,0.3);
}
.winner-opponent {
  background: linear-gradient(135deg, rgba(244,67,54,0.15), rgba(229,57,53,0.1));
  border: 1px solid rgba(244,67,54,0.3);
}
.winner-you h2 { color: #66bb6a; }
.winner-opponent h2 { color: #ef5350; }
.battle-winner-banner p { color: var(--text-secondary); margin-top: 8px; }

.battle-log-full {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg, 12px);
  padding: 16px;
  max-height: 350px;
  overflow-y: auto;
}
.battle-log-full h3 {
  font-size: 0.9rem;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

/* Type background colors for move buttons */
.type-bg-normal { background: rgba(168,168,120,0.2); border-color: rgba(168,168,120,0.4); }
.type-bg-fire { background: rgba(240,128,48,0.2); border-color: rgba(240,128,48,0.4); }
.type-bg-water { background: rgba(104,144,240,0.2); border-color: rgba(104,144,240,0.4); }
.type-bg-electric { background: rgba(248,208,48,0.2); border-color: rgba(248,208,48,0.4); }
.type-bg-grass { background: rgba(120,200,80,0.2); border-color: rgba(120,200,80,0.4); }
.type-bg-ice { background: rgba(152,216,216,0.2); border-color: rgba(152,216,216,0.4); }
.type-bg-fighting { background: rgba(192,48,40,0.2); border-color: rgba(192,48,40,0.4); }
.type-bg-poison { background: rgba(160,64,160,0.2); border-color: rgba(160,64,160,0.4); }
.type-bg-ground { background: rgba(224,192,104,0.2); border-color: rgba(224,192,104,0.4); }
.type-bg-flying { background: rgba(168,144,240,0.2); border-color: rgba(168,144,240,0.4); }
.type-bg-psychic { background: rgba(248,88,136,0.2); border-color: rgba(248,88,136,0.4); }
.type-bg-bug { background: rgba(168,184,32,0.2); border-color: rgba(168,184,32,0.4); }
.type-bg-rock { background: rgba(184,160,56,0.2); border-color: rgba(184,160,56,0.4); }
.type-bg-ghost { background: rgba(112,88,152,0.2); border-color: rgba(112,88,152,0.4); }
.type-bg-dragon { background: rgba(112,56,248,0.2); border-color: rgba(112,56,248,0.4); }
.type-bg-dark { background: rgba(112,88,72,0.2); border-color: rgba(112,88,72,0.4); }
.type-bg-steel { background: rgba(184,184,208,0.2); border-color: rgba(184,184,208,0.4); }
.type-bg-fairy { background: rgba(238,153,172,0.2); border-color: rgba(238,153,172,0.4); }
</style>
