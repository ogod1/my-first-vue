<template>
  <div class="author-review">
    <h1>My Flagged Posts</h1>

    <div v-if="!isLoggedIn">
      <p>Please log in to review your posts.</p>
    </div>

    <div v-else-if="!user || !user.email || !user.username">
      <p>User info not loaded. Please wait or try logging in again.</p>
    </div>

    <div v-else-if="flaggedPosts.length === 0">
      <p>You have no flagged or pending posts.</p>
    </div>

    <div v-else>
      <div v-for="post in flaggedPosts" :key="post.id" class="post-item">
        <p><strong>Status:</strong> {{ post.status }}</p>
        <p><strong>Original Content:</strong></p>
        <p class="post-content">{{ post.content }}</p>

        <div v-if="post.status === 'revision' || post.status === 'pending_edit'">
          <textarea v-model="editedContent[post.id]" rows="4" cols="50"></textarea>
          <button @click="submitEdit(post)">Submit Edit</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/pinia'
import { firestore } from '@/firebaseResources'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'

const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)
const flaggedPosts = ref([])
const editedContent = ref({})  // Track edited content keyed by post ID

onMounted(async () => {
  if (!user.value || !user.value.email || !user.value.username) return

  // Query posts by this user where status !== 'approved'
  const postsSnap = await getDocs(collection(firestore, 'posts'))
  flaggedPosts.value = postsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(post => post.author === user.value.username && post.status !== 'approved')

  // Initialize editedContent with current post contents
  flaggedPosts.value.forEach(post => {
    editedContent.value[post.id] = post.content
  })
})

async function submitEdit(post) {
  const newContent = editedContent.value[post.id]
  if (!newContent) return alert('Content cannot be empty.')

  const postRef = doc(firestore, 'posts', post.id)

  try {
    await updateDoc(postRef, {
      content: newContent,
      status: 'pending_edit',  // mark as pending re-review
      editHistory: [...(post.editHistory || []), { content: post.content, date: new Date().toISOString() }]
    })
    alert('Edit submitted! Your post will be reviewed again.')

    // Optionally update local data to remove or refresh this post in UI
    flaggedPosts.value = flaggedPosts.value.filter(p => p.id !== post.id)
  } catch (error) {
    console.error('Failed to submit edit:', error)
    alert('Failed to submit edit. Please try again.')
  }
}
</script>

<style scoped>
.author-review {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.post-item {
  border: 1px solid #ccc;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 6px;
  background: #f7f7f7;
}

.post-content {
  white-space: pre-wrap;
  background: #fff;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

textarea {
  width: 100%;
  margin-bottom: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
