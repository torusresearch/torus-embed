<script lang="ts" setup>
import { Button } from "@toruslabs/vue-components/Button";

withDefaults(
  defineProps<{
    label?: string;
    classes?: string;
    pill?: boolean;
    block?: boolean;
    small?: boolean;
    disabled?: boolean;
    variant?: "tertiary" | "secondary" | "primary";
  }>(),
  {
    label: "",
    pill: true,
    block: true,
    small: false,
    disabled: false,
    variant: "tertiary",
  }
);

const emits = defineEmits(["onClick"]);
</script>

<template>
  <div :class="{ block }">
    <label v-if="label" class="btn-label">{{ label }}</label>
    <Button
      :variant="variant"
      :size="small ? 'xs' : 'md'"
      :class="['btn-secondary', classes]"
      :pill="pill"
      :block="block"
      :disabled="disabled"
      @click="emits('onClick')"
    >
      <slot> </slot>
    </Button>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "Button.css";
</style>
