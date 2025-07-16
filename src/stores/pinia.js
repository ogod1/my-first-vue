import { defineStore } from 'pinia'
import { ref } from 'vue'

// stores/pinia.js
export const useAuthStore = defineStore('pinia', () => {
  const isLoggedIn = ref(false)
  const user = ref(null)

  function login(userData) {
    isLoggedIn.value = true
    user.value = userData
  }

  function logout() {
    isLoggedIn.value = false
    user.value = null
  }

  return { isLoggedIn, user, login, logout }
})  

