import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockUser } from '@/mockData'


export const useAuthStore = defineStore('pinia', () => {
    const isLoggedIn = ref(false)
    const user = ref(null)

    function login(email) {
        isLoggedIn.value = true
        if (email === "doc@who.come") {
            user.value = { ...mockUser, email }
        } else {
            user.value = { ...mockGuest, email}
        }
    }

    function logout() {
        isLoggedIn.value = false
        user.value = null
    }

    return { isLoggedIn, user, login, logout }
})
