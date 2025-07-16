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
        />
      </div>
    </div>
  </div>
</template>


<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/pinia' // ⬅️ Import the store
import { firestore } from '@/firebaseResources'
import { where } from 'firebase/firestore'

import UserStats from '@/components/UserStats.vue'
import PostInput from '@/components/PostInput.vue'
import PostFeed from '@/components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'

import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore'


// Use global login state
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)

// Feed poasts
const posts = ref([])
let unsubscribeFeed = null

async function setupFeedListener() {
  if (unsubscribeFeed) unsubscribeFeed()

  if (isLoggedIn.value && user.value?.email) {
    const userRef = doc(firestore, 'users', user.value.email)

    unsubscribeFeed = onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) return

      const userData = userSnap.data()
      const following = userData.following || []

      if (following.length === 0) {
        posts.value = []
        return
      }

      // Listen to latest posts from all users
      const q = query(
        collection(firestore, 'posts'),
        orderBy('timestamp', 'desc')
      )

      const snap = await getDocs(q)

      posts.value = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post =>
          // Only include posts from followed users, not own
          following.includes(post.author) && post.author !== user.value.email
        )
        .slice(0, 10)
    })
  } else {
    // Not logged in → show global posts
    const q = query(collection(firestore, 'posts'), orderBy('timestamp', 'desc'), limit(10))
    unsubscribeFeed = onSnapshot(q, (snap) => {
      posts.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    })
  }
}



onMounted(() => {
  setupFeedListener()
})

watch([isLoggedIn, user], () => {
  setupFeedListener()
})

async function addNewPost(content) {
  if (!user.value || !user.value.email) {
    console.warn('User is missing email during post creation')
    return
  }

  const newPost = {
    timestamp: serverTimestamp(),
    author: user.value.email,
    content
  }

  const postRef = await addDoc(collection(firestore, 'posts'), newPost)

  const userRef = doc(firestore, 'users', user.value.email)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) return

  const userData = userSnap.data()

  const updatedPosts = [...(userData.posts || []), postRef.id]
  const updatedFeed = [...(userData.feed || []), postRef.id]

  await updateDoc(userRef, {
    posts: updatedPosts,
    feed: updatedFeed
  })

  const followers = userData.followers || []
  for (const followerEmail of followers) {
    const followerRef = doc(firestore, 'users', followerEmail)
    const followerSnap = await getDoc(followerRef)
    if (followerSnap.exists()) {
      const followerData = followerSnap.data()
      const followerFeed = [...(followerData.feed || []), postRef.id]
      await updateDoc(followerRef, { feed: followerFeed })
    }
  }

  // Show post immediately in UI
  posts.value.unshift({
    id: postRef.id,
    author: user.value.email,
    content,
    timestamp: new Date()
  })

  // Update local user stats
  if (!Array.isArray(user.value.posts)) {
    user.value.posts = []
  }
  user.value.posts.push(postRef.id)
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

