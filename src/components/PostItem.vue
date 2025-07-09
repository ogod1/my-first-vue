<template>
  <div class="post-item">
    <div class="post-header">
      <span class="author">@{{ author }}</span>
      <span class="date">{{ date }}</span>
    </div>
    <div class="post-content">
      {{ content }}
    </div>
  </div>
</template>

<script setup>
// Props: input data from PostFeed.vue
defineProps({
  author: String,
  date: String,
  content: String
})
</script>

<style scoped>
.post-item {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: white;
}

.post-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

.author {
  font-weight: bold;
  color: #333;
}

.post-content {
  font-size: 1rem;
  line-height: 1.5;
  color: #555;
}
</style>
