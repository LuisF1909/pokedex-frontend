<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import PokemonPicker from '@/components/PokemonPicker.vue'
import { connectSocket, getSocket } from '@/services/socket'

const authStore = useAuthStore()
const router = useRouter()
const activeTab = ref('favorites')

// --- FAVORITOS ---
const favorites = ref([])
const loadingFavs = ref(false)
const editingFavId = ref(null)
const editingChars = ref('')

const fetchFavorites = async () => {
  loadingFavs.value = true
  try {
    const res = await api.get('/social/favorites')
    favorites.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loadingFavs.value = false
  }
}

const removeFavorite = async (id) => {
  try {
    await api.delete(`/social/favorites/${id}`)
    favorites.value = favorites.value.filter(f => f.id !== id)
  } catch (err) {
    console.error(err)
  }
}

const startEditFav = (fav) => {
  editingFavId.value = fav.id
  editingChars.value = fav.characteristics || ''
}

const cancelEditFav = () => {
  editingFavId.value = null
  editingChars.value = ''
}

const saveEditFav = async (id) => {
  try {
    await api.put(`/social/favorites/${id}`, { characteristics: editingChars.value })
    const fav = favorites.value.find(f => f.id === id)
    if (fav) fav.characteristics = editingChars.value
    editingFavId.value = null
    editingChars.value = ''
  } catch (err) {
    console.error(err)
  }
}

// --- EQUIPOS ---
const teams = ref([])
const loadingTeams = ref(false)
const showTeamForm = ref(false)
const newTeamName = ref('')
const newTeamPokemon = ref([])
const teamError = ref('')
const editingTeamId = ref(null)
const editTeamName = ref('')
const editTeamPokemon = ref([])

const fetchTeams = async () => {
  loadingTeams.value = true
  try {
    const res = await api.get('/social/teams')
    teams.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loadingTeams.value = false
  }
}

const createTeam = async () => {
  teamError.value = ''
  if (!newTeamName.value || newTeamPokemon.value.length === 0) {
    teamError.value = 'Nombre y al menos 1 Pokémon requeridos.'
    return
  }
  try {
    const ids = newTeamPokemon.value.map(p => p.id)
    await api.post('/social/teams', { name: newTeamName.value, pokemon_ids: ids })
    newTeamName.value = ''
    newTeamPokemon.value = []
    showTeamForm.value = false
    fetchTeams()
  } catch (err) {
    teamError.value = err.response?.data?.error || 'Error creando equipo'
  }
}

const startEditTeam = (team) => {
  editingTeamId.value = team.id
  editTeamName.value = team.name
  editTeamPokemon.value = team.pokemon_ids.map(id => ({
    id,
    name: `pokemon-${id}`,
  }))
}

const cancelEditTeam = () => {
  editingTeamId.value = null
  editTeamName.value = ''
  editTeamPokemon.value = []
}

const saveEditTeam = async (id) => {
  teamError.value = ''
  if (!editTeamName.value || editTeamPokemon.value.length === 0) {
    teamError.value = 'Nombre y al menos 1 Pokémon requeridos.'
    return
  }
  try {
    const ids = editTeamPokemon.value.map(p => p.id)
    await api.put(`/social/teams/${id}`, { name: editTeamName.value, pokemon_ids: ids })
    editingTeamId.value = null
    fetchTeams()
  } catch (err) {
    teamError.value = err.response?.data?.error || 'Error actualizando equipo'
  }
}

const deleteTeam = async (id) => {
  if (!confirm('¿Eliminar este equipo?')) return
  try {
    await api.delete(`/social/teams/${id}`)
    teams.value = teams.value.filter(t => t.id !== id)
  } catch (err) {
    console.error(err)
  }
}

// --- AMIGOS ---
const friends = ref([])
const loadingFriends = ref(false)
const friendCode = ref('')
const friendMsg = ref('')
const friendError = ref('')

const fetchFriends = async () => {
  loadingFriends.value = true
  try {
    const res = await api.get('/social/friends')
    friends.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loadingFriends.value = false
  }
}

const addFriend = async () => {
  friendMsg.value = ''
  friendError.value = ''
  if (!friendCode.value.trim()) return
  try {
    const res = await api.post('/social/friends/add', { friend_code: friendCode.value.trim() })
    friendMsg.value = res.data.message
    friendCode.value = ''
    fetchFriends()
  } catch (err) {
    friendError.value = err.response?.data?.error || 'Error agregando amigo'
  }
}

// --- BATALLAS EN TIEMPO REAL ---
const battleStep = ref('select-team') // select-team, select-friend, waiting, loading
const selectedMyTeam = ref(null)
const selectedFriend = ref(null)
const battleError = ref('')
const battleMsg = ref('')

// Invitación recibida
const pendingInvitation = ref(null)
const showInvitationModal = ref(false)
const acceptTeamId = ref(null)

let socket = null

const selectTeamForBattle = (team) => {
  selectedMyTeam.value = team
  battleStep.value = 'select-friend'
}

const selectFriendForBattle = (friend) => {
  selectedFriend.value = friend
  battleError.value = ''
  battleMsg.value = ''
  battleStep.value = 'waiting'

  socket = getSocket()
  if (!socket || !socket.connected) {
    battleError.value = 'No hay conexión al servidor. Recarga la página.'
    battleStep.value = 'select-friend'
    return
  }

  // Enviar reto
  socket.emit('challenge-friend', {
    friendId: friend.id,
    myTeamId: selectedMyTeam.value.id
  })
}

const setupSocketListeners = () => {
  socket = getSocket()
  if (!socket) return

  socket.on('challenge-sent', (data) => {
    battleMsg.value = data.message
  })

  socket.on('challenge-rejected', (data) => {
    battleError.value = data.message
    battleStep.value = 'select-friend'
    battleMsg.value = ''
  })

  socket.on('battle-invitation', (data) => {
    pendingInvitation.value = data
    showInvitationModal.value = true
  })

  socket.on('battle-loading', () => {
    battleStep.value = 'loading'
    battleMsg.value = 'Cargando datos de los Pokémon...'
  })

  socket.on('battle-start', (data) => {
    // Redirigir a la arena de batalla
    router.push(`/battle/${data.battleId}`)
  })

  socket.on('error-msg', (data) => {
    battleError.value = data.message
    if (battleStep.value === 'waiting' || battleStep.value === 'loading') {
      battleStep.value = 'select-friend'
    }
  })
}

const acceptInvitation = () => {
  if (!pendingInvitation.value || !acceptTeamId.value) return

  socket = getSocket()
  if (!socket) return

  socket.emit('accept-challenge', {
    challengeId: pendingInvitation.value.challengeId,
    myTeamId: acceptTeamId.value
  })

  showInvitationModal.value = false
  battleStep.value = 'loading'
  battleMsg.value = 'Cargando batalla...'
}

const rejectInvitation = () => {
  if (!pendingInvitation.value) return

  socket = getSocket()
  if (socket) {
    socket.emit('reject-challenge', {
      challengeId: pendingInvitation.value.challengeId
    })
  }

  showInvitationModal.value = false
  pendingInvitation.value = null
  acceptTeamId.value = null
}

const resetBattle = () => {
  battleStep.value = 'select-team'
  selectedMyTeam.value = null
  selectedFriend.value = null
  battleError.value = ''
  battleMsg.value = ''
}

const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'favorites') fetchFavorites()
  if (tab === 'teams') fetchTeams()
  if (tab === 'friends') fetchFriends()
  if (tab === 'battles') {
    resetBattle()
    fetchTeams()
    fetchFriends()
  }
}

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

const pokemonImage = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

onMounted(() => {
  fetchFavorites()
  // Conectar socket y escuchar eventos
  connectSocket()
  // Pequeño delay para asegurar que el socket esté listo
  setTimeout(() => {
    setupSocketListeners()
  }, 500)
})

onUnmounted(() => {
  if (socket) {
    socket.off('challenge-sent')
    socket.off('challenge-rejected')
    socket.off('battle-invitation')
    socket.off('battle-loading')
    socket.off('battle-start')
    socket.off('error-msg')
  }
})
</script>

<template>
  <div class="page">
    <!-- User Info -->
    <div class="profile-header fade-in">
      <div class="profile-avatar">{{ authStore.user?.email?.charAt(0).toUpperCase() }}</div>
      <div class="profile-info">
        <h1>{{ authStore.user?.email }}</h1>
        <p class="profile-code">Código de amigo: <strong>{{ authStore.user?.friend_code }}</strong></p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs fade-in">
      <button :class="['tab', activeTab === 'favorites' && 'active']" @click="switchTab('favorites')">⭐ Favoritos</button>
      <button :class="['tab', activeTab === 'teams' && 'active']" @click="switchTab('teams')">🎮 Equipos</button>
      <button :class="['tab', activeTab === 'friends' && 'active']" @click="switchTab('friends')">👥 Amigos</button>
      <button :class="['tab', activeTab === 'battles' && 'active']" @click="switchTab('battles')">⚔️ Batallas</button>
    </div>

    <div class="tab-content fade-in">

      <!-- FAVORITOS -->
      <div v-if="activeTab === 'favorites'">
        <div v-if="loadingFavs" class="loading-center"><div class="spinner"></div></div>
        <div v-else-if="favorites.length === 0" class="empty-state">
          <p>⭐ Aún no tienes favoritos</p>
          <p>Agrega Pokémon desde su página de detalle</p>
        </div>
        <div v-else class="favs-grid">
          <div v-for="fav in favorites" :key="fav.id" class="fav-card card">
            <img :src="pokemonImage(fav.pokemon_id)" :alt="'Pokemon ' + fav.pokemon_id" class="fav-img" />
            <div class="fav-info">
              <h3>Pokémon #{{ fav.pokemon_id }}</h3>
              <div v-if="editingFavId === fav.id" class="fav-edit">
                <input v-model="editingChars" class="form-input form-input-sm" placeholder="Notas personalizadas..." />
                <div class="fav-edit-actions">
                  <button @click="saveEditFav(fav.id)" class="btn btn-accent btn-sm">Guardar</button>
                  <button @click="cancelEditFav" class="btn btn-secondary btn-sm">Cancelar</button>
                </div>
              </div>
              <p v-else-if="fav.characteristics" class="fav-chars">{{ fav.characteristics }}</p>
              <p v-else class="fav-chars fav-chars-empty">Sin notas</p>
            </div>
            <div class="fav-actions">
              <button v-if="editingFavId !== fav.id" @click="startEditFav(fav)" class="btn btn-sm btn-secondary" title="Editar">✏️</button>
              <button @click="removeFavorite(fav.id)" class="btn btn-sm btn-secondary" title="Eliminar">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- EQUIPOS -->
      <div v-if="activeTab === 'teams'">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="font-size:1.1rem;">Mis Equipos</h2>
          <button @click="showTeamForm = !showTeamForm" class="btn btn-accent btn-sm">
            {{ showTeamForm ? 'Cancelar' : '+ Crear Equipo' }}
          </button>
        </div>

        <div v-if="showTeamForm" class="card" style="margin-bottom: 20px;">
          <div class="alert alert-error" v-if="teamError">{{ teamError }}</div>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Nombre del equipo</label>
            <input v-model="newTeamName" class="form-input" placeholder="Ej: Team Fuego" />
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Pokémon (máx 6)</label>
            <PokemonPicker v-model="newTeamPokemon" :max="6" />
          </div>
          <button @click="createTeam" class="btn btn-primary btn-sm">Crear Equipo</button>
        </div>

        <div v-if="loadingTeams" class="loading-center"><div class="spinner"></div></div>
        <div v-else-if="teams.length === 0 && !showTeamForm" class="empty-state">
          <p>🎮 Aún no tienes equipos</p>
        </div>
        <div v-else class="teams-list">
          <div v-for="team in teams" :key="team.id" class="card team-card">
            <div v-if="editingTeamId === team.id" class="team-edit-form">
              <div class="alert alert-error" v-if="teamError">{{ teamError }}</div>
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">Nombre</label>
                <input v-model="editTeamName" class="form-input" />
              </div>
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label">Pokémon</label>
                <PokemonPicker v-model="editTeamPokemon" :max="6" />
              </div>
              <div class="team-edit-actions">
                <button @click="saveEditTeam(team.id)" class="btn btn-accent btn-sm">Guardar</button>
                <button @click="cancelEditTeam" class="btn btn-secondary btn-sm">Cancelar</button>
              </div>
            </div>
            <div v-else>
              <div class="team-header">
                <h3>{{ team.name }}</h3>
                <div class="team-actions">
                  <button @click="startEditTeam(team)" class="btn btn-sm btn-secondary">✏️</button>
                  <button @click="deleteTeam(team.id)" class="btn btn-sm btn-secondary">🗑️</button>
                </div>
              </div>
              <div class="team-pokemon">
                <div v-for="pid in team.pokemon_ids" :key="pid" class="team-poke">
                  <img :src="pokemonImage(pid)" :alt="'Pokemon ' + pid" />
                  <span>#{{ pid }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AMIGOS -->
      <div v-if="activeTab === 'friends'">
        <div class="add-friend-row">
          <input v-model="friendCode" class="form-input" placeholder="Código de amigo (ej: PK-A1B2C3)" @keyup.enter="addFriend" />
          <button @click="addFriend" class="btn btn-accent btn-sm">Agregar</button>
        </div>
        <div v-if="friendMsg" class="alert alert-success" style="margin-bottom:12px;">{{ friendMsg }}</div>
        <div v-if="friendError" class="alert alert-error" style="margin-bottom:12px;">{{ friendError }}</div>

        <div v-if="loadingFriends" class="loading-center"><div class="spinner"></div></div>
        <div v-else-if="friends.length === 0" class="empty-state">
          <p>👥 Aún no tienes amigos</p>
          <p>Comparte tu código: <strong>{{ authStore.user?.friend_code }}</strong></p>
        </div>
        <div v-else class="friends-list">
          <div v-for="friend in friends" :key="friend.id" class="card friend-card">
            <div class="friend-avatar">{{ friend.email.charAt(0).toUpperCase() }}</div>
            <div class="friend-info">
              <h3>{{ friend.email }}</h3>
              <span class="friend-code-sm">{{ friend.friend_code }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- BATALLAS EN TIEMPO REAL -->
      <div v-if="activeTab === 'battles'">
        <div v-if="battleError" class="alert alert-error" style="margin-bottom:12px;">{{ battleError }}</div>
        <div v-if="battleMsg" class="alert alert-success" style="margin-bottom:12px;">{{ battleMsg }}</div>

        <!-- Step 1: Select team -->
        <div v-if="battleStep === 'select-team'">
          <h2 class="battle-step-title">1. Elige tu equipo</h2>
          <div v-if="teams.length === 0" class="empty-state"><p>Necesitas al menos un equipo para batallar</p></div>
          <div v-else class="battle-select-grid">
            <div v-for="team in teams" :key="team.id" class="card battle-select-card" @click="selectTeamForBattle(team)">
              <h3>{{ team.name }}</h3>
              <div class="team-pokemon-mini">
                <img v-for="pid in team.pokemon_ids" :key="pid" :src="pokemonImage(pid)" :alt="'#'+pid" />
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Select friend to challenge -->
        <div v-if="battleStep === 'select-friend'">
          <h2 class="battle-step-title">2. Reta a un amigo</h2>
          <p class="battle-step-sub">Tu equipo: <strong>{{ selectedMyTeam?.name }}</strong></p>
          <p class="battle-step-sub" style="font-size:0.8rem; color: var(--text-muted);">Tu amigo debe estar conectado para recibir el reto</p>
          <div v-if="friends.length === 0" class="empty-state"><p>Necesitas amigos para batallar</p></div>
          <div v-else class="friends-list">
            <div v-for="friend in friends" :key="friend.id" class="card friend-card battle-friend-card" @click="selectFriendForBattle(friend)">
              <div class="friend-avatar">{{ friend.email.charAt(0).toUpperCase() }}</div>
              <div class="friend-info">
                <h3>{{ friend.email }}</h3>
                <span class="friend-code-sm">{{ friend.friend_code }}</span>
              </div>
              <span class="battle-select-arrow">⚔️</span>
            </div>
          </div>
          <button @click="resetBattle" class="btn btn-secondary btn-sm" style="margin-top:16px;">← Volver</button>
        </div>

        <!-- Waiting for opponent response -->
        <div v-if="battleStep === 'waiting'" class="battle-waiting-screen">
          <div class="spinner"></div>
          <h3>Esperando respuesta...</h3>
          <p>Reto enviado a <strong>{{ selectedFriend?.email }}</strong></p>
          <p style="font-size:0.8rem; color: var(--text-muted);">Tu amigo debe aceptar el reto para comenzar la batalla</p>
          <button @click="resetBattle" class="btn btn-secondary btn-sm" style="margin-top:20px;">Cancelar</button>
        </div>

        <!-- Loading battle data -->
        <div v-if="battleStep === 'loading'" class="battle-waiting-screen">
          <div class="spinner"></div>
          <h3>Preparando la batalla...</h3>
          <p>Cargando datos de los Pokémon</p>
        </div>
      </div>

      <!-- MODAL: Invitación de batalla recibida -->
      <div v-if="showInvitationModal" class="battle-modal-overlay" @click.self="rejectInvitation">
        <div class="battle-modal">
          <h2>⚔️ ¡Te han retado!</h2>
          <p><strong>{{ pendingInvitation?.challengerEmail }}</strong> quiere batallar contra ti.</p>

          <div v-if="teams.length > 0" style="margin-top:16px;">
            <label class="form-label">Elige tu equipo:</label>
            <div class="battle-select-grid" style="margin-top:8px;">
              <div
                v-for="team in teams"
                :key="team.id"
                :class="['card', 'battle-select-card', { 'battle-card-selected': acceptTeamId === team.id }]"
                @click="acceptTeamId = team.id"
              >
                <h3>{{ team.name }}</h3>
                <div class="team-pokemon-mini">
                  <img v-for="pid in team.pokemon_ids" :key="pid" :src="pokemonImage(pid)" :alt="'#'+pid" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state" style="margin-top:16px;">
            <p>No tienes equipos para batallar</p>
          </div>

          <div class="battle-modal-actions">
            <button @click="acceptInvitation" class="btn btn-accent" :disabled="!acceptTeamId">✅ Aceptar</button>
            <button @click="rejectInvitation" class="btn btn-secondary">❌ Rechazar</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
}
.profile-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-red), var(--accent-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}
.profile-info h1 { font-size: 1.2rem; word-break: break-all; }
.profile-code { font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; }
.profile-code strong { color: var(--accent-gold); letter-spacing: 1px; }

.tab-content { margin-top: 20px; }

/* Favs */
.favs-grid { display: flex; flex-direction: column; gap: 12px; }
.fav-card { display: flex; align-items: center; gap: 16px; }
.fav-img { width: 60px; height: 60px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
.fav-info { flex: 1; }
.fav-info h3 { font-size: 1rem; }
.fav-chars { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
.fav-chars-empty { font-style: italic; opacity: 0.5; }
.fav-actions { display: flex; gap: 6px; flex-shrink: 0; }
.fav-edit { margin-top: 6px; }
.form-input-sm { padding: 8px 12px; font-size: 0.85rem; }
.fav-edit-actions { display: flex; gap: 6px; margin-top: 6px; }

/* Teams */
.teams-list { display: flex; flex-direction: column; gap: 12px; }
.team-card h3 { font-size: 1rem; margin-bottom: 12px; }
.team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.team-header h3 { margin-bottom: 0; }
.team-actions { display: flex; gap: 6px; }
.team-pokemon { display: flex; gap: 10px; flex-wrap: wrap; }
.team-poke { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.team-poke img { width: 56px; height: 56px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); }
.team-poke span { font-size: 0.7rem; color: var(--text-muted); }
.team-edit-form { padding: 4px 0; }
.team-edit-actions { display: flex; gap: 6px; margin-top: 8px; }

/* Friends */
.add-friend-row { display: flex; gap: 10px; margin-bottom: 16px; }
.add-friend-row .form-input { flex: 1; }
.friends-list { display: flex; flex-direction: column; gap: 10px; }
.friend-card { display: flex; align-items: center; gap: 14px; }
.friend-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-surface); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; color: var(--text-secondary); flex-shrink: 0; }
.friend-info { flex: 1; }
.friend-info h3 { font-size: 0.95rem; word-break: break-all; }
.friend-code-sm { font-size: 0.75rem; color: var(--text-muted); }

/* Battle Selection */
.battle-step-title { font-size: 1.1rem; margin-bottom: 8px; color: var(--accent-gold); }
.battle-step-sub { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px; }
.battle-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.battle-select-card { cursor: pointer; transition: all var(--transition-base); }
.battle-select-card:hover { border-color: var(--accent-gold); box-shadow: 0 0 16px rgba(240, 192, 64, 0.2); transform: translateY(-2px); }
.battle-select-card h3 { font-size: 0.95rem; margin-bottom: 10px; }
.team-pokemon-mini { display: flex; gap: 6px; flex-wrap: wrap; }
.team-pokemon-mini img { width: 40px; height: 40px; object-fit: contain; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3)); }
.battle-friend-card { cursor: pointer; transition: all var(--transition-base); }
.battle-friend-card:hover { border-color: var(--accent-gold); }
.battle-select-arrow { font-size: 1.2rem; color: var(--text-muted); }

/* ===== BATTLE ARENA ===== */
.battle-arena {
  background: linear-gradient(180deg, #0d1b2a 0%, #1b2838 40%, #2d4a3e 70%, #3d6b4e 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  padding: 24px;
  overflow: hidden;
}

.battle-side {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}
.opponent-side { margin-bottom: 8px; }
.player-side { margin-bottom: 20px; flex-direction: row-reverse; }

.battle-poke-info {
  flex: 1;
  max-width: 280px;
}
.battle-poke-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-primary);
}
.battle-poke-types {
  display: flex;
  gap: 4px;
  margin: 4px 0 8px;
}
.type-sm { font-size: 0.6rem; padding: 2px 6px; }
.type-xs { font-size: 0.55rem; padding: 1px 5px; }

.hp-bar-wrap {
  margin-top: 4px;
}
.hp-bar-track {
  height: 10px;
  background: rgba(0,0,0,0.4);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}
.hp-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}
.hp-green { background: linear-gradient(90deg, #4ade80, #22c55e); }
.hp-yellow { background: linear-gradient(90deg, #facc15, #f59e0b); }
.hp-red { background: linear-gradient(90deg, #ef4444, #dc2626); }
.hp-text {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-top: 2px;
  display: block;
}

.battle-team-icons {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  font-size: 0.7rem;
}
.team-dot { color: var(--text-muted); }
.team-dot.active { color: var(--accent-green); }
.team-dot.fainted { color: var(--accent-red); opacity: 0.5; }

.battle-poke-sprite {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.battle-poke-sprite img {
  width: 140px;
  height: 140px;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
  transition: transform 0.15s;
}
.opponent-sprite img { transform: scaleX(-1); }

@keyframes shakeHit {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.shake-hit img {
  animation: shakeHit 0.4s ease;
}
.opponent-sprite.shake-hit img {
  animation: shakeHit 0.4s ease;
  transform: scaleX(-1);
}

/* Moves */
.battle-moves {
  margin-top: 8px;
}
.battle-moves h3 {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.moves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.move-btn {
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--border-radius);
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-family: var(--font-family);
}
.move-btn:hover:not(:disabled) {
  border-color: var(--accent-gold);
  background: rgba(255,255,255,0.12);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.move-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.move-name {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.move-details {
  display: flex;
  align-items: center;
  gap: 6px;
}
.move-power {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
}
.move-class {
  font-size: 0.7rem;
}

/* Battle Log */
.battle-log-mini {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0,0,0,0.3);
  border-radius: var(--border-radius);
  max-height: 150px;
  overflow-y: auto;
}
.log-entry {
  font-size: 0.8rem;
  padding: 3px 0;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.log-super { color: var(--accent-green); font-weight: 600; }
.log-weak { color: var(--accent-gold); }
.log-fainted { color: var(--accent-red); font-weight: 700; }
.log-switch { color: var(--accent-blue); font-weight: 600; }
.log-miss { color: var(--text-muted); font-style: italic; }

/* Battle Result */
.battle-winner-banner {
  text-align: center;
  padding: 24px;
  border-radius: var(--border-radius-lg);
  margin-bottom: 24px;
}
.battle-winner-banner h2 { font-size: 1.6rem; margin-bottom: 4px; }
.battle-winner-banner p { font-size: 0.9rem; color: var(--text-secondary); }
.winner-you {
  background: linear-gradient(135deg, rgba(61, 214, 140, 0.15), rgba(61, 214, 140, 0.05));
  border: 1px solid rgba(61, 214, 140, 0.3);
}
.winner-you h2 { color: var(--accent-green); }
.winner-opponent {
  background: linear-gradient(135deg, rgba(220, 10, 45, 0.15), rgba(220, 10, 45, 0.05));
  border: 1px solid rgba(220, 10, 45, 0.3);
}
.winner-opponent h2 { color: var(--accent-red); }

.battle-log-full {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}
.battle-log-full h3 {
  font-size: 1rem;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

@media (max-width: 640px) {
  .battle-poke-sprite { width: 100px; height: 100px; }
  .battle-poke-sprite img { width: 90px; height: 90px; }
  .moves-grid { grid-template-columns: 1fr; }
}

/* Real-time battle styles */
.battle-waiting-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
  gap: 12px;
  padding: 40px 20px;
}
.battle-waiting-screen h3 {
  font-size: 1.1rem;
  color: var(--text-primary);
}
.battle-waiting-screen p {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.battle-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.battle-modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  padding: 28px;
  max-width: 440px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease;
}
@keyframes modalSlideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.battle-modal h2 {
  font-size: 1.3rem;
  margin-bottom: 8px;
  text-align: center;
}
.battle-modal > p {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.95rem;
}
.battle-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.battle-card-selected {
  border-color: var(--accent-gold) !important;
  box-shadow: 0 0 0 2px var(--accent-gold), 0 4px 16px rgba(255, 215, 0, 0.15);
}
</style>
