<template>
  <div class="post-feed">
    <h2>Recent Posts</h2>

    <!-- If no posts exist -->
    <div v-if="!posts.length" class="placeholder">
      Nothing has been posted yet.
    </div>

    <!-- Loop through posts and show a PostItem -->
    <PostItem
      v-for="post in posts"
      :key="post.id"
      :postId="post.id"
      :author="post.author"
      :timestamp="post.timestamp"
      :content="post.content"
      :moderationHistory="post.moderationHistory"
      :isLoggedIn="isLoggedIn"
    />
  </div>
</template>

<script setup>
import PostItem from './PostItem.vue'
const props = defineProps({
  posts: {
    type: Array,
    required: true
  },
  isLoggedIn: {
    type: Boolean,
    required: true
  }
})
</script>

<style scoped>
.post-feed {
  margin: 2rem 0;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #ccc;
}

.placeholder {
  color: #888;
  font-style: italic;
}
</style>
