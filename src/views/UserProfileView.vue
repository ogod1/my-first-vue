<template>
  <div class="profile">
    <h1>User Profile</h1>

    <div class="feed">
      <div class="left-column">
        <UserStats v-if="user" :user="user" :isLoggedIn="true" />
        <p v-else>User not found :</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/pinia'
import UserStats from '@/components/UserStats.vue'
import { mockSuggestedUsers } from '@/mockData'

const route = useRoute()
const auth = useAuthStore()
const user = ref(null)
const id = route.params.id
user.value = mockSuggestedUsers.find(u => u.id.toString() === id)

//onMounted(() => {
  // const id = route.params.id

  // Fix: compare ID as string (just in case)
  // const loggedInUser = auth.user && auth.user.id?.toString() === id

  // user.value = mockSuggestedUsers.find(u => u.id.toString() === id)
//})
</script>


<style scoped>
.profile {
  margin: 0 auto;
  padding: 2rem 1rem;
  margin-top: 0px;
}

.feed {
  display: flex;
  gap: 3rem;
  justify-content: center;
  margin-top: 0px;
}

.left-column {
  margin-top: 32px;
  width: 800px;
}
</style>
