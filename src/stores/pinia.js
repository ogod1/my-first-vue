import { defineStore } from 'pinia'
import { ref } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'

export const useAuthStore = defineStore('pinia', () => {
  const isLoggedIn = ref(false)
  const user = ref(null)

  async function login(userData) {
    isLoggedIn.value = true

    // Ensure email is available
    if (!userData?.email) {
        console.warn('No email provided for login')
        user.value = userData
        return
    }

    const userRef = doc(firestore, 'users', userData.email)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
        user.value = { ...userSnap.data(), email: userData.email }
    } else {
        console.warn('User not found in Firestore')
        user.value = userData
    }
    }


  function logout() {
    isLoggedIn.value = false
    user.value = null
  }

  return { isLoggedIn, user, login, logout }
})
