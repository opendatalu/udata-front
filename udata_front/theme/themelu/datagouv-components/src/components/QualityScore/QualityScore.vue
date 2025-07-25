<template>
    <meter class="quality-score" :class="props.class" min="0" low="0" :high="high" :max="quality_max_score" :optimum="quality_max_score" :value="roundedScore">
        {{percentageScore}}%</meter>
</template>

<script setup lang="ts">
import { defineProps, withDefaults, computed } from "vue";
type Props = {
    score: number,
    class?: string
};
const props = withDefaults(defineProps<Props>(), {
  class: "",
});
const quality_max_score = 1;
const high = Math.round(quality_max_score*2/3*100)/100;

const percentageScore = computed(() => {
    // [#152]
    return Math.round((props.score / quality_max_score) * 100);
});

const roundedScore = computed(() => {
    return Math.round(props.score * 100) / 100;
});
</script>
