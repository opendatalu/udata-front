<template>
  <div class="thread-create fr-mt-2w">
    <ThreadsCreateButton
      v-if="showCreateButton && !showForm"
      :onClick="displayForm"
    />
    <div v-if="showForm" class="bg-contrast-grey">
      <div class="fr-grid-row fr-grid-row--middle fr-py-2w fr-px-3w">
        <div class="fr-col fr-h6 fr-mb-0">{{ $t("New discussion") }}</div>
        <div>
          <button class="fr-link--close fr-link text-grey-500 fr-mr-0" @click="hideForm">
            {{$t('Close')}}
          </button>
        </div>
      </div>
      <div class="thread-comment fr-pb-3w fr-px-3w">
        <form class="form fr-p-0" @submit.prevent="submit">
          <i18n-t
            keypath="Fields preceded by a star ({markup}) are required."
            tag="p"
            class="fr-mt-0 fr-mb-1w fr-text--xs"
            scope="global"
          >
            <template #markup>
              <span class="required-field-star">*</span>
            </template>
          </i18n-t>
          <div class="fr-input-group">
            <label for="thread-title" class="fr-label required">
              {{ $t("Title") }}
            </label>
            <input
              class="fr-input"
              type="text"
              id="thread-title"
              v-model="title"
              :placeholder="$t('Title')"
              required="required"
          />
          </div>
          <div class="fr-input-group">
            <label for="thread-comment" class="fr-label required">
              {{ $t("Message") }}
            </label>
            <textarea
              id="thread-comment"
              v-model="comment"
              :placeholder="$t('Comment')"
              class="fr-input"
              required="required"
            ></textarea>
          </div>
          <footer class="fr-grid-row justify-between fr-grid-row--middle">
            <span class="text-mention-grey fr-text--sm fr-mb-0">
              {{ $t("Reply as") }}
              <Author :author="user" />
            </span>
            <input
              type="submit"
              :value="$t('Submit')"
              class="fr-btn fr-btn--secondary fr-btn--secondary-grey-500"
            />
          </footer>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import config from "../../config";
import Author from "./author";
import ThreadsCreateButton from "./threads-create-button";

export default {
  components: {
    ThreadsCreateButton,
    Author
  },
  data() {
    return {
      loading: false,
      showForm: false,
      title: "",
      comment: "",
      user: config.user,
    };
  },
  props: {
    showCreateButton: {
      type: Boolean,
      default: false
    },
    subjectId: String,
    subjectClass: String,
    onSubmit: Function,
  },
  methods: {
    displayForm() {
      this.$auth();
      this.showForm = true;
    },
    hideForm() {
      this.showForm = false;
    },
    submit() {
      const vm = this;
      this.loading = true;

      const values = {
        title: this.title,
        comment: this.comment,
        subject: {
          id: this.subjectId,
          class: this.subjectClass,
        },
      };

      if (this.onSubmit)
        this.onSubmit(values).finally(() => {
          vm.loading = false;
          vm.showForm = false;
          vm.title = vm.comment = "";
        });
    },
  },
};
</script>
