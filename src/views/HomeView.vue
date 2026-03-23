<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const allPokemon = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedType = ref('')
const selectedRegion = ref('')
const offset = ref(0)
const totalCount = ref(0)
const loadingMore = ref(false)

const LIMIT = 40

const pokemonTypes = [
  'normal','fire','water','electric','grass','ice','fighting','poison',
  'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
]

const regions = [
  { value: 'kanto', label: 'Kanto (Gen 1)' },
  { value: 'johto', label: 'Johto (Gen 2)' },
  { value: 'hoenn', label: 'Hoenn (Gen 3)' },
  { value: 'sinnoh', label: 'Sinnoh (Gen 4)' },
  { value: 'unova', label: 'Unova (Gen 5)' },
  { value: 'kalos', label: 'Kalos (Gen 6)' },
  { value: 'alola', label: 'Alola (Gen 7)' },
  { value: 'galar', label: 'Galar (Gen 8)' },
  { value: 'paldea', label: 'Paldea (Gen 9)' }
]

const fetchPokemon = async (isLoadMore = false) => {
  if (isLoadMore) {
    loadingMore.value = true
  } else {
    loading.value = true
  }

  try {
    if (selectedRegion.value) {
      // Filter by region
      const res = await api.get(`/pokemon/filter/region/${selectedRegion.value}`)
      allPokemon.value = res.data.results
      totalCount.value = res.data.results.length
    } else if (selectedType.value) {
      // Filter by type
      const res = await api.get(`/pokemon/filter/type/${selectedType.value}`)
      allPokemon.value = res.data.results
      totalCount.value = res.data.results.length
    } else {
      const res = await api.get(`/pokemon?limit=${LIMIT}&offset=${offset.value}`)
      if (isLoadMore) {
        allPokemon.value = [...allPokemon.value, ...res.data.results]
      } else {
        allPokemon.value = res.data.results
      }
      totalCount.value = res.data.count
    }
  } catch (err) {
    console.error('Error cargando pokémon:', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const filteredPokemon = computed(() => {
  if (!searchQuery.value) return allPokemon.value
  const q = searchQuery.value.toLowerCase()
  return allPokemon.value.filter(p => p.name.includes(q) || p.id.toString() === q)
})

const canLoadMore = computed(() => {
  return !selectedType.value && !selectedRegion.value && allPokemon.value.length < totalCount.value
})

const loadMore = () => {
  offset.value += LIMIT
  fetchPokemon(true)
}

const onTypeChange = () => {
  selectedRegion.value = ''
  offset.value = 0
  allPokemon.value = []
  fetchPokemon()
}

const onRegionChange = () => {
  selectedType.value = ''
  offset.value = 0
  allPokemon.value = []
  fetchPokemon()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedType.value = ''
  selectedRegion.value = ''
  offset.value = 0
  allPokemon.value = []
  fetchPokemon()
}

const goToDetail = (id) => {
  router.push(`/pokemon/${id}`)
}

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

onMounted(() => fetchPokemon())
</script>

<template>
  <div class="page">
    <!-- Search & Filter Bar -->
    <div class="toolbar fade-in">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="form-input search-input"
          placeholder="Buscar Pokémon por nombre o número..."
        />
      </div>

      <div class="filter-row">
        <select v-model="selectedType" @change="onTypeChange" class="form-select">
          <option value="">Todos los tipos</option>
          <option v-for="t in pokemonTypes" :key="t" :value="t">
            {{ capitalize(t) }}
          </option>
        </select>
        <select v-model="selectedRegion" @change="onRegionChange" class="form-select">
          <option value="">Todas las regiones</option>
          <option v-for="r in regions" :key="r.value" :value="r.value">
            {{ r.label }}
          </option>
        </select>
        <button v-if="selectedType || searchQuery || selectedRegion" @click="clearFilters" class="btn btn-secondary btn-sm">
          ✕ Limpiar
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-center">
      <div class="spinner"></div>
    </div>

    <!-- Pokemon Grid -->
    <div v-else>
      <p class="results-count">{{ filteredPokemon.length }} Pokémon encontrados</p>

      <div class="pokemon-grid">
        <div
          v-for="(pokemon, index) in filteredPokemon"
          :key="pokemon.id"
          class="pokemon-card fade-in"
          :style="{ animationDelay: `${Math.min(index * 30, 500)}ms` }"
          @click="goToDetail(pokemon.id)"
        >
          <div class="pokemon-card-id">#{{ String(pokemon.id).padStart(3, '0') }}</div>
          <div class="pokemon-card-img">
            <img :src="pokemon.image" :alt="pokemon.name" loading="lazy" />
          </div>
          <h3 class="pokemon-card-name">{{ capitalize(pokemon.name) }}</h3>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredPokemon.length === 0" class="empty-state">
        <p>🔎 No se encontraron Pokémon</p>
      </div>

      <!-- Load More -->
      <div v-if="canLoadMore" class="load-more">
        <button @click="loadMore" class="btn btn-secondary" :disabled="loadingMore">
          <span v-if="loadingMore" class="spinner spinner-sm"></span>
          <span v-else>Cargar más</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 24px;
}

.search-box {
  position: relative;
  margin-bottom: 12px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1rem;
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding-left: 42px;
  padding-right: 16px;
}

.filter-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.filter-row .form-select {
  flex: 1;
  max-width: 220px;
}

.results-count {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 16px;
}

/* Pokemon Grid */
.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.pokemon-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 16px 12px 14px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
  opacity: 0;
}
.pokemon-card::before {
  content: '';
  position: absolute;
  top: -40%;
  left: -20%;
  width: 140%;
  height: 80%;
  background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
  pointer-events: none;
}

.pokemon-card:hover {
  border-color: var(--accent-red);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px var(--accent-red-glow);
}

.pokemon-card-id {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-align: right;
  margin-bottom: 4px;
}

.pokemon-card-img {
  width: 100px;
  height: 100px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pokemon-card-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform var(--transition-base);
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}
.pokemon-card:hover .pokemon-card-img img {
  transform: scale(1.1);
}

.pokemon-card-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}
.spinner-sm {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

@media (max-width: 480px) {
  .pokemon-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
  }
}
</style>
