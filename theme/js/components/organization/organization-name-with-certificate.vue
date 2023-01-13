<template>
  {{ organization.name }}
  <span
    v-if="organizationCertified"
    class="fr-icon-svg fr-icon--sm"
    ref="svgContainer"
  >
  </span>
</template>

<script>
import { defineComponent } from "vue";
import certified from "bundle-text:svg/certified.svg";
import { title } from "../../config";
import useOrganizationCertified from "../../composables/useOrganizationCertified";

export default defineComponent({
  props: {
    organization: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const { organizationCertified } = useOrganizationCertified(
      props.organization
    );
    return {
      certified,
      organizationCertified,
      title,
    };
  },
  mounted() {
    const svg = this.$refs.svgContainer.querySelector("svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", this.$t(
        "The identity of this public service is certified by {certifier}",
        { certifier: this.title }
      ),);
  },
});
</script>
