<template>
  <div class="login-form">
    <h2 v-if="!authStore.isLoggedIn">{{ isCreating ? 'Create Account' : 'Login' }}</h2>
    <h2 v-else>You're logged in as <span class="email">{{ authStore.user?.email || 'unknown user' }}</span></h2>

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
        <!-- juror toggle -->   
        <label class="juror-label">
            <input type="checkbox" v-model="isJuror" @change="updateJurorStatus" />
            Opt-in as a juror
        </label>

        <br /><br />
        
      <button @click="logout">Log Out</button>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/pinia'
import { auth, firestore } from '@/firebaseResources'

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'

const authStore = useAuthStore()
const router = useRouter()
const isCreating = ref(false)
const email = ref('')
const password = ref('')
const isJuror = ref(false)

onMounted(() => {
  if (authStore.user?.isJuror) {
    isJuror.value = authStore.user.isJuror
  }
})

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
        following: [],
        isJuror: false
      }

      await setDoc(doc(firestore, 'users', emailId), userData)

      // ✅ Log in with the userData you just saved
      authStore.login(userData)
      alert('Account created successfully!')

    } else {
      // Log in existing user
      const cred = await signInWithEmailAndPassword(auth, email.value, password.value)

      const emailId = cred.user.email
      const userDoc = await getDoc(doc(firestore, 'users', emailId))
      const data = userDoc.exists() ? userDoc.data() : {}
      const userRef = doc(firestore, 'users', emailId) // mainly to make sure users have isJuror field 

      // Adding `isJuror: false` to user if field doesn't exist
      if (!('isJuror' in data)) {
        data.isJuror = false
        await updateDoc(userRef, { isJuror: false })
      }

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

async function updateJurorStatus() {
  if (!authStore.user?.email) return

  const userRef = doc(firestore, 'users', authStore.user.email)
  await updateDoc(userRef, { isJuror: isJuror.value })

  // Update local store too
  authStore.user.isJuror = isJuror.value
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
    .juror-label {
        color:rgb(5, 82, 29); /* Change to any color you want */
        font-weight: bold; /* Optional: make it stand out */
    }
</style>

