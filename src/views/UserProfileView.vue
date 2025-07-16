<template>
  <div class="home">
    <h1>User Profile</h1>

    <div class="feed">
      <div class="left-column">
        <UserStats v-if="user" :user="user" :isLoggedIn="true" />
      </div>

      <div class="center-column">
        <PostInput
            v-if="isLoggedIn && auth.user?.email === user?.email"
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
import { onMounted, ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/pinia'
import { firestore } from '@/firebaseResources'

import { doc, getDoc, getDocs, collection } from 'firebase/firestore'

import UserStats from '@/components/UserStats.vue'
import PostInput from '@/components/PostInput.vue'
import PostFeed from '@/components/PostFeed.vue'
import SuggestedFollowers from '@/components/SuggestedFollowers.vue'

const route = useRoute()
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = ref(null)
const posts = ref([])

const email = route.params.email
const suggestedUsers = ref([])

onMounted(async () => {
    console.log('Viewing profile for email:', route.params.email)
  try {
    // 1. Load user profile from Firestore
    const userRef = doc(firestore, 'users', email)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      user.value = userSnap.data()

      // 2. Load post documents from Firestore
      const postIds = user.value.posts || []
      const postData = []

      for (const postId of postIds) {
        const postRef = doc(firestore, 'posts', postId)
        const postSnap = await getDoc(postRef)
        if (postSnap.exists()) {
          postData.push({ id: postId, ...postSnap.data() })
        }
      }

      posts.value = postData.sort((a, b) =>
        (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
      )
    } else {
      console.warn('User not found:', email)
    }

    // 3. Optional: load suggested users list
    // For now, this just shows everyone (fix if needed)
    const allUserDocs = await getDocs(collection(firestore, 'users'))
    suggestedUsers.value = allUserDocs.docs
      .map(doc => doc.data())
      .filter(u => u.email !== email)
      .slice(0, 5)
  } catch (err) {
    console.error('Error loading profile:', err)
  }
})

async function addNewPost(content) {
  console.warn('New post creation from profile view is not wired yet.')
  // You could reuse your addNewPost logic from HomeView.vue here if needed
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
