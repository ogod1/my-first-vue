<template>
  <div class="juror-review">
    <h1>Jury Duty</h1>

    <div v-if="!isLoggedIn">
      <p>Not signed in yet.</p>
    </div>

    <div v-else-if="!isJuror">
      <p>You are not a juror. Adjust your settings to enable juror access.</p>
    </div>

    <div v-else-if="assignedPosts.length === 0">
      <p>You currently have no posts to review.</p>
    </div>

    <div v-else>
      <div
        class="post-to-review"
        v-for="post in assignedPosts"
        :key="post.id"
      >
        <p><strong>Content:</strong> {{ post.content }}</p>

        <div class="vote-buttons">
          <button @click="vote(post.id, 'appropriate')">✅ Appropriate</button>
          <button @click="vote(post.id, 'revision')">✏️ Needs Revision</button>
          <button @click="vote(post.id, 'inappropriate')">🚫 Inappropriate</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/pinia'
import { firestore } from '@/firebaseResources'
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'

import { updatePostVote } from '@/utils/votingLogic'

const auth = useAuthStore()
const isJuror = ref(false)
const assignedPosts = ref([])
const assignedPostIds = ref([])
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)

onMounted(async () => {
  const currentEmail = auth.user?.email
  if (!currentEmail) return

  const userDoc = await getDoc(doc(firestore, 'users', currentEmail))
  if (!userDoc.exists()) return
  const userData = userDoc.data()

  isJuror.value = userData.isJuror === true
  if (!isJuror.value) return

  const allPostsSnap = await getDocs(collection(firestore, 'posts'))
  assignedPosts.value = allPostsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(p => (p.jurors || []).includes(currentEmail) && p.status === 'underReview')
})


async function vote(postId, decision) {
  const currentEmail = user.value?.email
  if (!currentEmail) return

  await updatePostVote(postId, currentEmail, decision)

  // Removing post from the UI after vote
  assignedPosts.value = assignedPosts.value.filter(p => p.id !== postId)
}

</script>

<style scoped>
.juror-review {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}

.post-to-review {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  background: #f9f9f9;
  color: #333;
}

.vote-buttons {
  margin-top: 1rem;
}

.vote-buttons button {
  margin-right: 0.5rem;
}
</style>
