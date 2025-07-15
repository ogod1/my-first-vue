<template>
  <div class="home">
    <h1>User Profile</h1>

    <div class="feed">
      <div class="left-column">
        <UserStats v-if="user" :user="user" :isLoggedIn="true" />
      </div>

      <div class="center-column">
        <PostInput v-if="isLoggedIn" @post="addNewPost" />
        <PostInput
            v-if="isLoggedIn && auth.user?.id === user?.id"
            @post="addNewPost"
        />
        <PostFeed :posts="posts" />
      </div>

      <div class="right-column">
        <SuggestedFollowers
            v-if="user"
            :currentUser="user"
            :isLoggedIn="isLoggedIn"
            :suggested="suggestedUsers"
        />
      </div>
    </div>
  </div>
</template>


<script setup>
import { computed, ref} from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/pinia' 

import UserStats from '@/components/UserStats.vue'
import PostInput from '@/components/PostInput.vue'
import PostFeed from '@/components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'

import {
  mockUserPosts,
  mockGuestPosts,
  mockGlobalPosts,
  mockSuggestedUsers
} from '@/mockData'

// Use global login state
const route = useRoute()
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = ref(null)
const id = route.params.id
user.value = mockSuggestedUsers.find(u => u.id.toString() === id)
const suggestedUsers = ref(mockSuggestedUsers)

// Feed poasts
const posts = ref([])

if (user.value) {
  // Optional: match by username
  if (user.value.username === 'doctor12') {
    posts.value = [...mockUserPosts]
  } else if (user.value.username === 'guest') {
    posts.value = [...mockGuestPosts]
  } else {
    posts.value = [] // No posts for this user
  }
}


function addNewPost(content) {
  const newPost = {
    id: Date.now(),
    author: user.value.username,
    content,
    date: new Date().toLocaleString()
  }
  posts.value.unshift(newPost)

  //increasing post count 
  if (auth.user) {
    auth.user.posts++
  }
}
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
}

.center-column {
  width: 800px;
}
</style>
