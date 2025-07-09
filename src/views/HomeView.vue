<template>
  <div class="home">
    <h1>Welcome to the Feed</h1>

    <div class="feed">
      <div class="left-column">
        <UserStats :user="user" :isLoggedIn="isLoggedIn" />
      </div>

      <div class="center-column">
        <PostInput v-if="isLoggedIn" @post="addNewPost" />
        <PostFeed :posts="posts" />
      </div>

      <div class="right-column">
        <SuggestedFollowers
          :currentUser="user"
          :isLoggedIn="isLoggedIn"
          :suggested="suggestedUsers"
        />
      </div>
    </div>
  </div>
</template>


<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/pinia' // ⬅️ Import the store

import UserStats from '@/components/UserStats.vue'
import PostInput from '@/components/PostInput.vue'
import PostFeed from '@/components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'

import {
  mockUserPosts,
  mockGlobalPosts,
  mockSuggestedUsers
} from '@/mockData'

// Use global login state
const auth = useAuthStore()

const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)
const suggestedUsers = ref(mockSuggestedUsers)

// Feed poasts
const posts = computed(() =>
  isLoggedIn.value ? [...mockUserPosts] : [...mockGlobalPosts]
)

function addNewPost(content) {
  const newPost = {
    id: Date.now(),
    author: user.value.username,
    content,
    date: new Date().toLocaleString()
  }
  posts.value.unshift(newPost)
}
</script>


<style scoped>
.home {
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
}

.center-column {
  width: 800px;
}

</style>

