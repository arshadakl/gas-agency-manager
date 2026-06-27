<script setup lang="ts">
const { initTheme } = useTheme()
const { init: initPwa } = usePwaInstall()
const { init: initLocale } = useLocale()
onMounted(() => {
  initTheme()
  initPwa()
  initLocale()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
