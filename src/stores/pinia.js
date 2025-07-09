import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockUser } from '@/mockData'


export const useAuthStore = defineStore('pinia', () => {
    const isLoggedIn = ref(false)
    const user = ref(null)

    function login(email) {
        isLoggedIn.value = true
        user.value = { ...mockUser, email } 
    }

    function logout() {
        isLoggedIn.value = false
        user.value = null
    }

    return { isLoggedIn, user, login, logout }
})
