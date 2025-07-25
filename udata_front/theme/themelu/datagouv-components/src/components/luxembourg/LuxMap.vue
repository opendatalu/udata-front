<template>
  <div
    ref="map"
    :id="`map-${unique_id}`"
    class="lux-maps"
    :style="`height: ${height}; width: ${width};`"
  ></div>
</template>

<script>
export default {
  name: "LuxMap",

  data: function () {
    return {
      unique_id: Math.random().toString(36).substring(7),
      lux_map: null,
    };
  },

  props: {
    map_id: {
      type: String,
      default: "53a0b41d-e05d-42c0-8fd6-c15fc75f07b3",
    },
    width: {
      default: "initial",
      type: String,
    },
    height: {
      default: "initial",
      type: String,
    },
    bg_layer: {
      type: String,
      default: "orthogr_2013_global",
    },
    position: {
      type: Array,
      default: [76825, 75133],
    },
    zoom: {
      type: Number,
      default: 12,
    },
    search: {
      type: Boolean,
      default: false,
    },
    clickSearch: {
      type: Boolean,
      default: true,
    },
    callbackSearch: {
      type: Function,
    },
    callbackShow: {
      type: Function,
    },
    layers: {
      default: [],
      type: Array,
    },
    parcels: {
      default: [],
      type: Array,
    },
    maximizable: {
      default: true,
      type: Boolean,
    },
    params: {
      default: {},
      type: Object,
    },
  },

  created() {
    const map_base = "https://apiv4.geoportail.lu"; //import.meta.env.VITE_LUX_MAP_API_BASE_URL;
    // Can not add scripts directly in Vue template
    // When adding scripts after DOM is parsed, it is not posible to do document.write anymore.
    // Therefore, we need our own loader.
    // https://apiv4.geoportail.lu/apiv4loader.js
    Promise.all([
      this.loadCss(map_base + "/static-ngeo/build/apiv4.css"),
      this.loadScript(map_base + "/static-ngeo/build/ol.js"),
      this.loadScript(map_base + "/static-ngeo/build/proj4.js"),
      this.loadScript(map_base + "/static-ngeo/build/auto-complete.min.js"),
      this.loadScript(map_base + "/static-ngeo/build/apiv4.js"),
    ]).then(() => {
      this.onScriptLoaded();
    });
  },

  unmounted() {
    if (this.$refs.map) {
      ResizeObserver.unobserve(this.$refs.map);
    }
  },

  methods: {
    /**
     *
     * @param {*} event
     */
    handleClick(event) {
      const coord = this.lux_map.getCoordinateFromPixel([
        event.pixel[0],
        event.pixel[1],
      ]);
      const coords_transformed = ol.proj.transform(
        coord,
        "EPSG:3857",
        "EPSG:2169"
      );
      this._searchFromCoords(coords_transformed);
    },

    /**
     * Called when all api v4 of map are loaded.
     */
    onScriptLoaded() {
      if (!this.lux_map) {
        window.lux.setBaseUrl("https://apiv4.geoportail.lu/", "https");
        window.lux.setI18nUrl(
          "https://apiv4.geoportail.lu/static-ngeo/build/fr.json"
        );

        let params = {
          target: "map-" + this.unique_id,
          position: this.position,
          bgLayer: this.bg_layer,
          zoom: this.zoom,
          layers: this.layers,
          showLayerInfoPopup: true,
          ...this.params,
        };

        if (this.maximizable) {
          params.controls = window.ol.control
            .defaults()
            .extend([new window.ol.control.FullScreen()])
            .getArray();
        }

        if (this.search) {
          params.search = {
            onSelect: this.mapSearch,
            target: "map-" + this.unique_id,
            dataSets: [
              "Adresse",
              "Parcelle",
              "Coordinates",
              "Localité",
              "Commune",
              "lieu_dit",
            ],
          };
        }

        this.temporal_apiv4_fix();

        this.lux_map = new window.lux.Map(params);

        this.$emit("map-ready", this.lux_map);

        // On change source, refit features
        const fitFeature = (feature) => {
          this.lux_map.getView().fit(feature.getGeometry(), { maxZoom: 17 });
        };
        var source = this.lux_map.getShowLayer().getSource();
        const self = this;
        source.on("change", function () {
          source.forEachFeature(fitFeature.bind(self));
        });

        if (this.search && this.clickSearch) {
          this.lux_map.on("singleclick", this.handleClick);
        }
        if (this.parcels.length > 0) {
          this.showParcels(this.parcels);
        }

        // On change the container dimensions, resize the map
        new ResizeObserver(() => {
          this.lux_map.updateSize();
        }).observe(this.$refs.map);
      }
    },

    /**
     * Fixes a problem in version 4 of map api.
     */
    temporal_apiv4_fix() {
      window.proj4.defs(
        "EPSG:2169",
        "+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs"
      );
      window.ol.proj.proj4.register(proj4);
    },

    /**
     *
     * @param {Object} event
     * @param {String} search_text
     * @param {*} dom_element
     * @param {*} clear_button
     */
    mapSearch(event, search_text, dom_element, clear_button) {
      // Show polygon in map from extent (surface).
      const extent = dom_element
        .getAttribute("data-extent")
        .split(",")
        .map(parseFloat);

      const extent_transformed = ol.proj.transformExtent(
        extent,
        "EPSG:4326",
        "EPSG:3857"
      );

      const polygon = ol.geom.Polygon.fromExtent(extent_transformed);

      this.lux_map.getView().fit(polygon, {
        size: this.lux_map.getSize(),
        maxZoom: 17,
      });

      if (this.callbackSearch) {
        // Get parcel ID from coords
        const coords = dom_element
          .getAttribute("data-coord")
          .split(",")
          .map(parseFloat);

        const coords_transformed = [];
        for (let i = 0; i < coords.length; i = i + 2) {
          coords_transformed.push(
            ol.proj.transform(
              [coords[i], coords[i + 1]],
              "EPSG:4326",
              "EPSG:2169"
            )
          );
        }

        this._searchFromCoords(coords_transformed);
      }
    },

    _searchFromCoords(coords) {
      let queryExtent;
      if (coords.length === 2) {
        queryExtent = new ol.geom.Point(coords).getExtent();
      } else {
        const geometry = new ol.geom.Polygon([coords]);
        queryExtent = geometry.getInteriorPoint().getExtent();
      }
      queryExtent[2] = queryExtent[2] + 0.01;
      queryExtent[3] = queryExtent[3] + 0.01;

      var req =
        "layers=359&box1=" +
        queryExtent.join(",") +
        "&box2=" +
        queryExtent.join(",") +
        "&tooltip=0&lang=";

      var self = this;
      fetch("https://apiv4.geoportail.lu/getfeatureinfo?" + req)
        .then((res) => res.json())
        .then(function (json) {
          // var label = json[0].features[0].attributes.label;
          try {
            var parcel_id = json[0].features[0].attributes.id;
          } catch (e) {
            return;
          }

          // Show directly whatever is searched, regardless of further results from callback -> parcels props
          self.showParcels([parcel_id], false);

          self.callbackSearch(parcel_id, "", json[0].features[0]);
        });
    },

    /**
     *
     * @param {Array} parcelIds | example: ['061A00100008360']
     * @param {Bool} reset | true
     */
    showParcels(parcelIds, reset = true) {
      if (!this.lux_map) {
        const cb = () => {
          this.showParcels(parcelIds, reset);
        };
        window.setTimeout(cb.bind(this), 500);
        return;
      }

      if (reset) {
        this.reset();
      }

      this.lux_map.showFeatures(
        "parcels",
        parcelIds,
        false,
        undefined,
        false,
        17, // 17 = max zoom
        this.callbackShow //function(id, found, json)
      );
    },

    /**
     *
     */
    reset(reset_zoom) {
      // Reset center before allowing showFeatures to recenter (as fallback, it helps to see that there is nothing)
      if (reset_zoom) {
        this.lux_map.setCenter(this.position, this.zoom);
      } else {
        this.lux_map.setCenter(this.position);
      }

      // Clear previous drawings
      this.lux_map.removeDrawings();
    },

    /**
     * Loads a JS script.
     * @param {String} url
     */
    loadScript(url) {
      return new Promise((resolve, reject) => {
        if (window.lux) {
          resolve(window.lux);
        } else {
          const script = document.createElement("script");
          script.async = true;
          script.addEventListener("load", () => {
            resolve(window.lux);
          });
          script.addEventListener("error", () => {
            reject(new Error(`Error loading ${url}`));
          });
          script.src = url;
          document.head.appendChild(script);
        }
      });
    },

    /**
     * Loads a CSS stylesheet.
     * @param {String} url
     */
    loadCss(url) {
      return new Promise((resolve) => {
        if (!window.lux) {
          var head = document.getElementsByTagName("head")[0];
          var link = document.createElement("link");
          // link.id = cssId;
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = url;
          link.media = "all";
          head.appendChild(link);
        }
        resolve();
      });
    },
  },

  watch: {
    parcels: {
      handler(parcels) {
        this.showParcels(parcels);
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
.lux-maps {
  width: 100%;
  height: 100%;
}
</style>
