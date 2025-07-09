<template>
  <div class="suggested-followers">
    <h3>{{ props.isLoggedIn ? 'Who to Follow' : 'Suggested Users' }}</h3>

    <div v-if="filtered.length">
      <div v-for="user in filtered" :key="user.id">
        <router-link :to="`/users/${user.id}`">@{{ user.username }}</router-link>
        <button v-if="props.isLoggedIn" @click="followUser(user.id)">Follow</button>
      </div>
    </div>

    <p v-else>No one to follow right now.</p>
  </div>
</template>


<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  currentUser: Object,
  isLoggedIn: Boolean,
  suggested: Array
})

const followedUserIds = ref([])

function followUser(userId) {
  followedUserIds.value.push(userId)
}

// Safe filter logic
const filtered = computed(() => {
  if (!props.isLoggedIn || !props.currentUser) {
    return props.suggested.slice(0, 5)
  }

  const alreadyFollowing = new Set([
    ...(props.currentUser.followingIds || []),
    ...followedUserIds.value
  ])

  return props.suggested
    .filter(user => user.id !== props.currentUser.id && !alreadyFollowing.has(user.id))
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
