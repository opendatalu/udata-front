<template>
  {{ organization.name }}
  <span
    v-if="organizationCertified"
    v-html="certifiedAltered"
    class="fr-icon-svg fr-icon--sm"
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
      organizationCertified,
      title,
    };
  },
  computed: {
    certifiedAltered() {
      return certified.replace(
        "<svg",
        '<svg role="img" aria-label="' +
          this.$t(
            "The identity of this public service is certified by {certifier}",
            { certifier: this.title }
          ) +
          '"'
      );
    },
  },
});
</script>
