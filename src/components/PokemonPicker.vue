<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
import api from '@/services/api'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: 6 }
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const showDropdown = ref(false)
let searchTimeout = null

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

const pokemonImage = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  if (!val || val.length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const res = await api.get(`/pokemon/search?q=${encodeURIComponent(val)}`)
      // Filtrar los que ya están seleccionados
      const selectedIds = props.modelValue.map(p => p.id)
      searchResults.value = res.data.results.filter(p => !selectedIds.includes(p.id))
      showDropdown.value = searchResults.value.length > 0
    } catch (err) {
      console.error(err)
    } finally {
      searching.value = false
    }
  }, 300)
})

const selectPokemon = (pokemon) => {
  if (props.modelValue.length >= props.max) return
  const updated = [...props.modelValue, pokemon]
  emit('update:modelValue', updated)
  searchQuery.value = ''
  searchResults.value = []
  showDropdown.value = false
}

const removePokemon = (id) => {
  const updated = props.modelValue.filter(p => p.id !== id)
  emit('update:modelValue', updated)
}

const closeDropdown = () => {
  setTimeout(() => { showDropdown.value = false }, 200)
}
</script>

<template>
  <div class="picker">
    <!-- Selected Pokémon -->
    <div v-if="modelValue.length > 0" class="picker-selected">
      <div v-for="poke in modelValue" :key="poke.id" class="picker-chip">
        <img :src="pokemonImage(poke.id)" :alt="poke.name" />
        <span>{{ capitalize(poke.name) }}</span>
        <button @click="removePokemon(poke.id)" class="picker-chip-remove" title="Quitar">✕</button>
      </div>
    </div>

    <!-- Search Input -->
    <div v-if="modelValue.length < max" class="picker-search-wrap">
      <input
        v-model="searchQuery"
        type="text"
        class="form-input picker-input"
        :placeholder="`Buscar Pokémon... (${modelValue.length}/${max})`"
        @focus="showDropdown = searchResults.length > 0"
        @blur="closeDropdown"
      />
      <span v-if="searching" class="picker-loading">⏳</span>

      <!-- Dropdown Results -->
      <div v-if="showDropdown" class="picker-dropdown">
        <div
          v-for="poke in searchResults"
          :key="poke.id"
          class="picker-option"
          @mousedown.prevent="selectPokemon(poke)"
        >
          <img :src="pokemonImage(poke.id)" :alt="poke.name" />
          <span class="picker-option-name">{{ capitalize(poke.name) }}</span>
          <span class="picker-option-id">#{{ String(poke.id).padStart(3, '0') }}</span>
        </div>
      </div>
    </div>

    <p v-else class="picker-full">Equipo completo ({{ max }}/{{ max }})</p>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picker-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.picker-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.15s ease;
}
.picker-chip:hover {
  border-color: var(--accent-red);
}
.picker-chip img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}
.picker-chip-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 50%;
  transition: color 0.15s;
}
.picker-chip-remove:hover {
  color: var(--accent-red);
}

.picker-search-wrap {
  position: relative;
}
.picker-input {
  width: 100%;
}
.picker-loading {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
}

.picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: var(--shadow-lg);
}

.picker-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.12s;
}
.picker-option:hover {
  background: var(--bg-card-hover);
}
.picker-option img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}
.picker-option-name {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}
.picker-option-id {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 700;
}

.picker-full {
  font-size: 0.8rem;
  color: var(--accent-green);
  font-weight: 600;
}
</style>
