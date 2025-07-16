<template>
  <div class="login-form">
    <h2 v-if="!authStore.isLoggedIn">{{ isCreating ? 'Create Account' : 'Login' }}</h2>
    <h2 v-else>You're logged in as <span class="email">{{ authStore.user.email }}</span></h2>

    <div v-if="!authStore.isLoggedIn" class="form">
      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <button @click="handleSubmit">
        {{ isCreating ? 'Create Account' : 'Log In' }}
      </button>

      <p class="toggle" @click="toggleMode">
        {{ isCreating ? 'Already have an account? Log in.' : 'Need an account? Create one.' }}
      </p>
    </div>

    <div v-else class="logout-box">
      <button @click="logout">Log Out</button>
    </div>
  </div>
</template>


<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/pinia'
import { auth, firestore } from '@/firebaseResources'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'

const authStore = useAuthStore()
const router = useRouter()
const isCreating = ref(false)
const email = ref('')
const password = ref('')

function toggleMode() {
  isCreating.value = !isCreating.value
}

async function handleSubmit() {
  try {
    if (isCreating.value) {
      // 👤 Create new Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email.value, password.value)

      const emailId = cred.user.email

      // 📄 Use email as document ID in Firestore
      const userData = {
        email: emailId,
        feed: [],
        posts: [],
        followers: [],
        following: []
      }

      await setDoc(doc(firestore, 'users', emailId), userData)

      // ✅ Log in with the userData you just saved
      authStore.login(userData)
      alert('Account created successfully!')

    } else {
      // 🔐 Log in existing user
      const cred = await signInWithEmailAndPassword(auth, email.value, password.value)

      const emailId = cred.user.email
      const userDoc = await getDoc(doc(firestore, 'users', emailId))
      const data = userDoc.exists() ? userDoc.data() : {}

      authStore.login({
        email: emailId,
        ...data
      })
    }

    // Reset form and go home
    email.value = ''
    password.value = ''
    router.push('/')

  } catch (error) {
    alert(error.message)
  }
}

async function logout() {
  await signOut(auth)
  authStore.logout()
}
</script>



<style scoped>
    .login-form {
        max-width: 800px;
        margin: 3 auto;
        padding: 2rem 1rem;
        width: 100%;
        background-color: #f4f4f4;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        justify-content: center;
    }

    h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #333;
    }

    .form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
        max-width: 400px;
        margin: 0 auto;
    }

    input {
        padding: 0.75rem;
        font-size: 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    button {
        padding: 0.75rem;
        font-size: 1rem;
        background-color: #42b983;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #36996f;
    }

    .toggle {
        text-align: center;
        font-size: 0.95rem;
        color: #555;
        text-decoration: underline;
        cursor: pointer;
    }

    .logout-box {
        text-align: center;
        margin-top: 2rem;
    }

    .email {
        font-weight: bold;
        color: #2c3e50;
    }
</style>

