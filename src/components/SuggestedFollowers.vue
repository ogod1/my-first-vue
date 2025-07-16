<template>
  <div class="suggested-followers">
    <h3>{{ props.isLoggedIn ? 'Who to Follow' : 'Suggested Users' }}</h3>

    <div v-if="!loading && filtered.length">
      <div v-for="user in filtered" :key="user.email" class="suggested-user">
        <router-link :to="`/users/${user.email}`">@{{ user.email }}</router-link>

        <!-- ✅ Show button only when logged in -->
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
const followedUserIds = ref([])
const authStore = useAuthStore()
const loading = ref(true)
const localUser = ref(props.currentUser ? { ...props.currentUser } : null)

onMounted(async () => {
  const querySnapshot = await getDocs(collection(firestore, 'users'))
  const currentEmail = props.currentUser?.email || ''
  allUsers.value = querySnapshot.docs
    .map(doc => doc.data())
    .filter(user => user.email !== currentEmail) // ⬅️ remove logged-in user
  loading.value = false
})


watch(() => props.currentUser, (newVal) => {
  localUser.value = newVal ? { ...newVal } : null
})

async function followUser(targetEmail) {
  if (!props.currentUser?.email) return;

  const currentEmail = props.currentUser.email;

  const currentUserRef = doc(firestore, 'users', currentEmail);
  const targetUserRef = doc(firestore, 'users', targetEmail);

  const [currentSnap, targetSnap] = await Promise.all([
    getDoc(currentUserRef),
    getDoc(targetUserRef)
  ]);

  if (!currentSnap.exists() || !targetSnap.exists()) return;

  const currentData = currentSnap.data();
  const targetData = targetSnap.data();

  const alreadyFollowing = computed(() => {
    return new Set([
      ...(localUser.value?.following || []),
      ...followedUserIds.value
    ])
  })
  const alreadyFollowedBy = (targetData.followers || []).includes(currentEmail);

  const theirPosts = targetData.posts || [];

  // 1. Update current user's following + feed
  if (!alreadyFollowing) {
    const newFeed = [
      ...(currentData.feed || []),
      ...theirPosts.filter(p => !(currentData.feed || []).includes(p))
    ];

    await updateDoc(currentUserRef, {
      following: [...(currentData.following || []), targetEmail],
      feed: newFeed
    });
  }

  // 2. Update target user's followers
  if (!alreadyFollowedBy) {
    await updateDoc(targetUserRef, {
      followers: [...(targetData.followers || []), currentEmail]
    });
  }

  // 3. Update local currentUser.following for live UI updates
  if (!Array.isArray(props.currentUser.following)) {
    props.currentUser.following = [];
  }
  if (!props.currentUser.following.includes(targetEmail)) {
    props.currentUser.following.push(targetEmail);
  }

  allUsers.value = allUsers.value.filter(u => u.email !== targetEmail)

}



// Safe filter logic
const filtered = computed(() => {
  if (!props.isLoggedIn || !localUser.value) {
    return allUsers.value.slice(0, 5)
  }

  return allUsers.value
    .filter(user =>
      user.email !== localUser.value.email &&
      !alreadyFollowing.value.has(user.email)
    )
    .slice(0, 5)
})

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
