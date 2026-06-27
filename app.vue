<script setup lang="ts">
const { initTheme } = useTheme()
const { init: initPwa } = usePwaInstall()
onMounted(() => {
  initTheme()
  initPwa()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
