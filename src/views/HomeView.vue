<template>
  <div class="home">
    <h1>Welcome to the Feed</h1>

    <div class="feed">
      <div class="left-column">
        <UserStats :user="user" :isLoggedIn="isLoggedIn" />
      </div>

      <div class="center-column">
        <PostInput v-if="isLoggedIn" @post="addNewPost" />
        <PostFeed :posts="posts" :isLoggedIn="isLoggedIn" />
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
  onSnapshot,
  getDocs
} from 'firebase/firestore'


// Use global login state
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)
const user = computed(() => auth.user)

// Feed poasts
const posts = ref([])
let unsubscribeFeed = null



onMounted(() => {
  setupFeedListener()
  migratePostsModerationFields() // Run migration on component mount
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
    content,
    reportCount: 0, // Ensure moderation field
    status: 'approved', // Initial status
    jurors: [] // Add jurors field for moderation workflow
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

async function setupFeedListener() {
  if (unsubscribeFeed) unsubscribeFeed();

  if (isLoggedIn.value && user.value?.email) {
    const userRef = doc(firestore, 'users', user.value.email);
    unsubscribeFeed = onSnapshot(userRef, (userSnap) => {
      if (!userSnap.exists()) {
        posts.value = [];
        return;
      }
      const userData = userSnap.data();
      const following = userData.following || [];
      const filteredFollowing = following.filter(email => email !== user.value.email);
      if (filteredFollowing.length === 0) {
        posts.value = [];
        return;
      }
      const q = query(
        collection(firestore, 'posts'),
        where('author', 'in', filteredFollowing),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      onSnapshot(q, (snap) => {
        posts.value = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(post => post.status !== 'underReview' && post.status !== 'revote' && post.hidden !== true); // Exclude posts under review
      });
    });
  } else {
    const q = query(collection(firestore, 'posts'), orderBy('timestamp', 'desc'), limit(10));
    unsubscribeFeed = onSnapshot(q, (snap) => {
      posts.value = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => post.status !== 'underReview' && post.status !== 'revote' && post.hidden !== true); // Exclude posts under review
    });
  }
}

/**
 * Migration: Ensure all posts have reportCount, status, and jurors fields
 */
async function migratePostsModerationFields() {
  const postsCol = collection(firestore, 'posts');
  const allPostsSnap = await getDocs(postsCol);
  let updatedCount = 0;
  for (const docSnap of allPostsSnap.docs) {
    const post = docSnap.data();
    const updates = {};
    if (typeof post.reportCount !== 'number') {
      updates.reportCount = 0;
    }
    if (!post.status) {
      updates.status = 'approved';
    }
    if (!Array.isArray(post.jurors)) {
      updates.jurors = [];
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(postsCol, docSnap.id), updates);
      updatedCount++;
    }
  }
  console.log(`Migration complete. Updated ${updatedCount} posts.`);
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

