
A fork from [udata-front (commit b472b9c1482128471558ee92ceae1274d6aaaf36)](https://github.com/opendatateam/udata/commit/b472b9c1482128471558ee92ceae1274d6aaaf36).

# Modifications from source udata-front
- New folder `themelu` under udata_front/theme. *The theme is included in the fork instead of separate plugin because the dynamic import of the theme plug-in produces an attempt in its root init python file to access an unitialized current_app when trying to retrieve the project config, which does not happens under udata_front/theme initialization python files.*
- Modified `vite.config.ts` to rename gouvfr -> themelu.
- Changed language settings
  - Changed `I18N_ROOT`, `THEME_ROOT`, `gouvfr.po(t)` -> `themelu.po(t)` in tasks.py.
  - Changed `gouvfr` -> `themelu` in setup.cfg.
- Added `views/themelu.py` (orignally a of gouvfr.py) and changed `gouvfr` -> `themelu` in udata_front/frontend/__init__.py.
- Modify `theme/__init__.py` to inject `app.url_map.converters['gh_image'] = ImageConverter`
- Add `requirements/luxembourg.pip` in `setup.py`
- Use `feedgen.feed` `FeedGenerator` in views/post.py

## Theme modifications
The theme `themelu` is a copy, originally of `gouvfr`.
- Colors modified from blue to red in `less/variables.less`
- Added `luxembourg.less` linked to `style.less` scss entry point.
- Modified `raw.html` to include the govbar and the skip link.
- Modified `home.html` to modify the logo and the featured topics.
- Modified the images under `themelu/assets/img`
- Languages
    - Removed unused languages from theme/themelu/translations
- Added FR | EN options in header (this required update from v6+ because of new dom intermediary `fr-btns-group`)
- Complete refacto of `assets/js/components/vanilla/tabs.js` to allow using keyboard arrows
- Minor JS modifs:
  - Title in `assets/js/components/utils/search-bar.vue`
- Local use of package "@etalab/data.gouv.fr-components"
  - Removal of @etalab/data.gouv.fr-components in packages.json
  - Addition of alias from "@etalab/data.gouv.fr-components" towards source code under themelu/datagouv-components/index.ts.
  - Removal of import of @etalab/data.gouv.fr-components/dist/style.css as less files are now included in root project.
  - Removal of setupI18nWithExistingInstance that merges the submodule locales, and added the component locales resolution in VueI18nPlugin of root vite config.
  - Inclussion of datagoub-components .env variables in root vite config files