<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()

const pokemon = ref(null)
const loading = ref(true)
const isFavorite = ref(false)
const favId = ref(null)
const togglingFav = ref(false)

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

const statAbbreviation = {
  'hp': 'HP',
  'attack': 'ATK',
  'defense': 'DEF',
  'special-attack': 'SpA',
  'special-defense': 'SpD',
  'speed': 'SPD'
}

const statClass = (value) => {
  if (value >= 100) return 'high'
  if (value <= 50) return 'low'
  return ''
}

const fetchPokemon = async () => {
  loading.value = true
  try {
    const res = await api.get(`/pokemon/${route.params.id}`)
    pokemon.value = res.data

    // Check if it's a favorite
    const favRes = await api.get('/social/favorites')
    const fav = favRes.data.find(f => f.pokemon_id === pokemon.value.id)
    if (fav) {
      isFavorite.value = true
      favId.value = fav.id
    }
  } catch (err) {
    console.error('Error cargando pokémon:', err)
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  togglingFav.value = true
  try {
    if (isFavorite.value) {
      await api.delete(`/social/favorites/${favId.value}`)
      isFavorite.value = false
      favId.value = null
    } else {
      const res = await api.post('/social/favorites', {
        pokemon_id: pokemon.value.id,
        characteristics: `${pokemon.value.types.join(', ')} — ${pokemon.value.stats.map(s => `${statAbbreviation[s.name] || s.name}: ${s.value}`).join(', ')}`
      })
      isFavorite.value = true
      favId.value = res.data.id
    }
  } catch (err) {
    console.error('Error toggling favorite:', err)
  } finally {
    togglingFav.value = false
  }
}

onMounted(() => fetchPokemon())
</script>

<template>
  <div class="page">
    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <div v-else-if="pokemon" class="detail fade-in">
      <!-- Back button -->
      <button @click="router.back()" class="btn btn-secondary btn-sm back-btn">← Volver</button>

      <div class="detail-top">
        <!-- Image -->
        <div class="detail-image-container">
          <div class="detail-image-bg"></div>
          <img :src="pokemon.image" :alt="pokemon.name" class="detail-image" />
        </div>

        <!-- Info -->
        <div class="detail-info">
          <span class="detail-number">#{{ String(pokemon.id).padStart(3, '0') }}</span>
          <h1 class="detail-name">{{ capitalize(pokemon.name) }}</h1>

          <div class="detail-types">
            <span
              v-for="type in pokemon.types"
              :key="type"
              :class="['type-badge', `type-${type}`]"
            >
              {{ capitalize(type) }}
            </span>
          </div>

          <p class="detail-description">{{ pokemon.description }}</p>

          <div class="detail-measures">
            <div class="measure">
              <span class="measure-value">{{ (pokemon.weight / 10).toFixed(1) }} kg</span>
              <span class="measure-label">Peso</span>
            </div>
            <div class="measure">
              <span class="measure-value">{{ (pokemon.height / 10).toFixed(1) }} m</span>
              <span class="measure-label">Altura</span>
            </div>
          </div>

          <button
            @click="toggleFavorite"
            :class="['btn', isFavorite ? 'btn-primary' : 'btn-secondary']"
            :disabled="togglingFav"
            style="margin-top: 16px;"
          >
            {{ isFavorite ? '★ En Favoritos' : '☆ Agregar a Favoritos' }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="detail-section">
        <h2>Estadísticas Base</h2>
        <div class="stats-list">
          <div v-for="stat in pokemon.stats" :key="stat.name" class="stat-bar-container">
            <span class="stat-name">{{ statAbbreviation[stat.name] || stat.name }}</span>
            <span class="stat-value">{{ stat.value }}</span>
            <div class="stat-bar-track">
              <div
                :class="['stat-bar-fill', statClass(stat.value)]"
                :style="{ width: `${Math.min((stat.value / 200) * 100, 100)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Evolution Chain -->
      <div v-if="pokemon.evolution_chain && pokemon.evolution_chain.length > 1" class="detail-section">
        <h2>Cadena Evolutiva</h2>
        <div class="evo-chain">
          <template v-for="(evo, index) in pokemon.evolution_chain" :key="evo.id">
            <div
              class="evo-item"
              :class="{ active: evo.id == pokemon.id }"
              @click="router.push(`/pokemon/${evo.id}`)"
            >
              <img :src="evo.image" :alt="evo.name" loading="lazy" />
              <span>{{ capitalize(evo.name) }}</span>
            </div>
            <span v-if="index < pokemon.evolution_chain.length - 1" class="evo-arrow">→</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back-btn {
  margin-bottom: 20px;
}

.detail-top {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.detail-image-container {
  position: relative;
  flex-shrink: 0;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-image-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 10, 45, 0.1) 0%, transparent 70%);
}
.detail-image {
  width: 240px;
  height: 240px;
  object-fit: contain;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
  animation: floatUp 0.6s ease forwards;
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-info {
  flex: 1;
}

.detail-number {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.detail-name {
  font-size: 2rem;
  font-weight: 800;
  margin: 4px 0 12px;
}

.detail-types {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-description {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

.detail-measures {
  display: flex;
  gap: 24px;
}
.measure {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 12px 20px;
}
.measure-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.measure-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Stats Section */
.detail-section {
  margin-top: 36px;
}
.detail-section h2 {
  font-size: 1.2rem;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Evolution Chain */
.evo-chain {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 16px;
  background: var(--bg-surface);
  border-radius: var(--border-radius-lg);
}
.evo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 12px;
  border-radius: var(--border-radius);
  border: 2px solid transparent;
  transition: all var(--transition-base);
}
.evo-item:hover {
  border-color: var(--border-color);
  background: var(--bg-card);
}
.evo-item.active {
  border-color: var(--accent-red);
  background: var(--bg-card);
  box-shadow: 0 0 12px var(--accent-red-glow);
}
.evo-item img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}
.evo-item span {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.evo-arrow {
  font-size: 1.5rem;
  color: var(--text-muted);
}

@media (max-width: 700px) {
  .detail-top {
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .detail-image-container {
    width: 200px;
    height: 200px;
  }
  .detail-image {
    width: 180px;
    height: 180px;
  }
  .detail-name {
    text-align: center;
  }
  .detail-types {
    justify-content: center;
  }
  .detail-description {
    text-align: center;
  }
  .detail-measures {
    justify-content: center;
  }
}
</style>
