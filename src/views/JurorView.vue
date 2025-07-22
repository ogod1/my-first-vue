<template>
  <div class="juror-view">
    <h1>Juror Review</h1>
    <div v-if="!isLoggedIn">
      <p>Please log in to review assigned posts.</p>
    </div>
    <div v-else>
      <PostFeed :posts="jurorPosts" :isLoggedIn="isLoggedIn" />
      <p v-if="jurorPosts.length === 0">No posts assigned for review.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/pinia'
import { collection, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseResources'
import PostFeed from '@/components/PostFeed.vue'

const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const jurorPosts = ref([])

onMounted(async () => {
  if (!auth.user?.email) return
  const postsSnap = await getDocs(collection(firestore, 'posts'))
  const allPosts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  console.log('All posts from Firestore:', allPosts)
  jurorPosts.value = allPosts
    .filter(post =>
      post.status === 'underReview' &&
      Array.isArray(post.jurors) &&
      post.jurors.includes(auth.user.email)
    )
    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
  console.log('Juror posts for', auth.user.email, jurorPosts.value)
})
</script>

<style scoped>
.juror-view {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1rem;
}
</style>
