<template>
  <div class="home">
    <h1>Welcome to the Feed</h1>

    <!-- Show stats only if logged in -->
    <UserStats :user="mockUser" :isLoggedIn="isLoggedIn" />

    <!-- Only logged-in users can post -->
    <PostInput v-if="isLoggedIn" @post="handlePost" />

    <!-- Post feed for everyone -->
    <PostFeed :posts="mockPosts" />

    <!-- Suggested followers -->
    <SuggestedFollowers :currentUser="mockUser" :isLoggedIn="isLoggedIn" />
  </div>
</template>

<script setup>
import UserStats from '@/components/UserStats.vue'
import PostInput from '@/components/PostInput.vue'
import PostFeed from '@/components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'

import { ref } from 'vue'

// Hardcoded "logged in" user for now
const mockUser = ref({
  email: 'test@example.com',
  username: 'testuser',
  posts: 5,
  following: 10,
  followers: 12
})

// Change this to `false` to simulate logged out
const isLoggedIn = ref(true)

// Hardcoded posts
const mockPosts = ref([
  {
    id: 1,
    author: 'testuser',
    content: 'This is a test post!',
    date: '2025-07-08 12:00 PM'
  },
  {
    id: 2,
    author: 'otheruser',
    content: 'Another post!',
    date: '2025-07-08 01:00 PM'
  }
])

function handlePost(newContent) {
  mockPosts.value.unshift({
    id: Date.now(),
    author: mockUser.value.username,
    content: newContent,
    date: new Date().toLocaleString()
  })
}
</script>
