<template>
  <div class="suggested-followers">
    <h3>{{ props.isLoggedIn ? 'Who to Follow' : 'Suggested Users' }}</h3>

    <div v-if="!loading && filtered.length">
      <div v-for="user in filtered" :key="user.email" class="suggested-user">
        <router-link v-if="user && user.email" :to="`/users/${user.email}`">@{{ user.email }}</router-link>

        <button
          v-if="props.isLoggedIn"
          @click="followUser(user.email)"
          :disabled="alreadyFollowing.has(user.email)"
        >
          Follow
        </button>
      </div>
    </div>

    <p v-else>No one to follow right now.</p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'
import { useAuthStore } from '@/stores/pinia'

const props = defineProps({
  currentUser: Object,
  isLoggedIn: Boolean
})

const allUsers = ref([])
const authStore = useAuthStore()
const loading = ref(true)
const localUser = ref(null)

watch(() => props.currentUser, (newVal) => {
  localUser.value = newVal ? { ...newVal } : null
})

watch(
  () => props.currentUser,
  async (newVal) => {
    if (newVal?.email) {
      localUser.value = { ...newVal }
      await fetchSuggestedUsers()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (!props.currentUser || !props.currentUser.email) {
    // Not logged in, just show all users
    await fetchSuggestedUsers();
  }
})

async function fetchSuggestedUsers() {
  loading.value = true
  try {
    const querySnapshot = await getDocs(collection(firestore, 'users'))
    const currentEmail = props.currentUser?.email || ''
    allUsers.value = querySnapshot.docs
      .map(doc => doc.data())
      .filter(user => user.email !== currentEmail)
  } catch (err) {
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

async function followUser(targetEmail) {
  const currentEmail = props.currentUser?.email
  if (!currentEmail || currentEmail === targetEmail) return

  try {
    const currentUserRef = doc(firestore, 'users', currentEmail)
    const targetUserRef = doc(firestore, 'users', targetEmail)

    const [currentSnap, targetSnap] = await Promise.all([
      getDoc(currentUserRef),
      getDoc(targetUserRef)
    ])

    if (!currentSnap.exists() || !targetSnap.exists()) return

    let currentData = currentSnap.data()
    let targetData = targetSnap.data()

    let following = new Set(currentData.following || [])
    let followers = new Set(targetData.followers || [])

    // Add target to current's following
    following.add(targetEmail)
    // Add current to target's followers
    followers.add(currentEmail)

    // Ensure reciprocal relationship
    // If current is in target's followers, target must be in current's following
    // If target is in current's following, current must be in target's followers

    await updateDoc(currentUserRef, {
      following: Array.from(following)
    })
    await updateDoc(targetUserRef, {
      followers: Array.from(followers)
    })

    await refreshCurrentUser()
    allUsers.value = allUsers.value.filter(u => u.email !== targetEmail)
    await refreshCurrentUser()
  } catch (err) {
    console.error('Error following user:', err)
  }
}

async function refreshCurrentUser() {
  const currentEmail = authStore.user?.email || ''
  if (!currentEmail) return

  const ref = doc(firestore, 'users', currentEmail)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    authStore.user = snap.data()
  }
}

const alreadyFollowing = computed(() => {
  return new Set(authStore.user?.following || [])
})

const filtered = computed(() => {
  if (!props.isLoggedIn || !localUser.value) {
    return allUsers.value.slice(0, 5)
  }

  return allUsers.value
  .filter(user =>
    user?.email &&
    user.email !== localUser.value.email &&
    !alreadyFollowing.value.has(user.email)
  )
  .slice(0, 5)
})

watch(
  () => filtered.value,
  (val) => {
    // No debug log
  }
)
</script>

<style scoped>
.suggested-followers {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 6px;
  border: 2px solid #ccc;
}

.suggested-user {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.suggested-user a {
  text-decoration: none;
  color: #007acc;
}

button {
  padding: 0.25rem 0.75rem;
  border: none;
  background-color: #42b983;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}

.placeholder {
  color: #888;
  font-style: italic;
}
</style>
